/**
 * Global Sales Service
 *
 * Fetches and parses auction results from external sites like
 * Bring a Trailer, Catawiki, RM Sotheby's, etc.
 * Single Responsibility: Collects external auction sales data.
 */

import type { PrismaClient, ExternalAuctionSale } from '@prisma/client'
import type { IAIProvider } from '@/services/contracts/ai-provider.interface'
import { paymentLogger as logger, logError } from '@/lib/logger'

// Supported auction sources - Global (showing all regions)
export const AUCTION_SOURCES = [
  // EU-focused sources
  { name: 'Catawiki', domain: 'catawiki.com', region: 'EU', requiresLocationCheck: false },
  { name: 'Artcurial', domain: 'artcurial.com', region: 'EU', requiresLocationCheck: false },
  { name: 'Collecting Cars', domain: 'collectingcars.com', region: 'EU', requiresLocationCheck: false },
  // Global sources (include all sales, not just EU)
  { name: 'Bring a Trailer', domain: 'bringatrailer.com', region: 'Global', requiresLocationCheck: false },
  { name: 'RM Sothebys', domain: 'rmsothebys.com', region: 'Global', requiresLocationCheck: false },
  { name: 'Bonhams', domain: 'bonhams.com', region: 'Global', requiresLocationCheck: false },
] as const

// Exchange rates (approximate, could be fetched from API)
const EUR_RATES: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.05,
}

export interface ExternalSaleInput {
  source: string
  sourceUrl: string
  title: string
  make: string
  model: string
  year: number
  soldPrice: number
  currency: string
  saleDate: Date
  location?: string
  condition?: string
  mileage?: number
  imageUrl?: string
}

export interface ParsedAuctionResult {
  title: string
  make: string
  model: string
  year: number
  soldPrice: number
  currency: string
  saleDate: string
  location?: string
  condition?: string
  mileage?: number
  imageUrl?: string
}

const PARSE_AUCTION_PROMPT = `You are extracting structured data from an auction result page for a European classic car marketplace.

Extract the following information from the provided content. Be precise and only include data you can confidently extract.

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "title": "Full auction title, e.g., '1989 Peugeot 205 GTI 1.9'",
  "make": "Vehicle manufacturer, e.g., 'Peugeot'",
  "model": "Vehicle model, e.g., '205 GTI'",
  "year": 1989,
  "soldPrice": 18500,
  "currency": "EUR or USD or GBP or CHF",
  "saleDate": "2024-06-15",
  "location": "Country where the vehicle is located or was sold. IMPORTANT: Look for seller location, vehicle location, or auction house location. Use country name, e.g., 'Germany', 'France', 'United Kingdom', 'Netherlands'. If city mentioned, include both: 'Munich, Germany'",
  "condition": "If mentioned: Excellent, Very Good, Good, Fair, Poor, Project, Barn Find",
  "mileage": 85000,
  "imageUrl": "URL of main vehicle image (not thumbnail)"
}

Rules:
- soldPrice: number only, no currency symbols or commas. Must be the SOLD/HAMMER price, not estimate
- saleDate: YYYY-MM-DD format. Use auction end date if available
- mileage: number in kilometers. Convert miles to km (multiply by 1.6)
- location: CRITICAL - extract the country/location. Look for:
  * "Located in [country]"
  * "Seller location: [city, country]"
  * Auction house location (e.g., "RM Sotheby's Paris" = France)
  * Registration/plates country
  * If US state mentioned (California, Texas, etc.) = "United States"
- imageUrl: main hero image URL, not thumbnails
- If a field cannot be found with confidence, use null
- For year, extract from title if not explicitly stated (e.g., "1989 Porsche" = 1989)`

interface GlobalSalesServiceDeps {
  prisma: PrismaClient
  aiProvider: IAIProvider
}

export class GlobalSalesService {
  private readonly prisma: PrismaClient
  private readonly aiProvider: IAIProvider

  constructor(deps: GlobalSalesServiceDeps) {
    this.prisma = deps.prisma
    this.aiProvider = deps.aiProvider
  }

  /**
   * Parse auction page content to extract sale data
   */
  async parseAuctionPage(
    pageContent: string,
    sourceUrl: string,
    source: string
  ): Promise<ParsedAuctionResult | null> {
    try {
      const response = await this.aiProvider.complete(
        [
          {
            role: 'system',
            content: PARSE_AUCTION_PROMPT,
          },
          {
            role: 'user',
            content: `Source: ${source}\nURL: ${sourceUrl}\n\nPage content:\n${pageContent.slice(0, 8000)}`,
          },
        ],
        {
          temperature: 0.1,
          maxTokens: 1000,
        }
      )

      const content = response.content.trim()
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.warn({ sourceUrl }, 'Could not extract JSON from AI response')
        return null
      }

      const parsed = JSON.parse(jsonMatch[0]) as ParsedAuctionResult
      return parsed
    } catch (error) {
      logError(logger, 'Failed to parse auction page', error, { sourceUrl, source })
      return null
    }
  }

  /**
   * Convert price to EUR
   */
  convertToEur(price: number, currency: string): number {
    const rate = EUR_RATES[currency.toUpperCase()] || 1
    return Math.round(price * rate)
  }

  /**
   * Store an external sale in the database
   */
  async storeSale(sale: ExternalSaleInput): Promise<ExternalAuctionSale | null> {
    try {
      // Check if already exists
      const existing = await this.prisma.externalAuctionSale.findUnique({
        where: { sourceUrl: sale.sourceUrl },
      })

      if (existing) {
        logger.debug({ sourceUrl: sale.sourceUrl }, 'Sale already exists, skipping')
        return existing
      }

      const priceEur = this.convertToEur(sale.soldPrice, sale.currency)

      const created = await this.prisma.externalAuctionSale.create({
        data: {
          source: sale.source,
          sourceUrl: sale.sourceUrl,
          title: sale.title,
          make: sale.make,
          model: sale.model,
          year: sale.year,
          soldPrice: sale.soldPrice,
          currency: sale.currency,
          priceEur,
          saleDate: sale.saleDate,
          location: sale.location,
          condition: sale.condition,
          mileage: sale.mileage,
          imageUrl: sale.imageUrl,
        },
      })

      logger.info(
        { id: created.id, title: sale.title, priceEur },
        'Stored external auction sale'
      )

      return created
    } catch (error) {
      logError(logger, 'Failed to store sale', error, { sourceUrl: sale.sourceUrl })
      return null
    }
  }

  /**
   * Get recent sales from database
   */
  async getRecentSales(options?: {
    make?: string
    model?: string
    limit?: number
    daysBack?: number
  }): Promise<ExternalAuctionSale[]> {
    const { make, model, limit = 50, daysBack = 30 } = options || {}

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    return this.prisma.externalAuctionSale.findMany({
      where: {
        saleDate: { gte: cutoffDate },
        ...(make && { make: { contains: make, mode: 'insensitive' } }),
        ...(model && { model: { contains: model, mode: 'insensitive' } }),
      },
      orderBy: { saleDate: 'desc' },
      take: limit,
    })
  }

  /**
   * Get similar sales for a vehicle (for comparison)
   */
  async getSimilarSales(
    make: string,
    model: string,
    year: number,
    limit = 10
  ): Promise<ExternalAuctionSale[]> {
    return this.prisma.externalAuctionSale.findMany({
      where: {
        make: { contains: make, mode: 'insensitive' },
        model: { contains: model, mode: 'insensitive' },
        year: { gte: year - 5, lte: year + 5 },
      },
      orderBy: { saleDate: 'desc' },
      take: limit,
    })
  }

  /**
   * Get market statistics for a make/model
   */
  async getMarketStats(
    make: string,
    model: string,
    options?: { yearMin?: number; yearMax?: number }
  ): Promise<{
    count: number
    avgPrice: number
    minPrice: number
    maxPrice: number
    recentTrend: 'up' | 'down' | 'stable'
  } | null> {
    const { yearMin, yearMax } = options || {}

    const sales = await this.prisma.externalAuctionSale.findMany({
      where: {
        make: { contains: make, mode: 'insensitive' },
        model: { contains: model, mode: 'insensitive' },
        ...(yearMin && { year: { gte: yearMin } }),
        ...(yearMax && { year: { lte: yearMax } }),
      },
      select: { priceEur: true, saleDate: true },
      orderBy: { saleDate: 'desc' },
    })

    if (sales.length === 0) {return null}

    const prices = sales.map(s => Number(s.priceEur))
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    // Calculate trend (compare first half vs second half)
    let recentTrend: 'up' | 'down' | 'stable' = 'stable'
    if (sales.length >= 4) {
      const midpoint = Math.floor(sales.length / 2)
      const recentAvg = prices.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint
      const olderAvg = prices.slice(midpoint).reduce((a, b) => a + b, 0) / (prices.length - midpoint)
      const change = (recentAvg - olderAvg) / olderAvg
      if (change > 0.05) {recentTrend = 'up'}
      else if (change < -0.05) {recentTrend = 'down'}
    }

    return { count: sales.length, avgPrice, minPrice, maxPrice, recentTrend }
  }
}

// Factory function
import { prisma } from '@/lib/db'
import { OpenRouterProvider } from '@/lib/openrouter-provider'

export function createGlobalSalesService(): GlobalSalesService {
  return new GlobalSalesService({
    prisma,
    aiProvider: new OpenRouterProvider(),
  })
}
