/**
 * Listing Improvement Service
 *
 * Analyzes expired/unsold listings and generates AI-powered improvement suggestions.
 * Uses both local sold auction data and global market data (BaT, Catawiki, etc.)
 * Single Responsibility: Generate listing improvement suggestions.
 */

import type { PrismaClient, AIListingImprovement, Listing, Auction } from '@prisma/client'
import type { IAIProvider } from '@/services/contracts/ai-provider.interface'
import { GlobalSalesService } from './global-sales.service'
import { paymentLogger as logger, logError } from '@/lib/logger'
import { z } from 'zod'

export interface ListingImprovementSuggestions {
  reason: 'no_bids' | 'reserve_not_met'
  pricingAnalysis: {
    suggestedStartingPrice: number
    suggestedReserve: number | null
    currentVsMarket: 'overpriced' | 'underpriced' | 'fair'
    marketData: {
      avgSoldPrice: number | null
      soldCount: number
      priceRange: { low: number; high: number } | null
      localSales: Array<{ price: number; date: string; source: string }>
      globalSales: Array<{ price: number; date: string; source: string; url?: string }>
    }
    reasoning: string
  }
  photoSuggestions: {
    currentCount: number
    recommendedCount: number
    missingCategories: string[]
    qualityIssues: string[]
  }
  descriptionSuggestions: {
    missingInfo: string[]
    improvements: string[]
  }
  timingSuggestions: {
    recommendedDuration: number // days
    bestStartDay: string
    reasoning: string
  }
  overallScore: number // 1-100 listing quality
  topPriorities: string[] // Top 3 things to fix
}

/**
 * Zod schema for validating AI response
 * Provides runtime validation and better error messages for malformed responses
 */
const AIResponseSchema = z.object({
  pricingAnalysis: z.object({
    suggestedStartingPrice: z.number().positive(),
    suggestedReserve: z.number().nullable(),
    currentVsMarket: z.enum(['overpriced', 'underpriced', 'fair']),
    reasoning: z.string(),
  }),
  photoSuggestions: z.object({
    currentCount: z.number().int().min(0),
    recommendedCount: z.number().int().min(0),
    missingCategories: z.array(z.string()),
    qualityIssues: z.array(z.string()),
  }),
  descriptionSuggestions: z.object({
    missingInfo: z.array(z.string()),
    improvements: z.array(z.string()),
  }),
  timingSuggestions: z.object({
    recommendedDuration: z.number().int().positive(),
    bestStartDay: z.string(),
    reasoning: z.string(),
  }),
  overallScore: z.number().int().min(1).max(100),
  topPriorities: z.array(z.string()).min(1).max(5),
})

const IMPROVEMENT_PROMPT = `You are an expert auction consultant analyzing why a classic car auction did not sell. Your goal is to provide specific, actionable suggestions to help the seller succeed on their next attempt.

VEHICLE INFORMATION:
- Title: {title}
- Make: {make}
- Model: {model}
- Year: {year}
- Mileage: {mileage} {mileageUnit}
- Condition Rating: {conditionRating}/10
- Running: {isRunning}
- Location: {locationCity}, {locationCountry}

PRICING:
- Starting Price: EUR {startingPrice}
- Reserve Price: EUR {reservePrice}
- Highest Bid Received: EUR {currentBid}

AUCTION RESULT: {reason}
{reasonDetails}

LISTING DETAILS:
- Description length: {descriptionLength} characters
- Photos: {photoCount} photos
- Photo categories: {photoCategories}

MARKET DATA (similar vehicles sold recently):
{marketDataSection}

Based on this analysis, provide specific improvement suggestions.

Respond in JSON format (no markdown):
{
  "pricingAnalysis": {
    "suggestedStartingPrice": 15000,
    "suggestedReserve": null,
    "currentVsMarket": "overpriced",
    "reasoning": "Your starting price of EUR 25,000 is 40% above the market average..."
  },
  "photoSuggestions": {
    "currentCount": 12,
    "recommendedCount": 25,
    "missingCategories": ["engine bay", "undercarriage", "trunk"],
    "qualityIssues": ["Add close-ups of any rust or damage", "Include odometer photo"]
  },
  "descriptionSuggestions": {
    "missingInfo": ["Service history details", "Previous ownership count", "Any restoration work"],
    "improvements": ["Add specific details about recent maintenance", "Mention any documentation included"]
  },
  "timingSuggestions": {
    "recommendedDuration": 7,
    "bestStartDay": "Thursday",
    "reasoning": "7-day auctions ending on weekends get 20% more bids"
  },
  "overallScore": 65,
  "topPriorities": [
    "Lower starting price to EUR 18,000 (closer to market average)",
    "Add engine bay and undercarriage photos",
    "Remove reserve or set at EUR 20,000 max"
  ]
}`

interface ListingWithAuction extends Listing {
  auction?: Auction | null
  media?: Array<{ category: string }>
}

interface ListingImprovementServiceDeps {
  prisma: PrismaClient
  aiProvider: IAIProvider
  globalSalesService: GlobalSalesService
}

export class ListingImprovementService {
  private readonly prisma: PrismaClient
  private readonly aiProvider: IAIProvider
  private readonly globalSalesService: GlobalSalesService

  constructor(deps: ListingImprovementServiceDeps) {
    this.prisma = deps.prisma
    this.aiProvider = deps.aiProvider
    this.globalSalesService = deps.globalSalesService
  }

  /**
   * Generate improvement suggestions for an expired listing
   */
  async generateSuggestions(
    listingId: string,
    auctionId: string,
    reason: 'no_bids' | 'reserve_not_met'
  ): Promise<AIListingImprovement> {
    const startTime = Date.now()

    // Create pending record
    const improvement = await this.prisma.aIListingImprovement.create({
      data: {
        listingId,
        auctionId,
        reason,
        status: 'PROCESSING',
        topPriorities: [],
      },
    })

    try {
      // Fetch listing with auction and media
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          auction: true,
          media: { select: { category: true } },
        },
      }) as ListingWithAuction | null

      if (!listing) {
        throw new Error('Listing not found')
      }

      // Gather market data
      const marketData = await this.gatherMarketData(listing)

      // Build prompt
      const prompt = this.buildPrompt(listing, reason, marketData)

      // Call AI
      const response = await this.aiProvider.complete(
        [
          { role: 'system', content: IMPROVEMENT_PROMPT },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 2000,
        }
      )

      // Parse response
      const content = response.content.trim()
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Invalid AI response format: no JSON object found')
      }

      // Parse and validate with Zod schema
      let suggestions: z.infer<typeof AIResponseSchema>
      try {
        const parsed = JSON.parse(jsonMatch[0])
        suggestions = AIResponseSchema.parse(parsed)
      } catch (parseError) {
        if (parseError instanceof z.ZodError) {
          const issues = parseError.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
          throw new Error(`Invalid AI response structure: ${issues}`)
        }
        throw new Error(`Failed to parse AI response JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

      // Update record
      const processingTimeMs = Date.now() - startTime
      const updated = await this.prisma.aIListingImprovement.update({
        where: { id: improvement.id },
        data: {
          status: 'COMPLETED',
          suggestedStartingPrice: suggestions.pricingAnalysis?.suggestedStartingPrice,
          suggestedReserve: suggestions.pricingAnalysis?.suggestedReserve,
          avgMarketPrice: marketData.avgPrice,
          pricingReasoning: suggestions.pricingAnalysis?.reasoning,
          suggestions: suggestions as object,
          topPriorities: suggestions.topPriorities || [],
          localSalesCount: marketData.localCount,
          globalSalesCount: marketData.globalCount,
          marketData: {
            localSales: marketData.localSales,
            globalSales: marketData.globalSales,
          },
          modelUsed: 'anthropic/claude-3.5-sonnet',
          tokensUsed: response.usage?.totalTokens,
          processingTimeMs,
        },
      })

      logger.info(
        { listingId, auctionId, processingTimeMs },
        'Generated listing improvement suggestions'
      )

      return updated
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.prisma.aIListingImprovement.update({
        where: { id: improvement.id },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      })

      logError(logger, 'Failed to generate improvement suggestions', error, {
        listingId,
        auctionId,
      })

      throw error
    }
  }

  /**
   * Gather market data from local and global sources
   */
  private async gatherMarketData(listing: ListingWithAuction) {
    // Local sold auctions
    const localSoldRaw = await this.prisma.auction.findMany({
      where: {
        status: 'SOLD',
        listing: {
          make: listing.make,
          model: listing.model,
          year: { gte: listing.year - 5, lte: listing.year + 5 },
        },
      },
      select: {
        finalPrice: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const localSales = localSoldRaw.map(s => ({
      price: Number(s.finalPrice),
      date: s.createdAt.toISOString().split('T')[0],
      source: 'finds.ro',
    }))

    // Global sales from external sources
    const globalSalesRaw = await this.globalSalesService.getSimilarSales(
      listing.make,
      listing.model,
      listing.year,
      10
    )

    const globalSales = globalSalesRaw.map(s => ({
      price: Number(s.priceEur),
      date: s.saleDate.toISOString().split('T')[0],
      source: s.source,
      url: s.sourceUrl,
    }))

    // Calculate averages
    const allPrices = [...localSales, ...globalSales].map(s => s.price)
    const avgPrice = allPrices.length > 0
      ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
      : null

    const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null
    const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : null

    return {
      localSales,
      globalSales,
      localCount: localSales.length,
      globalCount: globalSales.length,
      avgPrice,
      priceRange: minPrice && maxPrice ? { low: minPrice, high: maxPrice } : null,
    }
  }

  /**
   * Build the prompt with listing data
   */
  private buildPrompt(
    listing: ListingWithAuction,
    reason: 'no_bids' | 'reserve_not_met',
    marketData: Awaited<ReturnType<typeof this.gatherMarketData>>
  ): string {
    const photoCategories = listing.media?.map(m => m.category).join(', ') || 'none'
    const currentBid = listing.auction?.currentBid ? Number(listing.auction.currentBid) : 0

    let reasonDetails = ''
    if (reason === 'no_bids') {
      reasonDetails = 'No bids were placed during the entire auction period.'
    } else {
      reasonDetails = `The highest bid (EUR ${currentBid}) did not meet the reserve price of EUR ${Number(listing.reservePrice)}.`
    }

    // Build market data section
    let marketDataSection = ''
    if (marketData.localSales.length > 0 || marketData.globalSales.length > 0) {
      marketDataSection = 'Recent sales of similar vehicles:\n'

      for (const sale of marketData.localSales.slice(0, 3)) {
        marketDataSection += `- EUR ${sale.price.toLocaleString()} (${sale.date}) - ${sale.source}\n`
      }

      for (const sale of marketData.globalSales.slice(0, 5)) {
        marketDataSection += `- EUR ${sale.price.toLocaleString()} (${sale.date}) - ${sale.source}\n`
      }

      if (marketData.avgPrice) {
        marketDataSection += `\nMarket average: EUR ${marketData.avgPrice.toLocaleString()}`
        if (marketData.priceRange) {
          marketDataSection += ` (range: EUR ${marketData.priceRange.low.toLocaleString()} - ${marketData.priceRange.high.toLocaleString()})`
        }
      }
    } else {
      marketDataSection = 'No similar vehicles found in our database. Using AI market knowledge for estimates.'
    }

    return `
Title: ${listing.title}
Make: ${listing.make}
Model: ${listing.model}
Year: ${listing.year}
Mileage: ${listing.mileage || 'Unknown'} ${listing.mileageUnit}
Condition Rating: ${listing.conditionRating || 'Not rated'}/10
Running: ${listing.isRunning ? 'Yes' : 'No'}
Location: ${listing.locationCity}, ${listing.locationCountry}

Starting Price: EUR ${Number(listing.startingPrice).toLocaleString()}
Reserve Price: EUR ${listing.reservePrice ? Number(listing.reservePrice).toLocaleString() : 'None'}
Highest Bid: EUR ${currentBid.toLocaleString()}

Auction Result: ${reason === 'no_bids' ? 'NO BIDS' : 'RESERVE NOT MET'}
${reasonDetails}

Description length: ${listing.description.length} characters
Photos: ${listing.media?.length || 0}
Photo categories: ${photoCategories}

${marketDataSection}
`.trim()
  }

  /**
   * Get improvement suggestions for a listing
   */
  async getImprovements(listingId: string): Promise<AIListingImprovement | null> {
    return this.prisma.aIListingImprovement.findFirst({
      where: { listingId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    })
  }
}

// Factory function
import { prisma } from '@/lib/db'
import { OpenRouterProvider } from '@/lib/openrouter-provider'
import { createGlobalSalesService } from './global-sales.service'

export function createListingImprovementService(): ListingImprovementService {
  return new ListingImprovementService({
    prisma,
    aiProvider: new OpenRouterProvider(),
    globalSalesService: createGlobalSalesService(),
  })
}

// Convenience function for triggering from endAuction
export async function generateListingImprovements(
  listingId: string,
  auctionId: string,
  reason: 'no_bids' | 'reserve_not_met'
): Promise<void> {
  const service = createListingImprovementService()
  await service.generateSuggestions(listingId, auctionId, reason)
}
