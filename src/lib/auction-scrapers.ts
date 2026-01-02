/**
 * Direct Auction Site Scrapers
 *
 * Fetches recently sold items directly from auction sites
 * instead of using search engines (which block scrapers).
 *
 * - BaT: Server-rendered, works with simple HTTP fetch
 * - Catawiki, Collecting Cars: JavaScript-rendered, requires Puppeteer
 */

import {
  extractUrlsWithPuppeteer,
  fetchWithPuppeteer,
  closeBrowser,
} from './puppeteer-scraper'

export interface ScrapedAuctionLink {
  url: string
  title: string
  source: string
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error(`[Scraper] HTTP ${response.status} for ${url}`)
      return null
    }

    return await response.text()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Scraper] Timeout for ${url}`)
    } else {
      console.error(`[Scraper] Error fetching ${url}:`, error)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extract URLs from HTML using regex (works without DOM parser)
 */
function extractUrls(html: string, pattern: RegExp): string[] {
  const matches = Array.from(html.matchAll(pattern))
  return matches.map(m => m[1]).filter(Boolean)
}

/**
 * Scrape Bring a Trailer's completed auctions
 * URL: https://bringatrailer.com/auctions/results/
 */
async function scrapeBringATrailer(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Bring a Trailer...')
  const html = await fetchWithTimeout('https://bringatrailer.com/auctions/results/')
  if (!html) {return []}

  // BaT auction URLs look like: /listing/1989-peugeot-205-gti-1-9/
  const urlPattern = /href="(https:\/\/bringatrailer\.com\/listing\/[^"]+)"/g
  const urls = extractUrls(html, urlPattern)

  // Get unique URLs, limit to first 20
  const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)

  return uniqueUrls.map(url => ({
    url,
    title: url.split('/listing/')[1]?.replace(/-/g, ' ')?.replace(/\/$/, '') || 'Unknown',
    source: 'Bring a Trailer',
  }))
}

/**
 * Scrape Catawiki's classic cars category (requires Puppeteer)
 * URL: https://www.catawiki.com/en/c/439-classic-cars
 */
async function scrapeCatawiki(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Catawiki with Puppeteer...')

  try {
    // Use Puppeteer to extract auction URLs
    // Don't wait for specific selector - just let the page fully load
    const urls = await extractUrlsWithPuppeteer(
      'https://www.catawiki.com/en/c/439-classic-cars',
      'a[href*="/l/"]', // Selector for auction links (more generic)
      {
        // No waitForSelector - just wait for network idle
        limit: 20,
        timeout: 30000,
      }
    )

    if (urls.length === 0) {
      console.log('[Scraper] Catawiki: No URLs found')
      return []
    }

    // Filter to only auction lot URLs (contains /l/ followed by digits)
    const auctionUrls = urls.filter(url => /\/l\/\d+/.test(url))

    return auctionUrls.map(url => ({
      url,
      title: url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown',
      source: 'Catawiki',
    }))
  } catch (error) {
    console.error('[Scraper] Catawiki error:', error)
    return []
  }
}

/**
 * Scrape Collecting Cars completed auctions (requires Puppeteer)
 * URL: https://collectingcars.com/search?status=Sold
 */
async function scrapeCollectingCars(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Collecting Cars with Puppeteer...')

  try {
    // Use Puppeteer to extract auction URLs
    // Don't wait for specific selector - just let the page fully load
    const urls = await extractUrlsWithPuppeteer(
      'https://collectingcars.com/search?status=Sold',
      'a[href*="/car/"]', // Selector for car listing links
      {
        // No waitForSelector - just wait for network idle
        limit: 20,
        timeout: 30000,
      }
    )

    if (urls.length === 0) {
      console.log('[Scraper] Collecting Cars: No URLs found')
      return []
    }

    // Filter to only car listing URLs (contains /car/ followed by year or slug)
    const carUrls = urls.filter(url => {
      try {
        const path = new URL(url).pathname
        return path.startsWith('/car/') && !path.includes('auction') && path.length > 6
      } catch {
        return false
      }
    })

    return carUrls.map(url => ({
      url,
      title: new URL(url).pathname.split('/car/')[1]?.replace(/-/g, ' ') || 'Unknown',
      source: 'Collecting Cars',
    }))
  } catch (error) {
    console.error('[Scraper] Collecting Cars error:', error)
    return []
  }
}

/**
 * Scrape Bonhams motoring auctions
 */
async function scrapeBonhams(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Bonhams...')
  const html = await fetchWithTimeout('https://www.bonhams.com/department/MOT-CAR/')
  if (!html) {return []}

  // Bonhams lot URLs: /auction/XXXXX/lot/XXXXX/
  const urlPattern = /href="(\/auction\/\d+\/lot\/\d+[^"]*)"/g
  const paths = extractUrls(html, urlPattern)

  const uniquePaths = Array.from(new Set(paths)).slice(0, 20)

  return uniquePaths.map(path => ({
    url: `https://www.bonhams.com${path}`,
    title: 'Bonhams Lot',
    source: 'Bonhams',
  }))
}

/**
 * Main function to scrape all auction sites
 *
 * - BaT: Server-rendered (simple HTTP fetch) - always works
 * - Catawiki, Collecting Cars: JavaScript-rendered (Puppeteer) - optional
 *
 * Set USE_PUPPETEER=true env var to enable Puppeteer-based scrapers.
 * Puppeteer requires Chromium dependencies that may not be available on all platforms.
 */
export async function scrapeAllAuctionSites(): Promise<ScrapedAuctionLink[]> {
  const results: ScrapedAuctionLink[] = []
  const usePuppeteer = process.env.USE_PUPPETEER === 'true'

  console.log(`[Scraper] USE_PUPPETEER=${process.env.USE_PUPPETEER}, enabled=${usePuppeteer}`)

  try {
    // Always run BaT (works without Puppeteer)
    const batResult = await scrapeBringATrailer()
    console.log(`[Scraper] BaT: ${batResult.length} links`)
    results.push(...batResult)

    // Optionally run Puppeteer-based scrapers
    if (usePuppeteer) {
      console.log('[Scraper] Puppeteer enabled, scraping Catawiki...')
      const [catawiki, collectingCars] = await Promise.allSettled([
        scrapeCatawiki(),
        scrapeCollectingCars(),
      ])

      if (catawiki.status === 'fulfilled') {
        console.log(`[Scraper] Catawiki: ${catawiki.value.length} links`)
        results.push(...catawiki.value)
      } else {
        console.error('[Scraper] Catawiki failed:', catawiki.reason)
      }

      if (collectingCars.status === 'fulfilled') {
        console.log(`[Scraper] Collecting Cars: ${collectingCars.value.length} links`)
        results.push(...collectingCars.value)
      } else {
        console.error('[Scraper] Collecting Cars failed:', collectingCars.reason)
      }

      // Close browser when done
      await closeBrowser()
    } else {
      console.log('[Scraper] Puppeteer disabled (set USE_PUPPETEER=true to enable)')
    }

    console.log(`[Scraper] Total links found: ${results.length}`)
    return results
  } catch (error) {
    console.error('[Scraper] Error:', error)
    // Make sure browser is closed even on error
    if (usePuppeteer) {
      await closeBrowser().catch(() => {})
    }
    return results
  }
}

/**
 * Fetch content from a single auction page
 * Uses Puppeteer for JS-rendered sites when enabled, simple HTTP for others
 */
export async function fetchAuctionPage(url: string): Promise<string | null> {
  const usePuppeteer = process.env.USE_PUPPETEER === 'true'

  // Check if URL requires Puppeteer (JS-rendered sites)
  const jsRenderedDomains = ['catawiki.com', 'collectingcars.com']
  const needsPuppeteer = usePuppeteer && jsRenderedDomains.some(domain => url.includes(domain))

  if (needsPuppeteer) {
    return fetchWithPuppeteer(url, {
      waitTime: 3000,
      timeout: 20000,
    })
  }

  return fetchWithTimeout(url, 15000)
}
