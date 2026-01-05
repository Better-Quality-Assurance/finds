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
/**
 * Extract structured data attributes from HTML (e.g., data-auction-*, JSON-LD)
 * This allows AI to access structured data even if it's far into the document
 */
function extractStructuredData(html: string): string {
  const structured: string[] = []

  // Extract Catawiki enhanced structured data (from HTML comments)
  const catawikiDataMatch = html.match(/<!-- CATAWIKI STRUCTURED DATA -->([\s\S]*?)<!-- END CATAWIKI STRUCTURED DATA -->/i)
  if (catawikiDataMatch) {
    structured.push('CATAWIKI STRUCTURED DATA (extracted via Puppeteer):')

    // Extract NEXT_DATA
    const nextDataMatch = catawikiDataMatch[1].match(/<!-- NEXT_DATA: (.*?) -->/i)
    if (nextDataMatch && nextDataMatch[1] && nextDataMatch[1] !== '{}') {
      structured.push('  Next.js Data (from __NEXT_DATA__):')
      structured.push('  ' + nextDataMatch[1].slice(0, 3000))
    }

    // Extract PRELOADED_STATE
    const preloadedMatch = catawikiDataMatch[1].match(/<!-- PRELOADED_STATE: (.*?) -->/i)
    if (preloadedMatch && preloadedMatch[1] && preloadedMatch[1] !== '{}') {
      structured.push('  Preloaded State:')
      structured.push('  ' + preloadedMatch[1].slice(0, 2000))
    }

    // Extract JSON-LD from Catawiki data
    const jsonLdCataMatch = catawikiDataMatch[1].match(/<!-- JSON_LD: (.*?) -->/i)
    if (jsonLdCataMatch && jsonLdCataMatch[1] && jsonLdCataMatch[1] !== '{}') {
      structured.push('  JSON-LD:')
      structured.push('  ' + jsonLdCataMatch[1].slice(0, 1500))
    }

    // Extract price texts
    const priceTextsMatch = catawikiDataMatch[1].match(/<!-- PRICE_TEXTS: (.*?) -->/i)
    if (priceTextsMatch && priceTextsMatch[1] && priceTextsMatch[1] !== '[]') {
      structured.push('  Price Texts Found on Page:')
      structured.push('  ' + priceTextsMatch[1])
    }

    // Extract meta tags
    const metaTagsMatch = catawikiDataMatch[1].match(/<!-- META_TAGS: (.*?) -->/i)
    if (metaTagsMatch && metaTagsMatch[1] && metaTagsMatch[1] !== '{}') {
      structured.push('  Open Graph Meta Tags:')
      structured.push('  ' + metaTagsMatch[1])
    }
  }

  // Extract data-auction-* attributes (Collecting Cars, etc.)
  const dataAttrRegex = /data-auction-([a-z-]+)="([^"]+)"/gi
  const attrs: Record<string, string> = {}
  let match
  while ((match = dataAttrRegex.exec(html)) !== null) {
    const key = match[1]
    const value = match[2]
    // Only keep first occurrence of each attribute
    if (!attrs[key]) {
      attrs[key] = value
    }
  }
  if (Object.keys(attrs).length > 0) {
    structured.push('STRUCTURED DATA (data-auction-* attributes):')
    for (const [key, value] of Object.entries(attrs)) {
      structured.push(`  ${key}: ${value}`)
    }
  }

  // Extract JSON-LD data - try all script tags
  const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonLd = JSON.parse(match[1])
      // For Cars and Bids, look for Product schema with offer price
      if (jsonLd['@type'] === 'Product' && jsonLd.offers) {
        structured.push('JSON-LD PRODUCT DATA (Cars and Bids):')
        structured.push(`  price: ${jsonLd.offers.price}`)
        structured.push(`  priceCurrency: ${jsonLd.offers.priceCurrency}`)
        structured.push(`  name: ${jsonLd.name}`)
        if (jsonLd.image) {
          structured.push(`  imageUrl: ${jsonLd.image}`)
        }
      } else {
        structured.push('JSON-LD DATA:')
        structured.push(JSON.stringify(jsonLd, null, 2).slice(0, 1000))
      }
    } catch {
      // Invalid JSON-LD, ignore
    }
  }

  // Extract Cars and Bids specific HTML patterns
  // Pattern: <span class="bid-value">$42,000</span>
  const bidValueMatch = html.match(/<span class="bid-value">\$([^<]+)<\/span>/i)
  if (bidValueMatch) {
    structured.push('CARS AND BIDS HTML PATTERNS:')
    structured.push(`  sold_price: $${bidValueMatch[1]}`)
  }

  // Pattern: <span class="time-ended">10/21/24</span>
  const timeEndedMatch = html.match(/<span class="time-ended">([^<]+)<\/span>/i)
  if (timeEndedMatch) {
    if (!structured.includes('CARS AND BIDS HTML PATTERNS:')) {
      structured.push('CARS AND BIDS HTML PATTERNS:')
    }
    structured.push(`  sale_date: ${timeEndedMatch[1]}`)
  }

  // Pattern: Location in quick-facts
  const locationMatch = html.match(/<dt>Location<\/dt>\s*<dd[^>]*>.*?href="https:\/\/www\.google\.com\/maps\/place\/([^"]+)"/i)
  if (locationMatch) {
    if (!structured.includes('CARS AND BIDS HTML PATTERNS:')) {
      structured.push('CARS AND BIDS HTML PATTERNS:')
    }
    structured.push(`  location: ${decodeURIComponent(locationMatch[1].replace(/\+/g, ' '))}`)
  }

  // Extract RM Sotheby's price from plain text (e.g., "$31,200 USD | Sold")
  // RM Sotheby's doesn't use structured data - price is in plain text
  const rmPriceMatch = html.match(/\$?([\d,]+)\s*(USD|EUR|GBP|CHF)\s*\|\s*Sold/i)
  if (rmPriceMatch) {
    structured.push('RM SOTHEBY\'S PRICE DATA:')
    structured.push(`  sold_price: ${rmPriceMatch[1].replace(/,/g, '')}`)
    structured.push(`  currency: ${rmPriceMatch[2].toUpperCase()}`)
  }

  // Extract RM Sotheby's auction info from URL or page title
  // Auction codes like mo24, pa25 indicate location and date
  const rmAuctionMatch = html.match(/\/auctions\/([a-z]{2}\d{2})\//i)
  if (rmAuctionMatch) {
    if (!rmPriceMatch) {structured.push('RM SOTHEBY\'S AUCTION INFO:')}
    structured.push(`  auction_code: ${rmAuctionMatch[1]}`)
    // Decode auction codes: mo24 = Monterey 2024, pa25 = Paris 2025, az25 = Arizona 2025
    const auctionCodes: Record<string, { location: string; month: string }> = {
      mo: { location: 'Monterey, United States', month: 'August' },
      pa: { location: 'Paris, France', month: 'February' },
      az: { location: 'Arizona, United States', month: 'January' },
      mi: { location: 'Miami, United States', month: 'February' },
      lf: { location: 'London, United Kingdom', month: 'November' },
      mu: { location: 'Munich, Germany', month: 'October' },
    }
    const code = rmAuctionMatch[1].substring(0, 2)
    const year = '20' + rmAuctionMatch[1].substring(2, 4)
    if (auctionCodes[code]) {
      structured.push(`  location: ${auctionCodes[code].location}`)
      structured.push(`  estimated_date: ${year}-${auctionCodes[code].month}`)
    }
  }

  // Extract Open Graph meta tags
  const ogTags: Record<string, string> = {}
  const ogRegex = /<meta\s+(?:property|name)="og:([^"]+)"\s+content="([^"]+)"/gi
  while ((match = ogRegex.exec(html)) !== null) {
    ogTags[match[1]] = match[2]
  }
  // Also try reverse attribute order
  const ogRegex2 = /<meta\s+content="([^"]+)"\s+(?:property|name)="og:([^"]+)"/gi
  while ((match = ogRegex2.exec(html)) !== null) {
    ogTags[match[2]] = match[1]
  }
  if (Object.keys(ogTags).length > 0) {
    structured.push('OPEN GRAPH METADATA:')
    for (const [key, value] of Object.entries(ogTags)) {
      structured.push(`  og:${key}: ${value}`)
    }
  }

  return structured.join('\n')
}

// Supported auction sources - Global (showing all regions)
export const AUCTION_SOURCES = [
  // EU-focused sources
  { name: 'Catawiki', domain: 'catawiki.com', region: 'EU', requiresLocationCheck: false },
  { name: 'Artcurial', domain: 'artcurial.com', region: 'EU', requiresLocationCheck: false },
  { name: 'Collecting Cars', domain: 'collectingcars.com', region: 'EU', requiresLocationCheck: false },
  { name: 'Silverstone Auctions', domain: 'silverstoneauctions.com', region: 'EU', requiresLocationCheck: false },
  { name: 'Classic Driver', domain: 'classicdriver.com', region: 'EU', requiresLocationCheck: false },
  // Global sources (include all sales, not just EU)
  { name: 'Bring a Trailer', domain: 'bringatrailer.com', region: 'Global', requiresLocationCheck: false },
  { name: 'Cars and Bids', domain: 'carsandbids.com', region: 'Global', requiresLocationCheck: false },
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

IMPORTANT: The input may include STRUCTURED DATA which should be used as PRIMARY source. Multiple formats are used:

1. CATAWIKI STRUCTURED DATA (for Catawiki):
   - Next.js Data (__NEXT_DATA__): Contains complete auction/lot data in JSON format
     * Look for: lot.currentBid, lot.hammer_price, lot.winning_bid, lot.current_bid_amount
     * Currency: lot.currency_code or lot.currency
     * Title: lot.title or lot.description
     * Sale date: lot.auction_end_date or lot.closed_at
     * Location: seller.location or lot.location
     * Image: lot.main_image_url or lot.images[0]
   - Price Texts: Array of price strings found on the page (e.g., ["€15,000", "€12,500"])
   - JSON-LD: May contain Product schema with price information
   - Meta Tags: og:title, og:image, og:description

2. CARS AND BIDS HTML PATTERNS (most reliable for Cars and Bids):
   - sold_price: The final hammer price (e.g., "$42,000")
   - sale_date: Date in MM/DD/YY format (e.g., "10/21/24")
   - location: City, State format (e.g., "Phoenix, AZ 85020")

3. JSON-LD PRODUCT DATA (Cars and Bids):
   - price: Sold price as number
   - priceCurrency: "USD"
   - name: Vehicle title
   - imageUrl: Main image URL

4. RM SOTHEBY'S PRICE DATA (plain text extraction):
   - sold_price: Final hammer price (e.g., "31200" from "$31,200 USD | Sold")
   - currency: USD, EUR, GBP, or CHF
   - auction_code: Two-letter code + year (e.g., "mo24" = Monterey 2024, "pa25" = Paris 2025)
   - location: Decoded from auction code (e.g., mo = Monterey, pa = Paris, az = Arizona)
   - estimated_date: Approximate date from auction code and known auction calendar

5. Other sources (Collecting Cars, etc.):
   - data-auction-* attributes: pricesold, current-bid, currency-code, auction-end
   - Open Graph: og:title, og:image, og:description

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
- soldPrice: number only, no currency symbols or commas.
  * For Catawiki: Search Next.js Data for lot.currentBid, lot.hammer_price, lot.winning_bid, or parse from Price Texts array
  * For Cars and Bids: Extract from "sold_price" (remove $, commas)
  * For RM Sotheby's: Extract from sold_price in RM SOTHEBY'S PRICE DATA section
  * For others: Use pricesold or current-bid from structured data
- saleDate: YYYY-MM-DD format.
  * For Catawiki: Use lot.auction_end_date or lot.closed_at from Next.js Data
  * For Cars and Bids: Convert MM/DD/YY to YYYY-MM-DD (e.g., "10/21/24" → "2024-10-21")
  * For RM Sotheby's: Use estimated_date from auction code (e.g., "mo24" → "2024-August" → "2024-08-15")
  * For others: Use auction-end from structured data
- currency:
  * For Catawiki: Use lot.currency_code or lot.currency from Next.js Data (usually "EUR")
  * Cars and Bids is always "USD"
  * For RM Sotheby's: Use currency from RM SOTHEBY'S PRICE DATA section (USD, EUR, GBP, or CHF)
  * For others: Use priceCurrency or currency-code
- mileage: number in kilometers. Convert miles to km (multiply by 1.6)
- location: CRITICAL - extract the country/location. Look for:
  * Cars and Bids location format: "City, State" (convert to "United States" or "City, State, United States")
  * RM Sotheby's: Use location from RM SOTHEBY'S AUCTION INFO section (decoded from auction code)
  * "Located in [country]"
  * "Seller location: [city, country]"
  * Auction house location (e.g., "RM Sotheby's Paris" = France)
  * Registration/plates country
  * If US state mentioned (California, Texas, etc.) = "United States"
- imageUrl: main hero image URL, not thumbnails - ALWAYS extract if available
  * For Cars and Bids: Use imageUrl from JSON-LD PRODUCT DATA
  * For Bring a Trailer: ALWAYS use og:image from OPEN GRAPH METADATA section
  * For Collecting Cars: Use main-img-url from structured data or og:image
  * For others: Use og:image from OPEN GRAPH METADATA section
  * This field is REQUIRED if og:image exists in the data
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
      // Extract structured data (data-auction-*, JSON-LD, OG tags) which may be anywhere in the HTML
      const structuredData = extractStructuredData(pageContent)

      // Build content for AI: structured data first (most reliable), then page excerpt
      const aiContent = [
        `Source: ${source}`,
        `URL: ${sourceUrl}`,
        '',
        structuredData ? `${structuredData}\n` : '',
        'PAGE CONTENT (excerpt):',
        pageContent.slice(0, 15000), // Reduce since we have structured data
      ].filter(Boolean).join('\n')

      const response = await this.aiProvider.complete(
        [
          {
            role: 'system',
            content: PARSE_AUCTION_PROMPT,
          },
          {
            role: 'user',
            content: aiContent,
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
