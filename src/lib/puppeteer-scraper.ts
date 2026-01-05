/**
 * Puppeteer-based scraper for JavaScript-rendered auction sites
 *
 * Used for sites like Catawiki and Collecting Cars that require
 * JavaScript execution to render their content.
 *
 * Uses @sparticuz/chromium for serverless environments (Railway, Vercel, etc.)
 */

import puppeteer, { Browser, Page } from 'puppeteer'

let browserInstance: Browser | null = null

/**
 * Get or create a browser instance (reused for efficiency)
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    console.log('[Puppeteer] Launching browser...')

    // For serverless environments, use @sparticuz/chromium
    // In development, use the bundled Puppeteer Chromium
    const isServerless = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT

    let executablePath: string | undefined
    let chromiumArgs: string[] = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
      '--single-process',
    ]

    if (isServerless) {
      try {
        // Dynamic import to avoid bundling issues
        const chromium = await import('@sparticuz/chromium')
        executablePath = await chromium.default.executablePath()
        chromiumArgs = chromium.default.args
        console.log('[Puppeteer] Using @sparticuz/chromium for serverless')
      } catch (error) {
        console.error('[Puppeteer] Failed to load @sparticuz/chromium:', error)
        // Fall back to system/bundled Chromium
        executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      }
    } else {
      // Use system Chromium or Puppeteer's bundled one
      executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      console.log('[Puppeteer] Using local/bundled Chromium')
    }

    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: chromiumArgs,
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

/**
 * Fetch Catawiki page with enhanced data extraction
 * Catawiki uses Next.js with data in <script id="__NEXT_DATA__"> or window.__PRELOADED_STATE__
 */
export async function fetchCatawikiPage(url: string): Promise<string | null> {
  let page: Page | null = null

  try {
    const browser = await getBrowser()
    page = await browser.newPage()

    await page.setViewport({ width: 1920, height: 1080 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Navigate and wait for network to settle
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait for price/bid data to load (Catawiki uses React hydration)
    await new Promise(resolve => setTimeout(resolve, 4000))

    // Extract structured data from the page using JavaScript execution
    const pageData = await page.evaluate(() => {
      const data: Record<string, any> = {}

      // 1. Extract Next.js data (most reliable source for Catawiki)
      try {
        const nextDataScript = document.getElementById('__NEXT_DATA__')
        if (nextDataScript && nextDataScript.textContent) {
          const nextData = JSON.parse(nextDataScript.textContent)
          data.nextData = nextData
        }
      } catch (e) {
        // Ignore parse errors
      }

      // 2. Extract window global variables
      try {
        const win = window as any
        if (win.__PRELOADED_STATE__) {
          data.preloadedState = win.__PRELOADED_STATE__
        }
        if (win.__INITIAL_STATE__) {
          data.initialState = win.__INITIAL_STATE__
        }
      } catch (e) {
        // Ignore
      }

      // 3. Extract JSON-LD structured data
      try {
        const jsonLdScript = document.querySelector('script[type="application/ld+json"]')
        if (jsonLdScript && jsonLdScript.textContent) {
          data.jsonLd = JSON.parse(jsonLdScript.textContent)
        }
      } catch (e) {
        // Ignore parse errors
      }

      // 4. Extract meta tags
      const metaTags: Record<string, string> = {}
      document.querySelectorAll('meta[property^="og:"], meta[name^="og:"]').forEach((meta) => {
        const property = meta.getAttribute('property') || meta.getAttribute('name')
        const content = meta.getAttribute('content')
        if (property && content) {
          metaTags[property] = content
        }
      })
      if (Object.keys(metaTags).length > 0) {
        data.metaTags = metaTags
      }

      // 5. Look for data attributes on key elements
      const dataAttrs: Record<string, string> = {}
      document.querySelectorAll('[data-bid], [data-price], [data-current-bid], [data-sold-price]').forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.startsWith('data-')) {
            dataAttrs[attr.name] = attr.value
          }
        })
      })
      if (Object.keys(dataAttrs).length > 0) {
        data.dataAttributes = dataAttrs
      }

      // 6. Extract visible price text from common selectors
      const priceSelectors = [
        '[class*="price"]',
        '[class*="bid"]',
        '[class*="current"]',
        '[class*="sold"]',
        '[class*="winning"]',
      ]
      const priceTexts: string[] = []
      priceSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          const text = el.textContent?.trim()
          if (text && text.length < 100 && /[\d€$£,.]/.test(text)) {
            priceTexts.push(text)
          }
        })
      })
      if (priceTexts.length > 0) {
        data.priceTexts = Array.from(new Set(priceTexts)).slice(0, 20)
      }

      return data
    })

    // Build enhanced HTML content with extracted structured data at the top
    const htmlContent = await page.content()

    // Prepend structured data as HTML comments for easy extraction
    let enhancedContent = '<!-- CATAWIKI STRUCTURED DATA -->\n'
    enhancedContent += `<!-- NEXT_DATA: ${JSON.stringify(pageData.nextData || {}).slice(0, 5000)} -->\n`
    enhancedContent += `<!-- PRELOADED_STATE: ${JSON.stringify(pageData.preloadedState || {}).slice(0, 5000)} -->\n`
    enhancedContent += `<!-- JSON_LD: ${JSON.stringify(pageData.jsonLd || {}).slice(0, 2000)} -->\n`
    enhancedContent += `<!-- META_TAGS: ${JSON.stringify(pageData.metaTags || {}).slice(0, 1000)} -->\n`
    enhancedContent += `<!-- DATA_ATTRIBUTES: ${JSON.stringify(pageData.dataAttributes || {}).slice(0, 1000)} -->\n`
    enhancedContent += `<!-- PRICE_TEXTS: ${JSON.stringify(pageData.priceTexts || []).slice(0, 1000)} -->\n`
    enhancedContent += '<!-- END CATAWIKI STRUCTURED DATA -->\n\n'
    enhancedContent += htmlContent

    return enhancedContent
  } catch (error) {
    console.error(`[Puppeteer] Error fetching Catawiki page ${url}:`, error)
    return null
  } finally {
    if (page) {
      await page.close()
    }
  }
}
