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
 * Uses proper category filter (object_type=1167) to get only cars, not memorabilia
 */
async function scrapeCatawiki(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Catawiki with Puppeteer...')

  try {
    // Use category 423 with object_type filter for actual cars (not memorabilia)
    // Adding show=closed to get sold auctions only
    const urls = await extractUrlsWithPuppeteer(
      'https://www.catawiki.com/en/c/423-classic-cars?filters=object_type%5B%5D=1167&show=closed',
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
      // European makes
      'porsche', 'ferrari', 'bmw', 'mercedes', 'audi', 'jaguar', 'alfa',
      'fiat', 'lancia', 'maserati', 'lamborghini', 'aston', 'bentley',
      'rolls', 'royce', 'lotus', 'triumph', 'mg', 'austin', 'healey',
      'volkswagen', 'vw', 'opel', 'peugeot', 'citroen', 'renault', 'volvo',
      'saab', 'mini', 'morgan', 'tvr', 'detomaso', 'de-tomaso', 'iso',
      'bizzarrini', 'intermeccanica', 'monteverdi', 'facel', 'delahaye',
      'bugatti', 'talbot', 'panhard', 'simca', 'autobianchi', 'innocenti',
      'daimler', 'jensen', 'sunbeam', 'reliant', 'bristol', 'ac', 'alvis',
      // American makes
      'ford', 'chevrolet', 'chevy', 'cadillac', 'buick', 'oldsmobile',
      'pontiac', 'dodge', 'plymouth', 'chrysler', 'lincoln', 'mercury',
      'amc', 'rambler', 'studebaker', 'packard', 'hudson', 'nash',
      'jeep', 'land-rover', 'landrover', 'hummer',
      // Japanese
      'datsun', 'nissan', 'toyota', 'honda', 'mazda', 'subaru',
      'mitsubishi', 'suzuki', 'isuzu', 'lexus', 'infiniti', 'acura',
      // Korean
      'hyundai', 'kia', 'genesis',
      // Model names / icons
      'corvette', 'mustang', 'camaro', 'challenger', 'charger', 'firebird',
      'thunderbird', 'shelby', 'cobra', 'viper', 'supra', 'skyline', 'gtr',
      '911', '356', '944', '928', 'testarossa', 'countach', 'miura', 'esprit',
      // Performance / trim
      'amg', 'gti', 'gtb', 'gts', 'gt3', 'gt2', 'turbo', 'supercharged',
      'm3', 'm5', 'm6', 'rs', 'alpina',
      // Body types
      'coupe', 'sedan', 'saloon', 'cabriolet', 'convertible', 'roadster',
      'spider', 'spyder', 'targa', 'touring', 'estate', 'wagon', 'kombi',
      'pickup', 'truck', 'suv', 'hatchback', 'limousine', 'landaulet',
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
          if (!href.includes('/for-sale/') || (href.split('/for-sale/')[1]?.length || 0) <= 5) {return false}
          // Exclude number plates and memorabilia
          const slug = href.toLowerCase()
          if (slug.includes('number-plate') || slug.includes('numberplate')) {return false}
          if (slug.includes('memorabilia') || slug.includes('artwork') || slug.includes('poster')) {return false}
          return true
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
 * Scrape Bonhams motoring auctions with stealth mode
 */
async function scrapeBonhams(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Bonhams with Puppeteer stealth...')

  try {
    const urls = await scrapeBonhamsWithStealth()

    if (urls.length === 0) {
      console.log('[Scraper] Bonhams: No URLs found')
      return []
    }

    return urls.map(url => {
      // Extract title from URL path: /auction/ID/preview-lot/ID/title-slug/
      const match = url.match(/\/(lot|preview-lot)\/\d+\/(.+?)\/?$/)
      const title = match ? match[2].replace(/-/g, ' ') : 'Bonhams Lot'

      return {
        url,
        title,
        source: 'Bonhams',
      }
    })
  } catch (error) {
    console.error('[Scraper] Bonhams error:', error)
    return []
  }
}

/**
 * Helper to scrape Bonhams with stealth mode to bypass 403 blocking
 * Note: Bonhams moved car auctions to cars.bonhams.com
 */
async function scrapeBonhamsWithStealth(): Promise<string[]> {
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

    console.log('[Scraper] Bonhams: Navigating to cars.bonhams.com...')
    // Bonhams moved car auctions to cars.bonhams.com - /cars/ shows individual lots
    await page.goto('https://cars.bonhams.com/cars/', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll more to trigger lazy loading (site loads content on scroll)
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Extract auction lot URLs - cars.bonhams.com uses anchor tags with /preview-lot/ pattern
    const urls = await page.evaluate(() => {
      const results: string[] = []
      const links = document.querySelectorAll('a[href]')
      Array.from(links).forEach(link => {
        const href = (link as HTMLAnchorElement).href
        if (href && href.includes('cars.bonhams.com')) {
          // Match /auction/ID/lot/ID or /auction/ID/preview-lot/ID patterns
          if (/\/auction\/\d+\/(lot|preview-lot)\/\d+/.test(href)) {
            results.push(href)
          }
        }
      })
      return results
    })

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)
    console.log(`[Scraper] Bonhams: Found ${uniqueUrls.length} URLs`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] Bonhams stealth error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Helper to scrape Iconic Auctioneers with Puppeteer
 * Two-step process: get auction events, then get lots from first event
 */
async function scrapeIconicAuctioneersWithPuppeteer(): Promise<string[]> {
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

    // Step 1: Get auction event URLs from archive
    console.log('[Scraper] Iconic Auctioneers: Getting auction events...')
    await page.goto('https://www.iconicauctioneers.com/auction/archive-auctions-cars', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Get auction event URLs (format: /the-xxx-sale-xxx/YYYY-MM-DD/ipp-100)
    const auctionEventUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href.includes('iconicauctioneers.com')) {return false}
          // Match auction result pages: /the-xxx/YYYY-MM-DD/ipp-100
          return /\/the-[a-z0-9-]+\/\d{4}-\d{2}-\d{2}\/ipp-\d+/.test(href)
        })
    })

    if (auctionEventUrls.length === 0) {
      console.log('[Scraper] Iconic Auctioneers: No auction events found')
      return []
    }

    console.log(`[Scraper] Iconic Auctioneers: Found ${auctionEventUrls.length} auction events`)

    // Step 2: Visit first auction event to get individual lot URLs
    const firstAuction = auctionEventUrls[0]
    console.log('[Scraper] Iconic Auctioneers: Visiting auction event...')
    try {
      await page.goto(firstAuction, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      })
    } catch (navError) {
      // Page may redirect or have frame issues - try waiting for content anyway
      console.log('[Scraper] Iconic Auctioneers: Navigation warning, continuing...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    await randomDelay()
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll to load more lots
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await randomDelay()
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get individual lot URLs (format: /YYYY-make-model-lotcode-location-date)
    const lotUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href.includes('iconicauctioneers.com')) {return false}
          const path = new URL(href).pathname
          // Match lot URLs: /YYYY-make-model-xxx (starts with year)
          return /^\/(?:19|20)\d{2}-[a-z0-9]+-/.test(path)
        })
    })

    const uniqueUrls = Array.from(new Set(lotUrls)).slice(0, 20)
    console.log(`[Scraper] Iconic Auctioneers: Found ${uniqueUrls.length} lot URLs`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] Iconic Auctioneers Puppeteer error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Scrape Iconic Auctioneers (formerly Silverstone Auctions) sold lots
 * Strategy:
 * 1. Get auction event URLs from archive page
 * 2. Visit first auction event to get individual lot URLs
 * Note: Site is JS-rendered with Vue.js, requires Puppeteer
 */
async function scrapeSilverstoneAuctions(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Iconic Auctioneers (formerly Silverstone Auctions)...')

  const usePuppeteer = process.env.USE_PUPPETEER === 'true'

  if (!usePuppeteer) {
    console.log('[Scraper] Iconic Auctioneers: Skipping (requires Puppeteer - set USE_PUPPETEER=true)')
    return []
  }

  try {
    const lotUrls = await scrapeIconicAuctioneersWithPuppeteer()

    if (lotUrls.length === 0) {
      console.log('[Scraper] Iconic Auctioneers: No lot URLs found')
      return []
    }

    console.log(`[Scraper] Iconic Auctioneers: Found ${lotUrls.length} vehicle lots`)

    return lotUrls.slice(0, 20).map(url => {
      // Extract year-make-model from URL for title
      const path = new URL(url).pathname.replace(/^\//, '')
      const parts = path.split('-')
      const year = parts[0]
      const make = parts[1]
      const model = parts[2]
      const title = `${year} ${make} ${model}`.replace(/-/g, ' ')

      return {
        url,
        title,
        source: 'Iconic Auctioneers',
      }
    })
  } catch (error) {
    console.error('[Scraper] Iconic Auctioneers error:', error)
    return []
  }
}

/**
 * Scrape RM Sotheby's results page (requires Puppeteer - Angular app)
 * URL: https://rmsothebys.com/en/results
 */
async function scrapeRMSothebys(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching RM Sotheby\'s with Puppeteer...')

  const usePuppeteer = process.env.USE_PUPPETEER === 'true'
  if (!usePuppeteer) {
    console.log('[Scraper] RM Sotheby\'s: Skipping (requires Puppeteer)')
    return []
  }

  try {
    const urls = await scrapeRMSothebysWithPuppeteer()

    if (urls.length === 0) {
      console.log('[Scraper] RM Sotheby\'s: No URLs found')
      return []
    }

    return urls.map(url => {
      // Extract car description from path: /auctions/pt25/lots/n0001-car-description/
      const lotPart = url.split('/lots/')[1]?.replace(/\/$/, '') || ''
      const title = lotPart.split('-').slice(1).join(' ').replace(/-/g, ' ') || 'RM Sotheby\'s Lot'

      return {
        url,
        title,
        source: 'RM Sothebys',
      }
    })
  } catch (error) {
    console.error('[Scraper] RM Sotheby\'s error:', error)
    return []
  }
}

/**
 * Helper to scrape RM Sotheby's with Puppeteer (Angular app needs JS rendering)
 */
async function scrapeRMSothebysWithPuppeteer(): Promise<string[]> {
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

    console.log('[Scraper] RM Sotheby\'s: Navigating to results page...')
    await page.goto('https://rmsothebys.com/en/results', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()

    // Wait for Angular app to load
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await randomDelay()
    }

    await new Promise(resolve => setTimeout(resolve, 3000))

    // Extract lot URLs - RM Sotheby's uses /auctions/{auction-id}/lots/{lot-id}-{description}/ pattern
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('rmsothebys.com')) {return false}
          // Match URLs like /auctions/pt25/lots/n0001-1965-ferrari-275/
          return /\/auctions\/[a-z0-9]+\/lots\/[a-z0-9]+-/.test(href)
        })
    })

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)
    console.log(`[Scraper] RM Sotheby's: Found ${uniqueUrls.length} URLs`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] RM Sotheby\'s Puppeteer error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Scrape Artcurial motorcars results with Puppeteer
 * - French auction house with major classic car sales
 * - Filters to "Artcurial Motorcars" department only
 * - Site is Nuxt/Vue.js - requires Puppeteer for JS rendering
 */
async function scrapeArtcurial(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Artcurial Motorcars with Puppeteer...')

  const usePuppeteer = process.env.USE_PUPPETEER === 'true'
  if (!usePuppeteer) {
    console.log('[Scraper] Artcurial: Skipping (requires Puppeteer - set USE_PUPPETEER=true)')
    return []
  }

  try {
    const urls = await scrapeArtcurialWithPuppeteer()

    if (urls.length === 0) {
      console.log('[Scraper] Artcurial: No car sale URLs found')
      return []
    }

    return urls.map(url => {
      // Extract sale info from URL: /en/sales/6446 or /en/sales/vente-fr-6446-automobile-legends
      const saleId = url.match(/\/sales\/(?:vente-fr-)?(\d+)/)?.[1] || 'unknown'
      const title = url.split('/').pop()?.replace(/-/g, ' ')?.replace(/vente fr \d+ /, '') || `Artcurial Sale ${saleId}`

      return {
        url,
        title,
        source: 'Artcurial Motorcars',
      }
    })
  } catch (error) {
    console.error('[Scraper] Artcurial error:', error)
    return []
  }
}

/**
 * Helper to scrape Artcurial motorcars with Puppeteer
 * Strategy:
 * 1. Navigate to Artcurial Motorcars specialty page
 * 2. Look for past/upcoming car sales only
 * 3. Extract sale URLs (not individual lots - too many)
 * 4. Filter out non-car departments (art, jewelry, wine, etc.)
 */
async function scrapeArtcurialWithPuppeteer(): Promise<string[]> {
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

    console.log('[Scraper] Artcurial: Navigating to motorcars results...')

    // Try motorcars specialty page first
    await page.goto('https://www.artcurial.com/en/specialties/artcurial-motorcars', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()

    // Wait for Vue.js app to render
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll to load lazy content
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 500))
      await randomDelay()
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    // Extract sale URLs - look for /sales/ pattern
    let urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('artcurial.com')) {return false}
          // Match sales URLs like /en/sales/6446 or /en/sales/vente-fr-6446-automobile-legends
          return /\/sales\/(?:vente-fr-)?\d+/.test(href)
        })
    })

    // If no results from specialty page, try results page with motorcars context
    if (urls.length === 0) {
      console.log('[Scraper] Artcurial: No sales on specialty page, trying schedule...')

      await page.goto('https://www.artcurial.com/en/schedule-auctions-sales', {
        waitUntil: 'networkidle2',
        timeout: 45000,
      })

      await randomDelay()
      await new Promise(resolve => setTimeout(resolve, 3000))

      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 500))
        await randomDelay()
      }

      await new Promise(resolve => setTimeout(resolve, 2000))

      // Extract sales and filter for car-related keywords
      urls = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href]')
        const carKeywords = [
          'automobile', 'motorcars', 'car', 'voiture', 'auto',
          'porsche', 'ferrari', 'mercedes', 'jaguar', 'alfa',
          'maserati', 'bugatti', 'aston', 'bentley', 'rolls',
          'legend', 'racing', 'formula', 'grand prix', 'sport',
        ]

        return Array.from(links)
          .filter(link => {
            const href = (link as HTMLAnchorElement).href
            if (!href || !href.includes('artcurial.com')) {return false}
            if (!/\/sales\/(?:vente-fr-)?\d+/.test(href)) {return false}

            // Check link text and href for car keywords
            const text = (link as HTMLAnchorElement).textContent?.toLowerCase() || ''
            const url = href.toLowerCase()

            return carKeywords.some(keyword =>
              text.includes(keyword) || url.includes(keyword)
            )
          })
          .map(link => (link as HTMLAnchorElement).href)
      })
    }

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 10)
    console.log(`[Scraper] Artcurial: Found ${uniqueUrls.length} motorcar sale URLs`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] Artcurial Puppeteer error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Scrape Classic Driver sold cars (requires Puppeteer with stealth)
 * URL: https://www.classicdriver.com/en/cars?sale_status=sold
 */
async function scrapeClassicDriver(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Classic Driver with Puppeteer stealth...')

  try {
    const urls = await scrapeClassicDriverWithStealth()

    if (urls.length === 0) {
      console.log('[Scraper] Classic Driver: No URLs found')
      return []
    }

    return urls.map(url => {
      // Extract make/model from URL: /en/car/MAKE/MODEL/YEAR/ID
      const urlObj = new URL(url)
      const parts = urlObj.pathname.split('/').filter(Boolean)
      const make = parts[2] || ''
      const model = parts[3] || ''
      const year = parts[4] || ''

      return {
        url,
        title: `${make} ${model} ${year}`.trim() || 'Classic Driver Listing',
        source: 'Classic Driver',
      }
    })
  } catch (error) {
    console.error('[Scraper] Classic Driver error:', error)
    return []
  }
}

/**
 * Helper to scrape Classic Driver with stealth mode
 */
async function scrapeClassicDriverWithStealth(): Promise<string[]> {
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

    // Classic Driver doesn't have a public sold archive, but has active marketplace and auctions
    // Strategy: scrape both active marketplace listings and auction lots
    const allUrls: string[] = []

    // 1. Scrape active marketplace listings (recent additions)
    console.log('[Scraper] Classic Driver: Navigating to marketplace...')
    await page.goto('https://www.classicdriver.com/en/cars?sort=newest', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await randomDelay()
    }

    // Extract car URLs - Classic Driver uses /en/car/MAKE/MODEL/YEAR/ID pattern
    const marketplaceUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('classicdriver.com')) {return false}
          // Match URLs like /en/car/porsche/911-964-carrera/1994/627065
          return href.includes('/en/car/') && href.split('/en/car/')[1]?.split('/').length >= 4
        })
    })

    allUrls.push(...marketplaceUrls)
    console.log(`[Scraper] Classic Driver: Found ${marketplaceUrls.length} marketplace URLs`)

    // 2. Scrape auction lots
    await randomDelay()
    console.log('[Scraper] Classic Driver: Navigating to auction lots...')
    await page.goto('https://www.classicdriver.com/en/auctions-search?sort=newest', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    })

    await randomDelay()
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800))
      await randomDelay()
    }

    // Extract auction lot URLs - may use /en/lot/ or /en/car/ pattern
    const auctionUrls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('classicdriver.com')) {return false}
          // Match auction lots and car URLs
          return (href.includes('/en/lot/') || href.includes('/en/car/')) &&
                 href.match(/\d{6,}/) // Contains 6+ digit ID
        })
    })

    allUrls.push(...auctionUrls)
    console.log(`[Scraper] Classic Driver: Found ${auctionUrls.length} auction URLs`)

    const uniqueUrls = Array.from(new Set(allUrls)).slice(0, 20)
    console.log(`[Scraper] Classic Driver: Total ${uniqueUrls.length} unique URLs`)
    return uniqueUrls
  } catch (error) {
    console.error('[Scraper] Classic Driver stealth error:', error)
    return []
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}


/**
 * Main function to scrape all auction sites
 *
 * - BaT: Server-rendered (simple HTTP fetch) - always works
 * - Catawiki, Collecting Cars, Cars and Bids, Bonhams: JavaScript-rendered or bot-protected (Puppeteer with stealth) - optional
 *
 * Set USE_PUPPETEER=true env var to enable Puppeteer-based scrapers.
 * Puppeteer requires Chromium dependencies that may not be available on all platforms.
 */
export async function scrapeAllAuctionSites(): Promise<ScrapedAuctionLink[]> {
  const results: ScrapedAuctionLink[] = []
  const usePuppeteer = process.env.USE_PUPPETEER === 'true'
  // Limit Puppeteer scrapers per run to avoid timeout (each takes 15-30s)
  const maxPuppeteerScrapers = 6

  try {
    // Always run BaT (works without Puppeteer)
    const batResult = await scrapeBringATrailer()
    console.log(`[Scraper] BaT: ${batResult.length} links`)
    results.push(...batResult)

    // Optionally run Puppeteer-based scrapers (sequentially to avoid browser conflicts)
    // Randomly pick 2 scrapers per run to get variety while staying under timeout
    if (usePuppeteer) {
      // Priority scrapers - always run these first (known to work)
      const priorityScrapers = [
        { name: 'Collecting Cars', fn: scrapeCollectingCars },
        { name: 'Cars and Bids', fn: scrapeCarsAndBids },
      ]

      // Secondary scrapers - randomly pick from these
      const secondaryScrapers = [
        { name: 'Catawiki', fn: scrapeCatawiki },
        { name: 'RM Sothebys', fn: scrapeRMSothebys },
        { name: 'Artcurial Motorcars', fn: scrapeArtcurial },
        { name: 'Bonhams', fn: scrapeBonhams },
        { name: 'Iconic Auctioneers', fn: scrapeSilverstoneAuctions },
        { name: 'Classic Driver', fn: scrapeClassicDriver },
      ]

      // Shuffle secondary scrapers
      for (let i = secondaryScrapers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[secondaryScrapers[i], secondaryScrapers[j]] = [secondaryScrapers[j], secondaryScrapers[i]]
      }

      // Combine: all priority + remaining secondary up to limit
      const puppeteerScrapers = [
        ...priorityScrapers,
        ...secondaryScrapers.slice(0, maxPuppeteerScrapers - priorityScrapers.length),
      ]

      const selectedScrapers = puppeteerScrapers.slice(0, maxPuppeteerScrapers)
      console.log(`[Scraper] Running ${selectedScrapers.length} Puppeteer scrapers: ${selectedScrapers.map(s => s.name).join(', ')}`)

      for (const scraper of selectedScrapers) {
        console.log(`[Scraper] Scraping ${scraper.name}...`)
        try {
          const scraperResult = await scraper.fn()
          console.log(`[Scraper] ${scraper.name}: ${scraperResult.length} links`)
          results.push(...scraperResult)
        } catch (error) {
          console.error(`[Scraper] ${scraper.name} failed:`, error)
        }
        // Close browser between scrapers
        await closeBrowser()
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
 * Fetch page content using Puppeteer with stealth mode (for Cloudflare-protected sites)
 */
async function fetchWithStealth(url: string): Promise<string | null> {
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
      ],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait for content
    await new Promise(resolve => setTimeout(resolve, 3000))

    const html = await page.content()
    return html
  } catch (error) {
    console.error(`[Scraper] Stealth fetch error for ${url}:`, error)
    return null
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Fetch content from a single auction page
 * Uses Puppeteer for JS-rendered sites when enabled, simple HTTP for others
 */
export async function fetchAuctionPage(url: string): Promise<string | null> {
  const usePuppeteer = process.env.USE_PUPPETEER === 'true'

  // Sites that need stealth mode (Cloudflare protected or bot-blocked)
  const stealthDomains = ['carsandbids.com', 'collectingcars.com', 'bonhams.com']
  const needsStealth = usePuppeteer && stealthDomains.some(domain => url.includes(domain))

  if (needsStealth) {
    return fetchWithStealth(url)
  }

  // Sites that just need JS rendering (no Cloudflare)
  const jsRenderedDomains = ['catawiki.com', 'classicdriver.com', 'rmsothebys.com']
  const needsPuppeteer = usePuppeteer && jsRenderedDomains.some(domain => url.includes(domain))

  if (needsPuppeteer) {
    return fetchWithPuppeteer(url, {
      waitTime: 3000,
      timeout: 20000,
    })
  }

  return fetchWithTimeout(url, 15000)
}
