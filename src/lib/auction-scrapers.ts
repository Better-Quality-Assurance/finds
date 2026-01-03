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
 * Uses closed auctions to get sold items only
 */
async function scrapeCatawiki(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Catawiki with Puppeteer...')

  try {
    // Use Puppeteer to extract auction URLs from closed auctions
    const urls = await extractUrlsWithPuppeteer(
      'https://www.catawiki.com/en/c/439-classic-cars?show=closed',
      'a[href*="/l/"]',
      {
        limit: 30,
        timeout: 30000,
      }
    )

    if (urls.length === 0) {
      console.log('[Scraper] Catawiki: No URLs found')
      return []
    }

    // Filter to only auction lot URLs and exclude non-car items
    // Catawiki URLs contain item description - filter for car-related terms
    const carKeywords = [
      'porsche', 'ferrari', 'bmw', 'mercedes', 'audi', 'jaguar', 'alfa',
      'fiat', 'lancia', 'maserati', 'lamborghini', 'aston', 'bentley',
      'rolls', 'lotus', 'triumph', 'mg', 'austin', 'ford', 'chevrolet',
      'cadillac', 'buick', 'oldsmobile', 'pontiac', 'dodge', 'plymouth',
      'volkswagen', 'vw', 'opel', 'peugeot', 'citroen', 'renault', 'volvo',
      'saab', 'datsun', 'nissan', 'toyota', 'honda', 'mazda', 'subaru',
      'corvette', 'mustang', 'camaro', 'challenger', 'charger',
      'coupe', 'sedan', 'cabriolet', 'convertible', 'roadster', 'spider',
      'touring', 'estate', 'wagon', 'pickup', 'truck',
    ]

    const auctionUrls = urls.filter(url => {
      if (!/\/l\/\d+/.test(url)) {return false}
      const urlLower = url.toLowerCase()
      return carKeywords.some(keyword => urlLower.includes(keyword))
    })

    console.log(`[Scraper] Catawiki: Filtered ${urls.length} URLs to ${auctionUrls.length} car-related`)

    return auctionUrls.slice(0, 20).map(url => ({
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
    // Use custom Puppeteer logic to handle cookie consent
    const urls = await scrapeCollectingCarsWithCookies()

    if (urls.length === 0) {
      console.log('[Scraper] Collecting Cars: No URLs found')
      return []
    }

    return urls.map(url => ({
      url,
      title: new URL(url).pathname.split('/for-sale/')[1]?.replace(/-/g, ' ') || 'Unknown',
      source: 'Collecting Cars',
    }))
  } catch (error) {
    console.error('[Scraper] Collecting Cars error:', error)
    return []
  }
}

/**
 * Scrape Cars and Bids past auctions (requires Puppeteer with stealth)
 * URL: https://carsandbids.com/past-auctions/
 */
async function scrapeCarsAndBids(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Cars and Bids with Puppeteer stealth...')

  try {
    const urls = await scrapeCarsAndBidsWithStealth()

    if (urls.length === 0) {
      console.log('[Scraper] Cars and Bids: No URLs found')
      return []
    }

    return urls.map(url => ({
      url,
      title: url.split('/auctions/')[1]?.replace(/-/g, ' ') || 'Unknown',
      source: 'Cars and Bids',
    }))
  } catch (error) {
    console.error('[Scraper] Cars and Bids error:', error)
    return []
  }
}

/**
 * Helper to scrape Cars and Bids with stealth mode
 */
async function scrapeCarsAndBidsWithStealth(): Promise<string[]> {
  const puppeteerExtra = await import('puppeteer-extra')
  const StealthPlugin = await import('puppeteer-extra-plugin-stealth')

  puppeteerExtra.default.use(StealthPlugin.default())

  let browser = null

  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH

    browser = await puppeteerExtra.default.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })

    const randomDelay = () => new Promise(r => setTimeout(r, 500 + Math.random() * 1500))

    console.log('[Scraper] Cars and Bids: Navigating to past auctions...')
    await page.goto('https://carsandbids.com/past-auctions/', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await randomDelay()
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Extract auction URLs - Cars and Bids uses /auctions/{slug} pattern
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('carsandbids.com')) {return false}
          // Match URLs like /auctions/2024-toyota-gr86
          return href.includes('/auctions/') && !href.includes('/past-auctions') && href.split('/auctions/')[1]?.length > 5
        })
    })

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)
    console.log(`[Scraper] Cars and Bids: Found ${uniqueUrls.length} URLs`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] Cars and Bids stealth error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Helper to scrape Collecting Cars with stealth mode and realistic user behavior
 */
async function scrapeCollectingCarsWithCookies(): Promise<string[]> {
  // Use puppeteer-extra with stealth plugin to avoid detection
  const puppeteerExtra = await import('puppeteer-extra')
  const StealthPlugin = await import('puppeteer-extra-plugin-stealth')

  puppeteerExtra.default.use(StealthPlugin.default())

  let browser = null

  try {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH

    browser = await puppeteerExtra.default.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })

    // Add realistic delays between actions
    const randomDelay = () => new Promise(r => setTimeout(r, 500 + Math.random() * 1500))

    // Navigate to the sold listings page
    console.log('[Scraper] Collecting Cars: Navigating to sold page...')
    await page.goto('https://collectingcars.com/buy/?refinementList[listingStage][0]=sold', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()

    // Click "Accept all" cookies button if present
    try {
      const acceptButton = await page.$('#cookiesAgree')
      if (acceptButton) {
        // Move mouse to button before clicking (more human-like)
        const box = await acceptButton.boundingBox()
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await randomDelay()
        }
        await acceptButton.click()
        console.log('[Scraper] Collecting Cars: Accepted cookies')
        await randomDelay()
      }
    } catch {
      // Cookie button not found or already accepted
    }

    // Wait for content and scroll to trigger lazy loading
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll down like a real user
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await randomDelay()
    }

    // Wait for any lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Extract all auction URLs - look for /for-sale/ pattern
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('collectingcars.com')) {return false}
          // Match URLs like /for-sale/2021-suzuki-jimny-sierra
          return href.includes('/for-sale/') && href.split('/for-sale/')[1]?.length > 5
        })
    })

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)
    console.log(`[Scraper] Collecting Cars: Found ${uniqueUrls.length} URLs with stealth mode`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] Collecting Cars stealth error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
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
 * - Catawiki, Collecting Cars, Cars and Bids: JavaScript-rendered (Puppeteer) - optional
 *
 * Set USE_PUPPETEER=true env var to enable Puppeteer-based scrapers.
 * Puppeteer requires Chromium dependencies that may not be available on all platforms.
 */
export async function scrapeAllAuctionSites(): Promise<ScrapedAuctionLink[]> {
  const results: ScrapedAuctionLink[] = []
  const usePuppeteer = process.env.USE_PUPPETEER === 'true'

  try {
    // Always run BaT (works without Puppeteer)
    const batResult = await scrapeBringATrailer()
    console.log(`[Scraper] BaT: ${batResult.length} links`)
    results.push(...batResult)

    // Optionally run Puppeteer-based scrapers (sequentially to avoid browser conflicts)
    if (usePuppeteer) {
      console.log('[Scraper] Puppeteer enabled, scraping Catawiki...')

      // Run Catawiki first
      try {
        const catawikiResult = await scrapeCatawiki()
        console.log(`[Scraper] Catawiki: ${catawikiResult.length} links`)
        results.push(...catawikiResult)
      } catch (error) {
        console.error('[Scraper] Catawiki failed:', error)
      }

      // Close first browser before starting second
      await closeBrowser()

      // Then run Collecting Cars with stealth mode
      console.log('[Scraper] Scraping Collecting Cars with stealth...')
      try {
        const collectingCarsResult = await scrapeCollectingCars()
        console.log(`[Scraper] Collecting Cars: ${collectingCarsResult.length} links`)
        results.push(...collectingCarsResult)
      } catch (error) {
        console.error('[Scraper] Collecting Cars failed:', error)
      }

      // Run Cars and Bids with stealth mode (Cloudflare protected)
      console.log('[Scraper] Scraping Cars and Bids with stealth...')
      try {
        const carsAndBidsResult = await scrapeCarsAndBids()
        console.log(`[Scraper] Cars and Bids: ${carsAndBidsResult.length} links`)
        results.push(...carsAndBidsResult)
      } catch (error) {
        console.error('[Scraper] Cars and Bids failed:', error)
      }
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
  const jsRenderedDomains = ['catawiki.com', 'collectingcars.com', 'carsandbids.com']
  const needsPuppeteer = usePuppeteer && jsRenderedDomains.some(domain => url.includes(domain))

  if (needsPuppeteer) {
    return fetchWithPuppeteer(url, {
      waitTime: 3000,
      timeout: 20000,
    })
  }

  return fetchWithTimeout(url, 15000)
}
