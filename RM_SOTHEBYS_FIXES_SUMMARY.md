# RM Sotheby's Scraper - Fix Summary

## Overview

Fixed the RM Sotheby's scraper to correctly discover sold car URLs and extract pricing data. RM Sotheby's uses a heavily JavaScript-rendered Angular application that requires special handling.

## Changes Applied

### 1. AI Parsing Service (`/Users/brad/Code2/finds/src/services/ai/global-sales.service.ts`)

#### Added RM Sotheby's Price Extraction (Lines ~130-160)
```typescript
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
```

#### Updated AI Prompt (Lines ~265-275)
Added section 4 for RM Sotheby's data format:
```
4. RM SOTHEBY'S PRICE DATA (plain text extraction):
   - sold_price: Final hammer price (e.g., "31200" from "$31,200 USD | Sold")
   - currency: USD, EUR, GBP, or CHF
   - auction_code: Two-letter code + year (e.g., "mo24" = Monterey 2024, "pa25" = Paris 2025)
   - location: Decoded from auction code (e.g., mo = Monterey, pa = Paris, az = Arizona)
   - estimated_date: Approximate date from auction code and known auction calendar
```

#### Updated Parsing Rules (Lines ~291-316)
Added RM Sotheby's specific instructions:
```
- soldPrice: number only, no currency symbols or commas.
  * For RM Sotheby's: Extract from sold_price in RM SOTHEBY'S PRICE DATA section

- saleDate: YYYY-MM-DD format.
  * For RM Sotheby's: Use estimated_date from auction code (e.g., "mo24" → "2024-August" → "2024-08-15")

- currency:
  * For RM Sotheby's: Use currency from RM SOTHEBY'S PRICE DATA section (USD, EUR, GBP, or CHF)

- location: CRITICAL - extract the country/location. Look for:
  * RM Sotheby's: Use location from RM SOTHEBY'S AUCTION INFO section (decoded from auction code)
```

### 2. Scraper Implementation (`/Users/brad/Code2/finds/src/lib/auction-scrapers.ts`)

#### Still Needs Manual Application

The scraper file needs these changes (file was modified by linter during editing):

**In `scrapeRMSothebys()` function (around line 575-590):**

CURRENT:
```typescript
const title = lotPart.split('-').slice(1).join(' ').replace(/-/g, ' ') || 'RM Sotheby\'s Lot'
```

SHOULD BE:
```typescript
// Remove lot number prefix (e.g., r0001-, n0001-) to get clean title
const title = lotPart.replace(/^[a-z]\d+-/i, '').replace(/-/g, ' ') || 'RM Sotheby\'s Lot'
```

**In `scrapeRMSothebysWithPuppeteer()` function (around line 620-660):**

CURRENT:
```typescript
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
```

SHOULD BE:
```typescript
// Recent completed auctions - rotate through these to get variety
// Format: {code}24 = 2024, {code}25 = 2025
const recentAuctions = [
  'mo24', // Monterey 2024 (August) - major auction
  'pa24', // Paris 2024
  'az25', // Arizona 2025 (January)
  'mi25', // Miami 2025 (February)
  'pa25', // Paris 2025
  'mo25', // Monterey 2025 (August)
]

// Pick a random recent auction to get variety
const auctionCode = recentAuctions[Math.floor(Math.random() * recentAuctions.length)]
const auctionUrl = `https://rmsothebys.com/auctions/${auctionCode}/lots/`

console.log(`[Scraper] RM Sotheby's: Navigating to ${auctionCode} auction results...`)

await page.goto(auctionUrl, {
  waitUntil: 'networkidle2',
  timeout: 45000,
})

await randomDelay()

// Wait for Angular app to load and render lot data
// RM Sotheby's uses Angular - need extra time for lot data to populate
console.log('[Scraper] RM Sotheby\'s: Waiting for Angular to render lots...')
await new Promise(resolve => setTimeout(resolve, 8000))

// Try to wait for lot links to appear in the DOM
try {
  await page.waitForSelector('a[href*="/lots/"]', { timeout: 10000 })
  console.log('[Scraper] RM Sotheby\'s: Lot links detected')
} catch {
  console.log('[Scraper] RM Sotheby\'s: Warning - No lot links found after waiting')
}

// Scroll to trigger lazy loading of more lots
for (let i = 0; i < 4; i++) {
  await page.evaluate(() => window.scrollBy(0, 600))
  await randomDelay()
}
```

**Update URL pattern matching (around line 647-656):**

CURRENT:
```typescript
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
```

SHOULD BE:
```typescript
const urls = await page.evaluate(() => {
  const links = document.querySelectorAll('a[href]')
  const lotUrls: string[] = []

  links.forEach(link => {
    const href = (link as HTMLAnchorElement).href
    if (!href || !href.includes('rmsothebys.com')) {return}

    // Match URLs like /auctions/mo24/lots/r0207-2015-ferrari-laferrari/
    // Lot IDs start with letter + numbers (r0001, n0001, etc.)
    if (/\/auctions\/[a-z0-9]+\/lots\/[a-z]\d+-[a-z0-9-]+/i.test(href)) {
      lotUrls.push(href)
    }
  })

  return lotUrls
})

const uniqueUrls = Array.from(new Set(urls)).slice(0, 20)
console.log(`[Scraper] RM Sotheby's: Found ${uniqueUrls.length} lot URLs from ${auctionCode}`)
```

## Key Improvements

### 1. URL Discovery
- **Before:** Generic `/en/results` page with no pre-loaded data
- **After:** Specific auction pages like `/auctions/mo24/lots/` that render lot lists

### 2. Angular Rendering
- **Before:** 5 second wait, no selector verification
- **After:** 8 second wait + selector waiting to ensure lots are rendered

### 3. Title Extraction
- **Before:** `split('-').slice(1).join(' ')` - breaks on multi-part names
- **After:** `replace(/^[a-z]\d+-/i, '')` - cleanly removes only lot number prefix

### 4. Price Extraction
- **Before:** No pattern for RM Sotheby's plain text prices
- **After:** Regex pattern to extract from "$31,200 USD | Sold" format

### 5. Location & Date
- **Before:** No location/date data
- **After:** Auction code decoding provides location and estimated date

## Testing

Test with:
```bash
USE_PUPPETEER=true npm run scrape-auctions
```

Expected results:
- 10-20 lot URLs from RM Sotheby's
- Titles like "2015 ferrari laferrari" (no lot number prefix)
- AI parsing successfully extracts:
  - Sold price (e.g., 31200)
  - Currency (USD, EUR, GBP, CHF)
  - Location (e.g., "Monterey, United States")
  - Estimated date (e.g., "2024-08-15")

## Known Limitations

1. **Public Price Visibility:** Many RM Sotheby's lots don't publicly display sold prices
2. **Auction Code Maintenance:** Need to update auction codes annually
3. **Rendering Time:** 8-10 seconds per scrape (Angular is slow)
4. **No Real-Time Updates:** Uses static auction code list, not dynamic auction calendar

## Files Modified

1. `/Users/brad/Code2/finds/src/services/ai/global-sales.service.ts` - COMPLETED
2. `/Users/brad/Code2/finds/src/lib/auction-scrapers.ts` - PARTIAL (needs manual edits above)

## Reference Files

- `/Users/brad/Code2/finds/RM_SOTHEBYS_SCRAPER_FIXES.md` - Detailed technical documentation
- `/Users/brad/Code2/finds/src/lib/auction-scrapers-rmsothebys-fixed.ts` - Clean implementation reference

## Sources

- [RM Sotheby's Results](https://rmsothebys.com/en/results)
- [Monterey 2024 Results](https://rmsothebys.com/auctions/mo24/lots/)
- [Paris 2025 Results](https://rmsothebys.com/auctions/pa25/lots/)
- [Arizona 2025 Results](https://rmsothebys.com/auctions/az25/lots/)
