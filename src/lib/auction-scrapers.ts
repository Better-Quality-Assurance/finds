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
      // Extract title from URL path if possible
      const match = url.match(/\/lot\/\d+\/(.+?)\/?$/)
      const title = match ? match[1].replace(/-/g, ' ') : 'Bonhams Lot'

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

    console.log('[Scraper] Bonhams: Navigating to auction results...')
    // Try auction results page which may be more accessible
    await page.goto('https://www.bonhams.com/auctions/results/?department=MOT-CAR', {
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

    // Extract auction lot URLs - Bonhams uses /auction/{id}/lot/{id}/ pattern
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('bonhams.com')) {return false}
          // Match URLs like /auction/29123/lot/123/1965-jaguar-e-type/
          const hasAuctionLot = /\/auction\/\d+\/lot\/\d+/.test(href)
          return hasAuctionLot
        })
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
 * Scrape Silverstone Auctions (now Iconic Auctioneers) sold lots
 * URL: https://www.silverstoneauctions.com/auction/archive-auctions-cars
 * Note: Site is JS-rendered with Vue.js, requires Puppeteer
 */
async function scrapeSilverstoneAuctions(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Silverstone Auctions (Iconic Auctioneers)...')

  const usePuppeteer = process.env.USE_PUPPETEER === 'true'

  if (!usePuppeteer) {
    console.log('[Scraper] Silverstone: Skipping (requires Puppeteer - set USE_PUPPETEER=true)')
    return []
  }

  try {
    // The site is now iconicauctioneers.com and uses Vue.js for rendering
    // silverstoneauctions.com redirects to iconicauctioneers.com
    const urls = await extractUrlsWithPuppeteer(
      'https://www.silverstoneauctions.com/auction/archive-auctions-cars',
      'a[href*="/lot/"]',
      {
        limit: 20,
        timeout: 30000,
      }
    )

    if (urls.length === 0) {
      console.log('[Scraper] Silverstone: No URLs found')
      return []
    }

    // Filter to only lot URLs (exclude navigation, footer, etc.)
    const lotUrls = urls.filter(url => {
      // Lot URLs should contain /lot/ followed by a number or slug
      return /\/lot\/\d+/.test(url) || /\/lot\/[a-z0-9-]+/.test(url)
    })

    return lotUrls.slice(0, 20).map(url => ({
      url,
      title: url.split('/lot/')[1]?.replace(/-/g, ' ')?.replace(/\/$/, '') || 'Silverstone Lot',
      source: 'Silverstone Auctions',
    }))
  } catch (error) {
    console.error('[Scraper] Silverstone Auctions error:', error)
    return []
  }
}

/**
 * Scrape RM Sotheby's results page
 * URL: https://rmsothebys.com/en/results
 */
async function scrapeRMSothebys(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching RM Sotheby\'s...')
  const html = await fetchWithTimeout('https://rmsothebys.com/en/results')
  if (!html) {return []}

  // RM Sotheby's lot URLs look like: /auctions/pt25/lots/n0001-car-description/
  // Note: URLs don't include /en/ in the path, just /auctions/
  const urlPattern = /href="(\/auctions\/[a-z0-9]+\/lots\/[a-z0-9]+-[^"]+)"/gi
  const paths = extractUrls(html, urlPattern)

  const uniquePaths = Array.from(new Set(paths)).slice(0, 20)

  return uniquePaths.map(path => {
    // Extract car description from path: /auctions/pt25/lots/n0001-car-description/
    const lotPart = path.split('/lots/')[1]?.replace(/\/$/, '') || ''
    const title = lotPart.split('-').slice(1).join(' ').replace(/-/g, ' ') || 'RM Sotheby\'s Lot'

    return {
      url: `https://rmsothebys.com${path}`,
      title,
      source: 'RM Sothebys',
    }
  })
}

/**
 * Scrape Artcurial motorcars results
 * URL: https://www.artcurial.com/en/search?specialties=artcurial-motorcars
 */
async function scrapeArtcurial(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Artcurial...')
  const html = await fetchWithTimeout('https://www.artcurial.com/en/search?specialties=artcurial-motorcars')
  if (!html) {return []}

  // Artcurial lot URLs look like: /en/sales/XXXXX/lots/XXX-a
  const urlPattern = /href="(\/en\/sales\/[^"]+\/lots\/[^"]+)"/g
  const paths = extractUrls(html, urlPattern)

  const uniquePaths = Array.from(new Set(paths)).slice(0, 20)

  return uniquePaths.map(path => ({
    url: `https://www.artcurial.com${path}`,
    title: path.split('/lots/')[1]?.replace(/-/g, ' ') || 'Artcurial Lot',
    source: 'Artcurial',
  }))
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

    console.log('[Scraper] Classic Driver: Navigating to sold cars page...')
    await page.goto('https://www.classicdriver.com/en/cars?sale_status=sold', {
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

    // Extract car URLs - Classic Driver uses /en/car/MAKE/MODEL/YEAR/ID pattern
    const urls = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]')
      return Array.from(links)
        .map(link => (link as HTMLAnchorElement).href)
        .filter(href => {
          if (!href || !href.includes('classicdriver.com')) {return false}
          // Match URLs like /en/car/porsche/911/1989/123456
          return href.includes('/en/car/') && href.split('/en/car/')[1]?.split('/').length >= 4
        })
    })

    const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)
    console.log(`[Scraper] Classic Driver: Found ${uniqueUrls.length} URLs`)
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

      // Run Bonhams with stealth mode (403 blocked without it)
      console.log('[Scraper] Scraping Bonhams with stealth...')
      try {
        const bonhamsResult = await scrapeBonhams()
        console.log(`[Scraper] Bonhams: ${bonhamsResult.length} links`)
        results.push(...bonhamsResult)
      } catch (error) {
        console.error('[Scraper] Bonhams failed:', error)
      }

      // Run Silverstone Auctions (Vue.js rendered, needs Puppeteer)
      console.log('[Scraper] Scraping Silverstone Auctions with Puppeteer...')
      try {
        const silverstoneResult = await scrapeSilverstoneAuctions()
        console.log(`[Scraper] Silverstone Auctions: ${silverstoneResult.length} links`)
        results.push(...silverstoneResult)
      } catch (error) {
        console.error('[Scraper] Silverstone Auctions failed:', error)
      }
    } else {
      console.log('[Scraper] Puppeteer disabled (set USE_PUPPETEER=true to enable)')
    }

    // Run RM Sotheby's (simple HTTP, no Puppeteer needed)
    console.log('[Scraper] Scraping RM Sotheby\'s...')
    try {
      const rmSothebysResult = await scrapeRMSothebys()
      console.log(`[Scraper] RM Sotheby's: ${rmSothebysResult.length} links`)
      results.push(...rmSothebysResult)
    } catch (error) {
      console.error('[Scraper] RM Sotheby\'s failed:', error)
    }

    // Run Artcurial (simple HTTP, no Puppeteer needed)
    console.log('[Scraper] Scraping Artcurial...')
    try {
      const artcurialResult = await scrapeArtcurial()
      console.log(`[Scraper] Artcurial: ${artcurialResult.length} links`)
      results.push(...artcurialResult)
    } catch (error) {
      console.error('[Scraper] Artcurial failed:', error)
    }

    // Run Classic Driver (tries simple HTTP first, falls back to Puppeteer)
    console.log('[Scraper] Scraping Classic Driver...')
    try {
      const classicDriverResult = await scrapeClassicDriver()
      console.log(`[Scraper] Classic Driver: ${classicDriverResult.length} links`)
      results.push(...classicDriverResult)
    } catch (error) {
      console.error('[Scraper] Classic Driver failed:', error)
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
  const jsRenderedDomains = ['catawiki.com', 'classicdriver.com']
  const needsPuppeteer = usePuppeteer && jsRenderedDomains.some(domain => url.includes(domain))

  if (needsPuppeteer) {
    return fetchWithPuppeteer(url, {
      waitTime: 3000,
      timeout: 20000,
    })
  }

  return fetchWithTimeout(url, 15000)
}
