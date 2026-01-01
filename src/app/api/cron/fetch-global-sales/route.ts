/**
 * Cron job to fetch global auction sales from external sites
 * Runs daily to collect recent sales from BaT, Catawiki, etc.
 *
 * Uses DuckDuckGo for search (allows scraping unlike Google/Bing)
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'

// Force dynamic rendering - this route uses headers and database
export const dynamic = 'force-dynamic'
import {
  createGlobalSalesService,
  AUCTION_SOURCES,
  type ExternalSaleInput,
} from '@/services/ai/global-sales.service'
import { searchDuckDuckGo, buildSaleSearchQueries, isEuropeanLocation } from '@/lib/duckduckgo-search'

// Rate limiting: delay between fetches to be respectful
const FETCH_DELAY_MS = 2000
const MAX_PAGES_PER_RUN = 20

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch page content with timeout and basic error handling
 */
async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FindsBot/1.0; +https://finds.ro/bot)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[CRON] Failed to fetch ${url}: ${response.status}`)
      return null
    }

    const text = await response.text()
    return text
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[CRON] Timeout fetching ${url}`)
    } else {
      console.error(`[CRON] Error fetching ${url}:`, error)
    }
    return null
  }
}

/**
 * Check if URL is a valid auction result page (not a listing page or category)
 */
function isAuctionResultUrl(url: string): boolean {
  // Bring a Trailer: results have /listing/ in the URL
  if (url.includes('bringatrailer.com')) {
    return url.includes('/listing/') && !url.includes('/listings')
  }

  // Catawiki: auction lots
  if (url.includes('catawiki.com')) {
    return url.includes('/l/') || url.includes('/lots/')
  }

  // RM Sotheby's: lot pages
  if (url.includes('rmsothebys.com')) {
    return url.includes('/lots/') || url.includes('/lot/')
  }

  // Bonhams: lot pages
  if (url.includes('bonhams.com')) {
    return url.includes('/lot/')
  }

  // Artcurial: lot pages
  if (url.includes('artcurial.com')) {
    return url.includes('/lot/')
  }

  // Collecting Cars: auction pages
  if (url.includes('collectingcars.com')) {
    return url.includes('/cars/') || url.includes('/auctions/')
  }

  return false
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const container = getContainer()

    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('[CRON] Unauthorized fetch-global-sales attempt')
      await container.audit.logAuditEvent({
        action: 'CRON_UNAUTHORIZED',
        resourceType: 'CRON',
        details: { job: 'fetch-global-sales', ip: request.ip || 'unknown' },
        severity: 'HIGH',
        status: 'BLOCKED',
      })

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting fetch-global-sales job')

    const globalSalesService = createGlobalSalesService()
    const searchQueries = buildSaleSearchQueries()

    const results = {
      searched: 0,
      fetched: 0,
      parsed: 0,
      stored: 0,
      skipped: 0,
      errors: 0,
      sources: new Set<string>(),
    }

    const processedUrls = new Set<string>()

    // Process each search query
    for (const query of searchQueries) {
      if (results.fetched >= MAX_PAGES_PER_RUN) {
        console.log('[CRON] Reached max pages per run, stopping')
        break
      }

      console.log(`[CRON] Searching: ${query}`)

      try {
        const searchResults = await searchDuckDuckGo(query, { limit: 10 })
        results.searched++

        for (const result of searchResults) {
          if (results.fetched >= MAX_PAGES_PER_RUN) {break}
          if (processedUrls.has(result.url)) {continue}

          // Find matching source
          const source = AUCTION_SOURCES.find(s =>
            result.url.includes(s.domain)
          )
          if (!source) {continue}

          // Check if it's a valid auction result URL
          if (!isAuctionResultUrl(result.url)) {
            results.skipped++
            continue
          }

          processedUrls.add(result.url)

          // Rate limiting
          await sleep(FETCH_DELAY_MS)

          console.log(`[CRON] Fetching: ${result.url}`)

          // Fetch page content
          const pageContent = await fetchPageContent(result.url)
          if (!pageContent) {
            results.errors++
            continue
          }
          results.fetched++

          // Parse with AI
          const parsed = await globalSalesService.parseAuctionPage(
            pageContent,
            result.url,
            source.name
          )

          if (!parsed || !parsed.soldPrice || !parsed.year) {
            console.log(`[CRON] Could not parse auction data from ${result.url}`)
            results.skipped++
            continue
          }
          results.parsed++

          // For global sources, check if location is European
          if (source.requiresLocationCheck) {
            if (!isEuropeanLocation(parsed.location)) {
              console.log(`[CRON] Skipping non-EU sale: ${parsed.title} (${parsed.location || 'no location'})`)
              results.skipped++
              continue
            }
          }

          // Store in database
          const saleInput: ExternalSaleInput = {
            source: source.name,
            sourceUrl: result.url,
            title: parsed.title,
            make: parsed.make,
            model: parsed.model,
            year: parsed.year,
            soldPrice: parsed.soldPrice,
            currency: parsed.currency || 'EUR',
            saleDate: parsed.saleDate ? new Date(parsed.saleDate) : new Date(),
            location: parsed.location || undefined,
            condition: parsed.condition || undefined,
            mileage: parsed.mileage || undefined,
            imageUrl: parsed.imageUrl || undefined,
          }

          const stored = await globalSalesService.storeSale(saleInput)
          if (stored) {
            results.stored++
            results.sources.add(source.name)
            console.log(
              `[CRON] Stored: ${parsed.title} - €${globalSalesService.convertToEur(parsed.soldPrice, parsed.currency || 'EUR')}`
            )
          }
        }
      } catch (error) {
        console.error('[CRON] Error processing query:', query, error)
        results.errors++
      }
    }

    const duration = Date.now() - startTime

    const finalResults = {
      ...results,
      sources: Array.from(results.sources),
    }

    // Log audit event
    await container.audit.logAuditEvent({
      action: 'FETCH_GLOBAL_SALES',
      resourceType: 'CRON',
      details: {
        duration,
        results: finalResults,
      },
      severity: 'LOW',
      status: 'SUCCESS',
    })

    console.log(`[CRON] fetch-global-sales completed in ${duration}ms`, finalResults)

    return NextResponse.json({
      success: true,
      duration,
      results: finalResults,
    })
  } catch (error) {
    console.error('[CRON] fetch-global-sales error:', error)

    const container = getContainer()
    await container.audit.logAuditEvent({
      action: 'FETCH_GLOBAL_SALES',
      resourceType: 'CRON',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      severity: 'HIGH',
      status: 'FAILURE',
    })

    return NextResponse.json(
      { error: 'Failed to fetch global sales' },
      { status: 500 }
    )
  }
}
