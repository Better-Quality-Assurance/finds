/**
 * AI Car Review Service
 *
 * Generates user-facing car reviews with market value estimates.
 * Single Responsibility: Only handles car review generation.
 */

import type { PrismaClient, AICarReview } from '@prisma/client'
import type { IAIProvider } from '@/services/contracts/ai-provider.interface'
import type { IAuditService } from '@/services/contracts/audit.interface'
import type {
  CarReviewResult,
  AIModerationConfig,
} from '@/services/contracts/ai-moderation.interface'

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

{imageObservations}

Based on the photos provided and the listing information, create a detailed review that helps potential buyers make an informed decision.

IMPORTANT: For market value estimates, base them on real market trends for this make/model/year. If you're uncertain, provide wider ranges and note the uncertainty.

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
    "reasoning": "Based on current market trends for similar models. Note: These are estimates based on available information and general market knowledge. Actual values may vary based on in-person inspection.",
    "comparisons": [
      {"source": "Market research", "make": "...", "model": "...", "year": 1970, "price": 35000, "condition": "Good", "notes": "Similar spec - note this is an estimated comparison"}
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
  "appreciationPotential": "This model has shown steady appreciation historically. Market conditions and individual vehicle condition will affect future value."
}`

const IMAGE_REVIEW_PROMPT = `Analyze these photos of a classic car for an auction listing buyer's guide. Focus on:
1. Overall condition assessment
2. Paint and body condition (rust, dents, paint quality)
3. Interior condition (seats, dash, headliner, carpet)
4. Engine bay observations
5. Wheel and tire condition
6. Any visible issues or concerns
7. Signs of restoration, repair, or modification
8. Authenticity indicators

Provide detailed observations that would help a buyer understand the true condition of this vehicle.`

export interface CarReviewServiceDeps {
  prisma: PrismaClient
  aiProvider: IAIProvider
  audit: IAuditService
  config: AIModerationConfig
}

export class CarReviewService {
  private prisma: PrismaClient
  private aiProvider: IAIProvider
  private audit: IAuditService
  private config: AIModerationConfig

  constructor(deps: CarReviewServiceDeps) {
    this.prisma = deps.prisma
    this.aiProvider = deps.aiProvider
    this.audit = deps.audit
    this.config = deps.config
  }

  async generateReview(listingId: string, actorId?: string): Promise<AICarReview> {
    const startTime = Date.now()

    const rateCheck = this.aiProvider.checkRateLimit()
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: {
          where: { type: 'PHOTO' },
          orderBy: { position: 'asc' },
          take: 20,
        },
      },
    })

    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`)
    }

    let review = await this.prisma.aICarReview.upsert({
      where: { listingId },
      create: { listingId, status: 'PROCESSING' },
      update: { status: 'PROCESSING', errorMessage: null },
    })

    try {
      // Analyze images first if available
      let imageObservations = ''
      let imageTokensUsed = 0
      if (listing.media.length > 0) {
        const imageUrls = listing.media.map((m) => m.publicUrl)
        const imageResult = await this.aiProvider.analyzeImages(
          imageUrls,
          IMAGE_REVIEW_PROMPT,
          { model: this.config.visionModel }
        )
        imageObservations = `IMAGE OBSERVATIONS:\n${imageResult.content}`
        imageTokensUsed = imageResult.usage.totalTokens
      }

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
        .replace('{imageObservations}', imageObservations)

      const { data: result, usage } = await this.aiProvider.completeJSON<CarReviewResult>(
        [{ role: 'user', content: prompt }],
        { model: this.config.defaultModel, temperature: 0.3 }
      )

      review = await this.prisma.aICarReview.update({
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
          modelUsed: this.config.defaultModel,
          tokensUsed: usage.totalTokens + imageTokensUsed,
          processingTimeMs: Date.now() - startTime,
        },
      })

      await this.audit.logAuditEvent({
        actorId,
        action: 'AI_CAR_REVIEW_GENERATED',
        resourceType: 'LISTING',
        resourceId: listingId,
        severity: 'LOW',
        status: 'SUCCESS',
        details: {
          overallScore: result.overallScore,
          estimatedValueMid: result.estimatedValue.mid,
          tokensUsed: usage.totalTokens + imageTokensUsed,
          processingTimeMs: Date.now() - startTime,
        },
      })

      return review
    } catch (error) {
      review = await this.prisma.aICarReview.update({
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

  async getReview(listingId: string): Promise<AICarReview | null> {
    return this.prisma.aICarReview.findUnique({
      where: { listingId },
    })
  }

  async getPublishedReview(listingId: string): Promise<AICarReview | null> {
    return this.prisma.aICarReview.findFirst({
      where: {
        listingId,
        isPublished: true,
        status: 'COMPLETED',
      },
    })
  }

  async publishReview(listingId: string, actorId?: string): Promise<AICarReview> {
    const review = await this.prisma.aICarReview.update({
      where: { listingId },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    })

    await this.audit.logAuditEvent({
      actorId,
      action: 'AI_CAR_REVIEW_PUBLISHED',
      resourceType: 'LISTING',
      resourceId: listingId,
      severity: 'LOW',
      status: 'SUCCESS',
    })

    return review
  }

  async unpublishReview(listingId: string, actorId?: string): Promise<AICarReview> {
    const review = await this.prisma.aICarReview.update({
      where: { listingId },
      data: { isPublished: false },
    })

    await this.audit.logAuditEvent({
      actorId,
      action: 'AI_CAR_REVIEW_UNPUBLISHED',
      resourceType: 'LISTING',
      resourceId: listingId,
      severity: 'LOW',
      status: 'SUCCESS',
    })

    return review
  }
}
