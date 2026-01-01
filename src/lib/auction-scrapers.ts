/**
 * Direct Auction Site Scrapers
 *
 * Fetches recently sold items directly from auction sites
 * instead of using search engines (which block scrapers).
 */

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
 * Scrape Catawiki's classic cars category
 * URL: https://www.catawiki.com/en/c/439-cars
 */
async function scrapeCatawiki(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Catawiki...')
  const html = await fetchWithTimeout('https://www.catawiki.com/en/c/439-classic-cars')
  if (!html) {return []}

  // Catawiki auction URLs: /en/l/XXXXX-title
  const urlPattern = /href="(\/en\/l\/\d+-[^"]+)"/g
  const paths = extractUrls(html, urlPattern)

  const uniquePaths = Array.from(new Set(paths)).slice(0, 20)

  return uniquePaths.map(path => ({
    url: `https://www.catawiki.com${path}`,
    title: path.split('/').pop()?.replace(/-/g, ' ') || 'Unknown',
    source: 'Catawiki',
  }))
}

/**
 * Scrape Collecting Cars completed auctions
 * URL: https://collectingcars.com/search?status=Sold
 */
async function scrapeCollectingCars(): Promise<ScrapedAuctionLink[]> {
  console.log('[Scraper] Fetching Collecting Cars...')
  const html = await fetchWithTimeout('https://collectingcars.com/search?status=Sold')
  if (!html) {return []}

  // Collecting Cars URLs: /car/title-slug
  const urlPattern = /href="(\/car\/[^"]+)"/g
  const paths = extractUrls(html, urlPattern)

  const uniquePaths = Array.from(new Set(paths)).slice(0, 20)

  return uniquePaths.map(path => ({
    url: `https://collectingcars.com${path}`,
    title: path.split('/car/')[1]?.replace(/-/g, ' ') || 'Unknown',
    source: 'Collecting Cars',
  }))
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
 */
export async function scrapeAllAuctionSites(): Promise<ScrapedAuctionLink[]> {
  const results: ScrapedAuctionLink[] = []

  // Run scrapers in parallel
  const [bat, catawiki, collectingCars, bonhams] = await Promise.allSettled([
    scrapeBringATrailer(),
    scrapeCatawiki(),
    scrapeCollectingCars(),
    scrapeBonhams(),
  ])

  if (bat.status === 'fulfilled') {
    console.log(`[Scraper] BaT: ${bat.value.length} links`)
    results.push(...bat.value)
  } else {
    console.error('[Scraper] BaT failed:', bat.reason)
  }

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

  if (bonhams.status === 'fulfilled') {
    console.log(`[Scraper] Bonhams: ${bonhams.value.length} links`)
    results.push(...bonhams.value)
  } else {
    console.error('[Scraper] Bonhams failed:', bonhams.reason)
  }

  console.log(`[Scraper] Total links found: ${results.length}`)
  return results
}

/**
 * Fetch content from a single auction page
 */
export async function fetchAuctionPage(url: string): Promise<string | null> {
  return fetchWithTimeout(url, 15000)
}
