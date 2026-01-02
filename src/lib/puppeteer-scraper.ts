/**
 * Puppeteer-based scraper for JavaScript-rendered auction sites
 *
 * Used for sites like Catawiki and Collecting Cars that require
 * JavaScript execution to render their content.
 */

import puppeteer, { Browser, Page } from 'puppeteer'

let browserInstance: Browser | null = null

/**
 * Get or create a browser instance (reused for efficiency)
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('[Puppeteer] Launching browser...')

    // Use system Chromium if available (set via PUPPETEER_EXECUTABLE_PATH)
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH

    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--single-process', // Helps with resource constraints
      ],
    })
    console.log('[Puppeteer] Browser launched successfully')
  }
  return browserInstance
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
    console.log('[Puppeteer] Browser closed')
  }
}

/**
 * Fetch a page with JavaScript rendering
 */
export async function fetchWithPuppeteer(
  url: string,
  options: {
    waitForSelector?: string
    waitTime?: number
    timeout?: number
  } = {}
): Promise<string | null> {
  const { waitForSelector, waitTime = 3000, timeout = 30000 } = options

  let page: Page | null = null

  try {
    const browser = await getBrowser()
    page = await browser.newPage()

    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    })

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeout / 2 })
    } else {
      // Otherwise wait a bit for dynamic content
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    // Get the fully rendered HTML
    const html = await page.content()
    return html
  } catch (error) {
    console.error(`[Puppeteer] Error fetching ${url}:`, error)
    return null
  } finally {
    if (page) {
      await page.close()
    }
  }
}

/**
 * Extract URLs from a JavaScript-rendered page
 */
export async function extractUrlsWithPuppeteer(
  url: string,
  linkSelector: string,
  options: {
    waitForSelector?: string
    limit?: number
    timeout?: number
  } = {}
): Promise<string[]> {
  const { waitForSelector, limit = 20, timeout = 30000 } = options

  let page: Page | null = null

  try {
    const browser = await getBrowser()
    page = await browser.newPage()

    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    })

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeout / 2 })
    } else {
      // Wait longer for JS-rendered content (5 seconds)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    // Extract URLs using the provided selector
    const urls = await page.evaluate((selector: string) => {
      const links = document.querySelectorAll(selector)
      return Array.from(links)
        .map((link) => (link as HTMLAnchorElement).href)
        .filter((href) => href && href.startsWith('http'))
    }, linkSelector)

    // Return unique URLs, limited
    const uniqueUrls = Array.from(new Set(urls)).slice(0, limit)
    return uniqueUrls
  } catch (error) {
    console.error(`[Puppeteer] Error extracting URLs from ${url}:`, error)
    return []
  } finally {
    if (page) {
      await page.close()
    }
  }
}
