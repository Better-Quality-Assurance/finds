/**
 * AI Bid Pattern Analysis Service
 *
 * Analyzes bidding patterns for fraud detection.
 * Single Responsibility: Only handles bid pattern analysis.
 */

import type { PrismaClient, AIBidPatternAnalysis } from '@prisma/client'
import type { IAIProvider } from '@/services/contracts/ai-provider.interface'
import type { IAuditService } from '@/services/contracts/audit.interface'
import type {
  BidPatternResult,
  AIModerationConfig,
} from '@/services/contracts/ai-moderation.interface'

const BID_PATTERN_PROMPT = `You are a fraud detection expert for an online auction platform. Analyze this bidding data for potential manipulation patterns.

AUCTION CONTEXT:
Auction ID: {auctionId}
Seller ID: {sellerId}
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

export interface BidPatternServiceDeps {
  prisma: PrismaClient
  aiProvider: IAIProvider
  audit: IAuditService
  config: AIModerationConfig
}

export class BidPatternService {
  private prisma: PrismaClient
  private aiProvider: IAIProvider
  private audit: IAuditService
  private config: AIModerationConfig

  constructor(deps: BidPatternServiceDeps) {
    this.prisma = deps.prisma
    this.aiProvider = deps.aiProvider
    this.audit = deps.audit
    this.config = deps.config
  }

  async analyzeAuctionBids(
    auctionId: string,
    windowMinutes = 60,
    actorId?: string
  ): Promise<AIBidPatternAnalysis> {
    const startTime = Date.now()
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

    const rateCheck = this.aiProvider.checkRateLimit()
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
    }

    const auction = await this.prisma.auction.findUnique({
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
        .replace('{sellerId}', auction.listing.sellerId)
        .replace('{startingPrice}', auction.startingPrice.toString())
        .replace('{currency}', auction.currency)
        .replace('{currentBid}', auction.currentBid?.toString() || 'No bids')
        .replace('{durationHours}', String(durationHours))
        .replace('{timeRemaining}', timeRemaining)
        .replace('{totalBids}', String(auction.bidCount))
        .replace('{windowMinutes}', String(windowMinutes))
        .replace('{biddingData}', JSON.stringify(biddingData, null, 2))
        .replace('{ipData}', JSON.stringify(sharedIPs, null, 2))

      const { data: result, usage } = await this.aiProvider.completeJSON<BidPatternResult>(
        [{ role: 'user', content: prompt }],
        { model: this.config.defaultModel, temperature: 0.1 }
      )

      const analysis = await this.prisma.aIBidPatternAnalysis.create({
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
          modelUsed: this.config.defaultModel,
          tokensUsed: usage.totalTokens,
          processingTimeMs: Date.now() - startTime,
        },
      })

      // Create fraud alert if suspicious
      if (result.isSuspicious && result.suspicionScore >= this.config.suspicionScoreThreshold) {
        await this.prisma.fraudAlert.create({
          data: {
            auctionId,
            alertType: `AI_DETECTED_${result.patternType?.toUpperCase() || 'SUSPICIOUS_PATTERN'}`,
            severity: result.suspicionScore >= 0.9 ? 'CRITICAL' : result.suspicionScore >= 0.75 ? 'HIGH' : 'MEDIUM',
            details: {
              analysisId: analysis.id,
              patternType: result.patternType,
              suspicionScore: result.suspicionScore,
              patterns: result.patterns,
              recommendedAction: result.recommendedAction,
            },
            status: 'OPEN',
          },
        })
      }

      await this.audit.logAuditEvent({
        actorId,
        action: 'AI_BID_PATTERN_ANALYZED',
        resourceType: 'AUCTION',
        resourceId: auctionId,
        severity: result.isSuspicious ? 'HIGH' : 'LOW',
        status: 'SUCCESS',
        details: {
          isSuspicious: result.isSuspicious,
          suspicionScore: result.suspicionScore,
          patternType: result.patternType,
          recommendedAction: result.recommendedAction,
          bidsAnalyzed: result.bidMetrics.bidsAnalyzed,
        },
      })

      return analysis
    } catch (error) {
      const analysis = await this.prisma.aIBidPatternAnalysis.create({
        data: {
          auctionId,
          analysisWindowStart: windowStart,
          analysisWindowEnd: new Date(),
          isSuspicious: false,
          patterns: [],
          anomalies: [],
          bidsAnalyzed: 0,
          modelUsed: this.config.defaultModel,
          processingTimeMs: Date.now() - startTime,
        },
      })

      throw error
    }
  }

  async analyzeUserBids(
    userId: string,
    windowMinutes = 1440,
    actorId?: string
  ): Promise<AIBidPatternAnalysis> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

    // Get user's recent bids across all auctions
    const userBids = await this.prisma.bid.findMany({
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
      return this.prisma.aIBidPatternAnalysis.create({
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
          modelUsed: this.config.defaultModel,
          processingTimeMs: 0,
        },
      })
    }

    // Analyze user's bidding patterns across auctions
    const auctionIds = [...new Set(userBids.map(b => b.auctionId))]
    const sellerIds = [...new Set(userBids.map(b => b.auction.listing.sellerId))]

    // Check for suspicious patterns
    const suspiciousIndicators: string[] = []

    // Check if user only bids on same seller's items
    if (sellerIds.length === 1 && auctionIds.length > 2) {
      suspiciousIndicators.push('Only bids on single seller\'s auctions')
    }

    // Check bid frequency
    const avgTimeBetweenBids = userBids.length > 1
      ? (userBids[0].createdAt.getTime() - userBids[userBids.length - 1].createdAt.getTime()) / (userBids.length - 1) / 1000
      : 0

    if (avgTimeBetweenBids < 30 && userBids.length > 10) {
      suspiciousIndicators.push('Very high bid frequency')
    }

    const isSuspicious = suspiciousIndicators.length > 0
    const suspicionScore = Math.min(suspiciousIndicators.length * 0.3, 1.0)

    const analysis = await this.prisma.aIBidPatternAnalysis.create({
      data: {
        userId,
        auctionId: 'user-analysis',
        analysisWindowStart: windowStart,
        analysisWindowEnd: new Date(),
        isSuspicious,
        suspicionScore,
        patternType: isSuspicious ? 'coordinated_bidding' : null,
        patterns: [],
        anomalies: [],
        bidsAnalyzed: userBids.length,
        avgTimeBetweenBids,
        bidVelocityScore: avgTimeBetweenBids > 0 ? Math.min(60 / avgTimeBetweenBids, 1.0) : 0,
        userPatterns: {
          userId,
          totalBidsInPeriod: userBids.length,
          auctionsParticipated: auctionIds.length,
          uniqueSellers: sellerIds.length,
          suspiciousIndicators,
        },
        recommendedAction: isSuspicious ? 'monitor' : 'none',
        reasoning: isSuspicious
          ? `User shows suspicious patterns: ${suspiciousIndicators.join(', ')}`
          : 'No suspicious patterns detected',
        modelUsed: 'rule-based',
        processingTimeMs: 0,
      },
    })

    await this.audit.logAuditEvent({
      actorId,
      action: 'AI_USER_BIDS_ANALYZED',
      resourceType: 'USER',
      resourceId: userId,
      severity: isSuspicious ? 'MEDIUM' : 'LOW',
      status: 'SUCCESS',
      details: {
        isSuspicious,
        suspicionScore,
        bidsAnalyzed: userBids.length,
        auctionsParticipated: auctionIds.length,
      },
    })

    return analysis
  }

  async getRecentAnalyses(auctionId: string, limit = 10): Promise<AIBidPatternAnalysis[]> {
    return this.prisma.aIBidPatternAnalysis.findMany({
      where: { auctionId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getSuspiciousPatterns(limit = 50): Promise<AIBidPatternAnalysis[]> {
    return this.prisma.aIBidPatternAnalysis.findMany({
      where: {
        isSuspicious: true,
        suspicionScore: { gte: this.config.suspicionScoreThreshold },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }
}
