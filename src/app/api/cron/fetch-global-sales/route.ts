/**
 * Cron job to fetch global auction sales from external sites
 * Runs daily to collect recent sales from BaT, Catawiki, etc.
 *
 * Uses direct scraping of auction sites' "sold" pages
 * (DuckDuckGo search was blocking us)
 *
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'
import {
  scrapeAllAuctionSites,
  fetchAuctionPage,
  type ScrapedAuctionLink,
} from '@/lib/auction-scrapers'
import {
  createGlobalSalesService,
  AUCTION_SOURCES,
  type ExternalSaleInput,
} from '@/services/ai/global-sales.service'
import { isEuropeanLocation } from '@/lib/duckduckgo-search'

// Force dynamic rendering - this route uses headers and database
export const dynamic = 'force-dynamic'

// Rate limiting: delay between fetches to be respectful
// Cloudflare has 100s timeout. With Puppeteer scrapers taking ~60s,
// we need fast page processing: 5 pages * 1s delay + AI parsing = ~30s remaining
const FETCH_DELAY_MS = 1000
const MAX_PAGES_PER_RUN = 5

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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

    console.log('[CRON] Starting fetch-global-sales job (direct scraping)')

    const globalSalesService = createGlobalSalesService()

    const results = {
      scraped: 0,
      fetched: 0,
      parsed: 0,
      stored: 0,
      skipped: 0,
      errors: 0,
      sources: new Set<string>(),
    }

    // Step 1: Scrape all auction sites for links
    console.log('[CRON] Scraping auction sites for links...')
    const auctionLinks = await scrapeAllAuctionSites()
    results.scraped = auctionLinks.length

    if (auctionLinks.length === 0) {
      console.log('[CRON] No auction links found from scraping')
      return NextResponse.json({
        success: true,
        message: 'No auction links found',
        duration: Date.now() - startTime,
        results: { ...results, sources: [] },
      })
    }

    console.log(`[CRON] Found ${auctionLinks.length} auction links`)

    // Shuffle links to get a mix of sources in each run
    // Fisher-Yates shuffle
    const shuffledLinks = [...auctionLinks]
    for (let i = shuffledLinks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledLinks[i], shuffledLinks[j]] = [shuffledLinks[j], shuffledLinks[i]]
    }

    // Step 2: Process each auction page
    const processedUrls = new Set<string>()

    for (const link of shuffledLinks) {
      if (results.fetched >= MAX_PAGES_PER_RUN) {
        console.log('[CRON] Reached max pages per run, stopping')
        break
      }

      if (processedUrls.has(link.url)) {
        continue
      }
      processedUrls.add(link.url)

      // Find matching source config
      const source = AUCTION_SOURCES.find(s => link.url.includes(s.domain))
      if (!source) {
        console.log(`[CRON] Unknown source for ${link.url}`)
        results.skipped++
        continue
      }

      // Rate limiting
      await sleep(FETCH_DELAY_MS)

      console.log(`[CRON] Fetching: ${link.url}`)

      // Fetch page content
      const pageContent = await fetchAuctionPage(link.url)
      if (!pageContent) {
        results.errors++
        continue
      }
      results.fetched++

      // Parse with AI
      try {
        const parsed = await globalSalesService.parseAuctionPage(
          pageContent,
          link.url,
          source.name
        )

        if (!parsed || !parsed.soldPrice || !parsed.year) {
          console.log(`[CRON] Could not parse auction data from ${link.url}`)
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
          sourceUrl: link.url,
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
      } catch (parseError) {
        console.error(`[CRON] Error parsing ${link.url}:`, parseError)
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
      version: 'v4-shuffled-sources',
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
