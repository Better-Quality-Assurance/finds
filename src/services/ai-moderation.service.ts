/**
 * AI Moderation Service
 *
 * Comprehensive AI-powered moderation for the Finds auction platform.
 * Uses OpenRouter to access multiple AI models for:
 * - Listing analysis and approval recommendations
 * - Comment moderation and spam detection
 * - Bid pattern analysis and manipulation detection
 * - User-facing car reviews with market value estimates
 */

import { prisma } from '@/lib/db'
import {
  chatCompletionJSON,
  analyzeImages,
  checkRateLimit,
  type OpenRouterModel,
} from '@/lib/openrouter'
import type {
  AIListingAnalysis,
  AICarReview,
  AICommentModeration,
  AIBidPatternAnalysis,
  ModerationDecision,
} from '@prisma/client'
import type {
  ListingAnalysisResult,
  CarReviewResult,
  CommentModerationResult,
  BidPatternResult,
  ModerationStats,
  ModerationActivity,
} from './contracts/ai-moderation.interface'
import { getAIModerationConfig } from './system-config.service'

// ============================================================================
// LISTING ANALYSIS
// ============================================================================

const LISTING_ANALYSIS_PROMPT = `You are an expert classic car auction moderator. Analyze this listing submission and determine if it should be approved for the Finds.ro auction platform.

LISTING DETAILS:
Title: {title}
Category: {category}
Make: {make}
Model: {model}
Year: {year}
Mileage: {mileage} {mileageUnit}
VIN: {vin}
Location: {locationCity}, {locationCountry}
Starting Price: {startingPrice} {currency}
Condition Rating: {conditionRating}/10
Is Running: {isRunning}

DESCRIPTION:
{description}

KNOWN ISSUES:
{knownIssues}

CONDITION NOTES:
{conditionNotes}

NUMBER OF PHOTOS: {photoCount}
PHOTO CATEGORIES PRESENT: {photoCategories}

Evaluate this listing based on:
1. Title quality - Is it descriptive, accurate, not spammy?
2. Description completeness - Does it provide necessary details about the vehicle?
3. Transparency - Are known issues disclosed?
4. Pricing reasonableness - Is the starting price within market norms?
5. Photo requirements - Are required categories present (exterior 4 sides, interior, engine, etc.)?
6. Red flags - Any signs of fraud, scam, or policy violations?

Respond in JSON format:
{
  "decision": "APPROVE" | "REJECT" | "FLAG_FOR_REVIEW" | "NEEDS_CHANGES",
  "confidenceScore": 0.0-1.0,
  "approvalReasoning": "Brief explanation of decision",
  "issues": [
    {"type": "content|images|pricing|documentation|authenticity", "severity": "low|medium|high|critical", "description": "..."}
  ],
  "suggestions": ["Improvement suggestions..."],
  "titleAnalysis": {
    "isSpam": false,
    "isDescriptive": true,
    "hasKeywords": true,
    "suggestedTitle": "Optional better title",
    "issues": []
  },
  "descriptionAnalysis": {
    "completeness": 85,
    "hasRedFlags": false,
    "redFlags": [],
    "missingInfo": ["Service history", "..."],
    "qualityScore": 80
  },
  "imageAnalysis": {
    "totalImages": 45,
    "hasRequiredCategories": true,
    "missingCategories": [],
    "qualityIssues": [],
    "authenticityScore": 95,
    "potentialManipulation": false
  }
}`

export async function analyzeListing(listingId: string): Promise<AIListingAnalysis> {
  const startTime = Date.now()
  const config = await getAIModerationConfig()

  // Check rate limit
  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
  }

  // Get listing with media
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      media: {
        where: { type: 'PHOTO' },
        orderBy: { position: 'asc' },
      },
    },
  })

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`)
  }

  // Create or update analysis record as PROCESSING
  let analysis = await prisma.aIListingAnalysis.upsert({
    where: { listingId },
    create: {
      listingId,
      status: 'PROCESSING',
    },
    update: {
      status: 'PROCESSING',
      errorMessage: null,
    },
  })

  try {
    // Prepare prompt with listing data
    const photoCategories = Array.from(new Set(listing.media.map((m) => m.category).filter((c): c is string => Boolean(c))))

    const prompt = LISTING_ANALYSIS_PROMPT
      .replace('{title}', listing.title)
      .replace('{category}', listing.category)
      .replace('{make}', listing.make)
      .replace('{model}', listing.model)
      .replace('{year}', String(listing.year))
      .replace('{mileage}', listing.mileage ? String(listing.mileage) : 'Not specified')
      .replace('{mileageUnit}', listing.mileageUnit)
      .replace('{vin}', listing.vin || 'Not provided')
      .replace('{locationCity}', listing.locationCity)
      .replace('{locationCountry}', listing.locationCountry)
      .replace('{startingPrice}', listing.startingPrice.toString())
      .replace('{currency}', listing.currency)
      .replace('{conditionRating}', listing.conditionRating ? String(listing.conditionRating) : 'Not rated')
      .replace('{isRunning}', listing.isRunning ? 'Yes' : 'No')
      .replace('{description}', listing.description)
      .replace('{knownIssues}', listing.knownIssues || 'None disclosed')
      .replace('{conditionNotes}', listing.conditionNotes || 'None')
      .replace('{photoCount}', String(listing.media.length))
      .replace('{photoCategories}', photoCategories.join(', ') || 'Unknown')

    // Call AI for analysis
    const result = await chatCompletionJSON<ListingAnalysisResult>(
      [{ role: 'user', content: prompt }],
      { model: config.defaultModel as OpenRouterModel, temperature: 0.2 }
    )

    // Update analysis with results
    analysis = await prisma.aIListingAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'COMPLETED',
        decision: result.decision as ModerationDecision,
        confidenceScore: result.confidenceScore,
        approvalReasoning: result.approvalReasoning,
        titleAnalysis: result.titleAnalysis as object,
        descriptionAnalysis: result.descriptionAnalysis as object,
        imageAnalysis: result.imageAnalysis as object,
        issues: result.issues as object[],
        suggestions: result.suggestions,
        modelUsed: config.defaultModel,
        processingTimeMs: Date.now() - startTime,
      },
    })

    return analysis
  } catch (error) {
    // Update analysis with error
    analysis = await prisma.aIListingAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      },
    })

    throw error
  }
}

export async function getListingAnalysis(listingId: string): Promise<AIListingAnalysis | null> {
  return prisma.aIListingAnalysis.findUnique({
    where: { listingId },
  })
}

export async function getPendingListingAnalyses(limit = 20): Promise<AIListingAnalysis[]> {
  return prisma.aIListingAnalysis.findMany({
    where: { status: 'PENDING' },
    take: limit,
    orderBy: { createdAt: 'asc' },
  })
}

// ============================================================================
// CAR REVIEW (USER-FACING)
// ============================================================================

const CAR_REVIEW_PROMPT = `You are an expert classic car appraiser and automotive journalist. Create a comprehensive buyer's guide review for this vehicle listing on the Finds.ro auction platform.

VEHICLE INFORMATION:
{year} {make} {model}
Category: {category}
Mileage: {mileage} {mileageUnit}
VIN: {vin}
Location: {locationCity}, {locationCountry}
Starting Price: {startingPrice} {currency}
Condition Rating (Seller): {conditionRating}/10
Running Condition: {isRunning}

SELLER'S DESCRIPTION:
{description}

KNOWN ISSUES (Seller Disclosed):
{knownIssues}

CONDITION NOTES:
{conditionNotes}

Based on the photos provided and the listing information, create a detailed review that helps potential buyers make an informed decision.

Respond in JSON format:
{
  "overallScore": 75,
  "conditionSummary": "A well-preserved example showing honest wear consistent with age and mileage...",
  "highlights": ["Original matching-numbers drivetrain", "Documented service history", "..."],
  "concerns": ["Surface rust on undercarriage", "Interior shows wear", "..."],
  "estimatedValue": {
    "low": 25000,
    "mid": 32000,
    "high": 40000,
    "currency": "EUR",
    "reasoning": "Based on current market trends for similar models...",
    "comparisons": [
      {"source": "Bring a Trailer", "make": "...", "model": "...", "year": 1970, "price": 35000, "condition": "Good", "notes": "Similar spec"}
    ]
  },
  "exteriorAnalysis": {
    "paintCondition": "Original paint with patina, some touchups visible",
    "bodyCondition": "Straight panels, minor door dings",
    "chromeCondition": "Good, some pitting on bumpers",
    "glassCondition": "All original, no cracks",
    "issues": ["Small dent driver door", "..."],
    "score": 70
  },
  "interiorAnalysis": {
    "seatCondition": "Driver bolster worn, passenger good",
    "dashboardCondition": "No cracks, original gauges",
    "carpetCondition": "Replaced, good quality",
    "headlinerCondition": "Original, minor sag",
    "issues": ["..."],
    "score": 75
  },
  "mechanicalNotes": {
    "engineVisible": true,
    "engineObservations": ["Clean engine bay", "New hoses visible", "..."],
    "compartmentCleanliness": "Well detailed",
    "visibleIssues": ["Oil seep at valve cover", "..."]
  },
  "authenticityCheck": {
    "matchingNumbers": true,
    "periodCorrectParts": true,
    "modifications": ["Aftermarket radio", "..."],
    "restorationEvidence": false,
    "notes": "Appears to be an unrestored survivor..."
  },
  "investmentOutlook": "moderate",
  "appreciationPotential": "This model has shown steady appreciation of 5-8% annually..."
}`

const CAR_REVIEW_IMAGE_PROMPT = `Analyze these photos of a classic car for an auction listing. Focus on:
1. Overall condition assessment
2. Paint and body condition
3. Interior condition
4. Engine bay observations
5. Wheel and tire condition
6. Any visible issues or concerns
7. Signs of restoration, repair, or modification
8. Authenticity indicators

Provide detailed observations that would help a buyer understand the true condition of this vehicle.`

export async function generateCarReview(listingId: string): Promise<AICarReview> {
  const startTime = Date.now()
  const config = await getAIModerationConfig()

  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      media: {
        where: { type: 'PHOTO' },
        orderBy: { position: 'asc' },
        take: 20, // Limit images for API
      },
    },
  })

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`)
  }

  let review = await prisma.aICarReview.upsert({
    where: { listingId },
    create: {
      listingId,
      status: 'PROCESSING',
    },
    update: {
      status: 'PROCESSING',
      errorMessage: null,
    },
  })

  try {
    // Analyze images first if available
    let imageObservations = ''
    if (listing.media.length > 0) {
      const imageUrls = listing.media.map((m) => m.publicUrl)
      imageObservations = await analyzeImages(
        imageUrls,
        CAR_REVIEW_IMAGE_PROMPT,
        { model: config.visionModel as OpenRouterModel }
      )
    }

    // Generate full review
    const prompt = CAR_REVIEW_PROMPT
      .replace('{year}', String(listing.year))
      .replace('{make}', listing.make)
      .replace('{model}', listing.model)
      .replace('{category}', listing.category)
      .replace('{mileage}', listing.mileage ? String(listing.mileage) : 'Not specified')
      .replace('{mileageUnit}', listing.mileageUnit)
      .replace('{vin}', listing.vin || 'Not provided')
      .replace('{locationCity}', listing.locationCity)
      .replace('{locationCountry}', listing.locationCountry)
      .replace('{startingPrice}', listing.startingPrice.toString())
      .replace('{currency}', listing.currency)
      .replace('{conditionRating}', listing.conditionRating ? String(listing.conditionRating) : 'Not rated')
      .replace('{isRunning}', listing.isRunning ? 'Yes' : 'No')
      .replace('{description}', listing.description)
      .replace('{knownIssues}', listing.knownIssues || 'None disclosed')
      .replace('{conditionNotes}', listing.conditionNotes || 'None')

    const fullPrompt = imageObservations
      ? `${prompt}\n\nIMAGE ANALYSIS:\n${imageObservations}`
      : prompt

    const result = await chatCompletionJSON<CarReviewResult>(
      [{ role: 'user', content: fullPrompt }],
      { model: config.defaultModel as OpenRouterModel, temperature: 0.3 }
    )

    review = await prisma.aICarReview.update({
      where: { id: review.id },
      data: {
        status: 'COMPLETED',
        overallScore: result.overallScore,
        conditionSummary: result.conditionSummary,
        highlights: result.highlights,
        concerns: result.concerns,
        estimatedValueLow: result.estimatedValue.low,
        estimatedValueMid: result.estimatedValue.mid,
        estimatedValueHigh: result.estimatedValue.high,
        valuationReasoning: result.estimatedValue.reasoning,
        marketComparisons: result.estimatedValue.comparisons as object[],
        exteriorAnalysis: result.exteriorAnalysis as object,
        interiorAnalysis: result.interiorAnalysis as object,
        mechanicalNotes: result.mechanicalNotes as object,
        authenticityCheck: result.authenticityCheck as object,
        investmentOutlook: result.investmentOutlook,
        appreciationPotential: result.appreciationPotential,
        modelUsed: config.defaultModel,
        processingTimeMs: Date.now() - startTime,
      },
    })

    return review
  } catch (error) {
    review = await prisma.aICarReview.update({
      where: { id: review.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      },
    })

    throw error
  }
}

export async function getCarReview(listingId: string): Promise<AICarReview | null> {
  return prisma.aICarReview.findUnique({
    where: { listingId },
  })
}

export async function getPublishedCarReview(listingId: string): Promise<AICarReview | null> {
  return prisma.aICarReview.findFirst({
    where: {
      listingId,
      isPublished: true,
      status: 'COMPLETED',
    },
  })
}

export async function publishCarReview(listingId: string): Promise<AICarReview> {
  return prisma.aICarReview.update({
    where: { listingId },
    data: {
      isPublished: true,
      publishedAt: new Date(),
    },
  })
}

export async function unpublishCarReview(listingId: string): Promise<AICarReview> {
  return prisma.aICarReview.update({
    where: { listingId },
    data: {
      isPublished: false,
    },
  })
}

// ============================================================================
// COMMENT MODERATION
// ============================================================================

const COMMENT_MODERATION_PROMPT = `You are a content moderator for a classic car auction platform. Analyze this comment and determine if it should be approved.

COMMENT CONTEXT:
Listing: {listingTitle} ({year} {make} {model})
Author Account Age: {accountAge}
Author Previous Comments: {previousComments}
Is Reply To: {isReply}

COMMENT TEXT:
{commentText}

Evaluate for:
1. Spam - promotional content, links, repetitive text
2. Harassment/Toxicity - personal attacks, threats, hate speech
3. Profanity - inappropriate language
4. Scam indicators - contact requests outside platform, payment requests
5. Personal information - phone numbers, emails, addresses
6. Off-topic - unrelated to the vehicle or auction
7. Quality - meaningful contribution to discussion

Respond in JSON format:
{
  "decision": "APPROVE" | "REJECT" | "FLAG_FOR_REVIEW",
  "confidenceScore": 0.0-1.0,
  "isSpam": false,
  "spamScore": 0.0-1.0,
  "isInappropriate": false,
  "toxicityScore": 0.0-1.0,
  "isOffTopic": false,
  "flaggedCategories": ["spam", "harassment", "hate_speech", "profanity", "scam", "personal_info", "off_topic", "low_quality"],
  "reasoning": "Explanation of moderation decision",
  "autoAction": "approve" | "hide" | "delete" | null
}`

export async function moderateComment(commentId: string): Promise<AICommentModeration> {
  const startTime = Date.now()
  const config = await getAIModerationConfig()

  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      listing: {
        select: { title: true, year: true, make: true, model: true },
      },
      author: {
        select: {
          id: true,
          createdAt: true,
          _count: { select: { comments: true } },
        },
      },
    },
  })

  if (!comment) {
    throw new Error(`Comment not found: ${commentId}`)
  }

  let moderation = await prisma.aICommentModeration.upsert({
    where: { commentId },
    create: {
      commentId,
      status: 'PENDING',
    },
    update: {
      status: 'PENDING',
    },
  })

  try {
    const accountAgeDays = Math.floor(
      (Date.now() - comment.author.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )

    const prompt = COMMENT_MODERATION_PROMPT
      .replace('{listingTitle}', comment.listing.title)
      .replace('{year}', String(comment.listing.year))
      .replace('{make}', comment.listing.make)
      .replace('{model}', comment.listing.model)
      .replace('{accountAge}', `${accountAgeDays} days`)
      .replace('{previousComments}', String(comment.author._count.comments))
      .replace('{isReply}', comment.parentId ? 'Yes' : 'No')
      .replace('{commentText}', comment.content)

    const result = await chatCompletionJSON<CommentModerationResult>(
      [{ role: 'user', content: prompt }],
      { model: config.defaultModel as OpenRouterModel, temperature: 0.1 }
    )

    // Determine auto-action based on thresholds
    let autoActioned = false
    let actionTaken: string | null = null

    if (result.confidenceScore >= config.commentAutoApproveThreshold && result.decision === 'APPROVE') {
      autoActioned = true
      actionTaken = 'approved'
    } else if (result.spamScore >= config.commentAutoRejectThreshold || result.toxicityScore >= 0.9) {
      autoActioned = true
      actionTaken = 'hidden'
      // Hide the comment
      await prisma.comment.update({
        where: { id: commentId },
        data: { isHidden: true },
      })
    }

    moderation = await prisma.aICommentModeration.update({
      where: { id: moderation.id },
      data: {
        status: autoActioned
          ? (actionTaken === 'approved' ? 'APPROVED' : 'REJECTED')
          : 'FLAGGED',
        decision: result.decision as ModerationDecision,
        confidenceScore: result.confidenceScore,
        isSpam: result.isSpam,
        spamScore: result.spamScore,
        isInappropriate: result.isInappropriate,
        toxicityScore: result.toxicityScore,
        isOffTopic: result.isOffTopic,
        flaggedCategories: result.flaggedCategories,
        reasoning: result.reasoning,
        autoActioned,
        actionTaken,
        actionedAt: autoActioned ? new Date() : null,
        modelUsed: config.defaultModel,
        processingTimeMs: Date.now() - startTime,
      },
    })

    return moderation
  } catch (error) {
    moderation = await prisma.aICommentModeration.update({
      where: { id: moderation.id },
      data: {
        status: 'FLAGGED',
        modelUsed: config.defaultModel,
        processingTimeMs: Date.now() - startTime,
      },
    })

    throw error
  }
}

export async function getCommentModeration(commentId: string): Promise<AICommentModeration | null> {
  return prisma.aICommentModeration.findUnique({
    where: { commentId },
  })
}

export async function getPendingCommentModerations(limit = 50): Promise<AICommentModeration[]> {
  return prisma.aICommentModeration.findMany({
    where: { status: 'FLAGGED' },
    take: limit,
    orderBy: { createdAt: 'asc' },
    include: {
      comment: {
        include: {
          author: { select: { id: true, name: true, email: true } },
          listing: { select: { id: true, title: true } },
        },
      },
    },
  })
}

export async function overrideCommentModeration(
  commentId: string,
  decision: ModerationDecision,
  _reviewerId: string
): Promise<AICommentModeration> {
  const moderation = await prisma.aICommentModeration.update({
    where: { commentId },
    data: {
      status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      decision,
      actionTaken: decision === 'APPROVE' ? 'approved' : 'hidden',
      actionedAt: new Date(),
    },
  })

  // Apply action to comment
  if (decision === 'REJECT') {
    await prisma.comment.update({
      where: { id: commentId },
      data: { isHidden: true },
    })
  } else if (decision === 'APPROVE') {
    await prisma.comment.update({
      where: { id: commentId },
      data: { isHidden: false },
    })
  }

  return moderation
}

// ============================================================================
// BID PATTERN ANALYSIS
// ============================================================================

const BID_PATTERN_PROMPT = `You are a fraud detection expert for an online auction platform. Analyze this bidding data for potential manipulation patterns.

AUCTION CONTEXT:
Auction ID: {auctionId}
Starting Price: {startingPrice} {currency}
Current Bid: {currentBid} {currency}
Auction Duration: {durationHours} hours
Time Remaining: {timeRemaining}
Total Bids: {totalBids}

BIDDING DATA (Recent {windowMinutes} minutes):
{biddingData}

IP/USER CORRELATIONS:
{ipData}

Analyze for:
1. Shill bidding - seller or associates artificially inflating price
2. Bot activity - automated bidding patterns, inhuman timing
3. Coordinated bidding - multiple accounts working together
4. Rapid-fire bidding - suspicious bid velocity
5. Last-second manipulation - strategic last-moment bids
6. Price manipulation - unusual increment patterns

Respond in JSON format:
{
  "isSuspicious": false,
  "suspicionScore": 0.0-1.0,
  "patternType": "shill_bidding" | "bot_activity" | "coordinated_bidding" | "rapid_fire" | "last_second_sniping" | "price_manipulation" | null,
  "patterns": [
    {
      "type": "...",
      "confidence": 0.85,
      "evidence": ["Bid timing consistent to milliseconds", "..."],
      "involvedBidIds": ["bid1", "bid2"]
    }
  ],
  "anomalies": [
    {"type": "timing", "description": "3 bids within 2 seconds from different accounts", "severity": "high", "timestamp": "..."}
  ],
  "bidMetrics": {
    "bidsAnalyzed": 25,
    "avgTimeBetweenBids": 45.5,
    "bidVelocityScore": 0.3,
    "priceJumpPatterns": 2,
    "lastMinuteBids": 5
  },
  "userPatterns": {
    "userId": "...",
    "totalBidsInPeriod": 8,
    "auctionsParticipated": 3,
    "winRate": 0.33,
    "avgBidIncrement": 150,
    "suspiciousIndicators": ["New account", "Only bids on same seller's auctions"]
  },
  "ipPatterns": {
    "uniqueIPs": 3,
    "sharedIPUsers": ["user1", "user2"],
    "geolocationAnomalies": ["Same IP, different claimed locations"]
  },
  "recommendedAction": "none" | "monitor" | "warn" | "block",
  "reasoning": "Detailed explanation..."
}`

export async function analyzeAuctionBids(
  auctionId: string,
  windowMinutes = 60
): Promise<AIBidPatternAnalysis> {
  const startTime = Date.now()
  const config = await getAIModerationConfig()
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      bids: {
        where: { createdAt: { gte: windowStart } },
        orderBy: { createdAt: 'asc' },
        include: {
          bidder: {
            select: { id: true, createdAt: true, email: true },
          },
        },
      },
      listing: {
        select: { sellerId: true },
      },
    },
  })

  if (!auction) {
    throw new Error(`Auction not found: ${auctionId}`)
  }

  try {
    // Build bidding data summary
    const biddingData = auction.bids.map((bid, index) => {
      const prevBid = index > 0 ? auction.bids[index - 1] : null
      const timeDiff = prevBid
        ? (bid.createdAt.getTime() - prevBid.createdAt.getTime()) / 1000
        : 0

      return {
        bidId: bid.id,
        bidderId: bid.bidderId,
        amount: bid.amount.toString(),
        timestamp: bid.createdAt.toISOString(),
        timeSincePrevBid: timeDiff,
        ipAddress: bid.ipAddress ? bid.ipAddress.substring(0, 10) + '...' : 'unknown',
        accountAgeDays: Math.floor(
          (Date.now() - bid.bidder.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    })

    // Analyze IP patterns
    const ipGroups: Record<string, string[]> = {}
    auction.bids.forEach((bid) => {
      if (bid.ipAddress) {
        if (!ipGroups[bid.ipAddress]) {
          ipGroups[bid.ipAddress] = []
        }
        if (!ipGroups[bid.ipAddress].includes(bid.bidderId)) {
          ipGroups[bid.ipAddress].push(bid.bidderId)
        }
      }
    })

    const sharedIPs = Object.entries(ipGroups)
      .filter(([, users]) => users.length > 1)
      .map(([ip, users]) => ({ ip: ip.substring(0, 10) + '...', users }))

    const timeRemaining = auction.currentEndTime > new Date()
      ? Math.floor((auction.currentEndTime.getTime() - Date.now()) / (1000 * 60)) + ' minutes'
      : 'Ended'

    const durationHours = Math.floor(
      (auction.currentEndTime.getTime() - auction.startTime.getTime()) / (1000 * 60 * 60)
    )

    const prompt = BID_PATTERN_PROMPT
      .replace('{auctionId}', auctionId)
      .replace('{startingPrice}', auction.startingPrice.toString())
      .replace('{currency}', auction.currency)
      .replace('{currentBid}', auction.currentBid?.toString() || 'No bids')
      .replace('{durationHours}', String(durationHours))
      .replace('{timeRemaining}', timeRemaining)
      .replace('{totalBids}', String(auction.bidCount))
      .replace('{windowMinutes}', String(windowMinutes))
      .replace('{biddingData}', JSON.stringify(biddingData, null, 2))
      .replace('{ipData}', JSON.stringify(sharedIPs, null, 2))

    const result = await chatCompletionJSON<BidPatternResult>(
      [{ role: 'user', content: prompt }],
      { model: config.defaultModel as OpenRouterModel, temperature: 0.1 }
    )

    // Save analysis
    const analysis = await prisma.aIBidPatternAnalysis.create({
      data: {
        auctionId,
        analysisWindowStart: windowStart,
        analysisWindowEnd: new Date(),
        isSuspicious: result.isSuspicious,
        suspicionScore: result.suspicionScore,
        patternType: result.patternType || null,
        patterns: result.patterns as object[],
        anomalies: result.anomalies as object[],
        bidsAnalyzed: result.bidMetrics.bidsAnalyzed,
        avgTimeBetweenBids: result.bidMetrics.avgTimeBetweenBids,
        bidVelocityScore: result.bidMetrics.bidVelocityScore,
        userPatterns: result.userPatterns as object,
        ipPatterns: result.ipPatterns as object,
        recommendedAction: result.recommendedAction,
        reasoning: result.reasoning,
        modelUsed: config.defaultModel,
        processingTimeMs: Date.now() - startTime,
      },
    })

    // Create fraud alert if suspicious
    if (result.isSuspicious && result.suspicionScore >= config.suspicionScoreThreshold) {
      await prisma.fraudAlert.create({
        data: {
          auctionId,
          alertType: `AI_DETECTED_${result.patternType?.toUpperCase() || 'SUSPICIOUS_PATTERN'}`,
          severity: result.suspicionScore >= 0.9 ? 'CRITICAL' : result.suspicionScore >= 0.75 ? 'HIGH' : 'MEDIUM',
          details: {
            analysisId: analysis.id,
            patternType: result.patternType,
            suspicionScore: result.suspicionScore,
            patterns: result.patterns.map(p => ({ ...p })),
            recommendedAction: result.recommendedAction,
          } as object,
          status: 'OPEN',
        },
      })
    }

    return analysis
  } catch (error) {
    // Create failed analysis record
    const analysis = await prisma.aIBidPatternAnalysis.create({
      data: {
        auctionId,
        analysisWindowStart: windowStart,
        analysisWindowEnd: new Date(),
        isSuspicious: false,
        patterns: [],
        anomalies: [],
        bidsAnalyzed: 0,
        modelUsed: config.defaultModel,
        processingTimeMs: Date.now() - startTime,
      },
    })

    throw error
  }
}

export async function analyzeUserBids(
  userId: string,
  windowMinutes = 1440 // 24 hours default
): Promise<AIBidPatternAnalysis> {
  const config = await getAIModerationConfig()
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  // Get user's recent bids across all auctions
  const userBids = await prisma.bid.findMany({
    where: {
      bidderId: userId,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      auction: {
        select: {
          id: true,
          listing: { select: { sellerId: true } },
        },
      },
    },
  })

  if (userBids.length === 0) {
    // Return empty analysis
    return prisma.aIBidPatternAnalysis.create({
      data: {
        userId,
        auctionId: 'user-analysis',
        analysisWindowStart: windowStart,
        analysisWindowEnd: new Date(),
        isSuspicious: false,
        suspicionScore: 0,
        patterns: [],
        anomalies: [],
        bidsAnalyzed: 0,
        recommendedAction: 'none',
        reasoning: 'No bids in analysis window',
        modelUsed: config.defaultModel,
        processingTimeMs: 0,
      },
    })
  }

  // Use first auction for the analysis record
  return analyzeAuctionBids(userBids[0].auctionId, windowMinutes)
}

export async function getRecentBidAnalyses(
  auctionId: string,
  limit = 10
): Promise<AIBidPatternAnalysis[]> {
  return prisma.aIBidPatternAnalysis.findMany({
    where: { auctionId },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getSuspiciousBidPatterns(limit = 50): Promise<AIBidPatternAnalysis[]> {
  const config = await getAIModerationConfig()
  return prisma.aIBidPatternAnalysis.findMany({
    where: {
      isSuspicious: true,
      suspicionScore: { gte: config.suspicionScoreThreshold },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

// ============================================================================
// MODERATION DASHBOARD
// ============================================================================

export async function getModerationStats(): Promise<ModerationStats> {
  const [
    listingsAnalyzed,
    listingsPending,
    commentsModerated,
    commentsAuto,
    suspiciousBids,
    carReviews,
    avgConfidence,
  ] = await Promise.all([
    prisma.aIListingAnalysis.count({ where: { status: 'COMPLETED' } }),
    prisma.aIListingAnalysis.count({ where: { decision: 'FLAG_FOR_REVIEW' } }),
    prisma.aICommentModeration.count(),
    prisma.aICommentModeration.count({ where: { autoActioned: true } }),
    prisma.aIBidPatternAnalysis.count({ where: { isSuspicious: true } }),
    prisma.aICarReview.count({ where: { status: 'COMPLETED' } }),
    prisma.aIListingAnalysis.aggregate({
      where: { status: 'COMPLETED', confidenceScore: { not: null } },
      _avg: { confidenceScore: true },
    }),
  ])

  return {
    listingsAnalyzed,
    listingsPendingReview: listingsPending,
    commentsModerated,
    commentsAutoActioned: commentsAuto,
    suspiciousBidPatterns: suspiciousBids,
    carReviewsGenerated: carReviews,
    avgConfidenceScore: avgConfidence._avg.confidenceScore || 0,
  }
}

export async function getRecentModerationActivity(limit = 50): Promise<ModerationActivity[]> {
  const [listings, comments, bids, reviews] = await Promise.all([
    prisma.aIListingAnalysis.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        listingId: true,
        decision: true,
        status: true,
        confidenceScore: true,
        createdAt: true,
      },
    }),
    prisma.aICommentModeration.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        commentId: true,
        decision: true,
        status: true,
        confidenceScore: true,
        createdAt: true,
      },
    }),
    prisma.aIBidPatternAnalysis.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        auctionId: true,
        isSuspicious: true,
        suspicionScore: true,
        createdAt: true,
      },
    }),
    prisma.aICarReview.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        listingId: true,
        status: true,
        isPublished: true,
        createdAt: true,
      },
    }),
  ])

  const activities: ModerationActivity[] = [
    ...listings.map((l) => ({
      id: l.id,
      type: 'listing' as const,
      resourceId: l.listingId,
      decision: l.decision || undefined,
      status: l.status,
      confidenceScore: l.confidenceScore || undefined,
      createdAt: l.createdAt,
    })),
    ...comments.map((c) => ({
      id: c.id,
      type: 'comment' as const,
      resourceId: c.commentId,
      decision: c.decision || undefined,
      status: c.status,
      confidenceScore: c.confidenceScore || undefined,
      createdAt: c.createdAt,
    })),
    ...bids.map((b) => ({
      id: b.id,
      type: 'bid_pattern' as const,
      resourceId: b.auctionId,
      status: 'COMPLETED' as const,
      confidenceScore: b.suspicionScore || undefined,
      createdAt: b.createdAt,
    })),
    ...reviews.map((r) => ({
      id: r.id,
      type: 'car_review' as const,
      resourceId: r.listingId,
      status: r.status,
      createdAt: r.createdAt,
    })),
  ]

  return activities
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
}
