# RM Sotheby's Scraper Fixes

## Issues Found

### 1. URL Discovery Problem
**Current:** Navigates to `https://rmsothebys.com/en/results`
**Issue:** This is a search interface page that doesn't pre-load lot data. The Angular app requires user interaction to load results.

**Fix:** Target specific completed auction pages instead:
```typescript
const recentAuctions = [
  'mo24', // Monterey 2024 (August)
  'pa24', // Paris 2024
  'az25', // Arizona 2025 (January)
  'mi25', // Miami 2025 (February)
  'pa25', // Paris 2025
  'mo25', // Monterey 2025
]
const auctionCode = recentAuctions[Math.floor(Math.random() * recentAuctions.length)]
const auctionUrl = `https://rmsothebys.com/auctions/${auctionCode}/lots/`
```

### 2. Angular Rendering Delay
**Current:** Waits 5 seconds for Angular app to load
**Issue:** Insufficient time for lot data to populate via API calls

**Fix:** Increase wait time and add selector waiting:
```typescript
// Wait for Angular app to load and render lot data
await new Promise(resolve => setTimeout(resolve, 8000))

// Try to wait for lot links to appear
try {
  await page.waitForSelector('a[href*="/lots/"]', { timeout: 10000 })
  console.log('[Scraper] RM Sotheby\'s: Lot links detected')
} catch {
  console.log('[Scraper] RM Sotheby\'s: Warning - No lot links found')
}
```

### 3. Title Extraction
**Current:** `lotPart.split('-').slice(1).join(' ')`
**Issue:** Doesn't work correctly for lot IDs like "r0207-2015-ferrari-laferrari"
- splits on '-' which breaks the year and model
- Results in messy titles

**Fix:** Remove only the lot number prefix with regex:
```typescript
// Remove lot number prefix (e.g., r0001-, n0001-) to get clean title
const title = lotPart.replace(/^[a-z]\d+-/i, '').replace(/-/g, ' ')
// Result: "2015 ferrari laferrari"
```

### 4. Price Extraction
**Issue:** RM Sotheby's lot pages don't show sold prices in HTML/structured data
- NewsArticle JSON-LD schema only (no price info)
- Price appears as plain text: "$31,200 USD | Sold"

**Fix:** Added pattern extraction in `global-sales.service.ts`:
```typescript
// Extract RM Sotheby's price from plain text
const rmPriceMatch = html.match(/\$?([\d,]+)\s*(USD|EUR|GBP|CHF)\s*\|\s*Sold/i)
if (rmPriceMatch) {
  structured.push('RM SOTHEBY\'S PRICE DATA:')
  structured.push(`  sold_price: ${rmPriceMatch[1].replace(/,/g, '')}`)
  structured.push(`  currency: ${rmPriceMatch[2].toUpperCase()}`)
}
```

### 5. Sale Date & Location Extraction
**Issue:** Sale dates not in HTML, only publication dates in JSON-LD

**Fix:** Decode auction code to get location and estimated date:
```typescript
const auctionCodes: Record<string, { location: string; month: string }> = {
  mo: { location: 'Monterey, United States', month: 'August' },
  pa: { location: 'Paris, France', month: 'February' },
  az: { location: 'Arizona, United States', month: 'January' },
  mi: { location: 'Miami, United States', month: 'February' },
  lf: { location: 'London, United Kingdom', month: 'November' },
  mu: { location: 'Munich, Germany', month: 'October' },
}
```

## Files Modified

### /Users/brad/Code2/finds/src/lib/auction-scrapers.ts

**Function:** `scrapeRMSothebysWithPuppeteer()`

Changes:
1. Line ~646: Change URL from `/en/results` to `/auctions/${auctionCode}/lots/`
2. Line ~636: Increase wait time from 5000ms to 8000ms
3. Add selector wait with try/catch after line ~661
4. Line ~690: Update URL pattern regex to use stricter matching

**Function:** `scrapeRMSothebys()`

Changes:
1. Line ~583: Update title extraction to use regex for prefix removal
2. Add documentation comments explaining Angular rendering

### /Users/brad/Code2/finds/src/services/ai/global-sales.service.ts

**Function:** `extractStructuredData()`

Added (after line ~128):
```typescript
// Extract RM Sotheby's price from plain text (e.g., "$31,200 USD | Sold")
const rmPriceMatch = html.match(/\$?([\d,]+)\s*(USD|EUR|GBP|CHF)\s*\|\s*Sold/i)
if (rmPriceMatch) {
  structured.push('RM SOTHEBY\'S PRICE DATA:')
  structured.push(`  sold_price: ${rmPriceMatch[1].replace(/,/g, '')}`)
  structured.push(`  currency: ${rmPriceMatch[2].toUpperCase()}`)
}

// Extract RM Sotheby's auction info from URL
const rmAuctionMatch = html.match(/\/auctions\/([a-z]{2}\d{2})\//i)
if (rmAuctionMatch) {
  // ... auction code decoding logic
}
```

**Constant:** `PARSE_AUCTION_PROMPT`

Added section 4 for RM Sotheby's data format:
```
4. RM SOTHEBY'S PRICE DATA (plain text extraction):
   - sold_price: Final hammer price (e.g., "31200" from "$31,200 USD | Sold")
   - currency: USD, EUR, GBP, or CHF
   - auction_code: Two-letter code + year
   - location: Decoded from auction code
   - estimated_date: Approximate date from auction code
```

Updated Rules section to add RM Sotheby's specific instructions for:
- soldPrice extraction
- saleDate formatting
- currency parsing
- location determination

## Testing Recommendations

1. **URL Discovery Test:**
   - Set `USE_PUPPETEER=true`
   - Run scraper and verify it finds 10-20 lot URLs from a specific auction
   - Expected URLs: `https://rmsothebys.com/auctions/mo24/lots/r0207-2015-ferrari-laferrari/`

2. **Title Extraction Test:**
   - Verify titles don't include lot prefixes (r0001, n0001, etc.)
   - Expected: "2015 ferrari laferrari" not "0207 2015 ferrari laferrari"

3. **Price Extraction Test:**
   - Fetch a sold lot page (e.g., the Ferrari LaFerrari from mo24)
   - Verify AI can extract price from "$31,200 USD | Sold" pattern
   - Check location is decoded correctly (mo24 → Monterey, United States)

4. **Integration Test:**
   - Run full scraping pipeline
   - Verify RM Sotheby's lots are stored in ExternalAuctionSale table
   - Check that priceEur is calculated correctly from USD/EUR/GBP

## Known Limitations

1. **Sold Price Display:** Many RM Sotheby's lot pages don't display sold prices publicly
   - Only shows "Sold" status without price
   - May need to contact RM Sotheby's for official results data
   - Or scrape press releases which mention top lots

2. **Angular Rendering:** Site is slow to load
   - 8-10 second wait required
   - May timeout on slower connections
   - Consider increasing timeout from 45s to 60s

3. **Auction Coverage:** Only includes hardcoded recent auctions
   - Need to manually update auction codes each year
   - Could scrape auction calendar page to get current auctions

## Example URLs for Testing

Successfully found lot URLs:
```
https://rmsothebys.com/auctions/mo24/lots/r0207-2015-ferrari-laferrari/
https://rmsothebys.com/auctions/pa24/lots/n0004-ferrari-fxxk-evo-wind-tunnel-model/
https://rmsothebys.com/auctions/az25/lots/...
```

Results pages to scrape:
```
https://rmsothebys.com/auctions/mo24/lots/  (Monterey 2024 - major auction)
https://rmsothebys.com/auctions/pa25/lots/  (Paris 2025)
https://rmsothebys.com/auctions/az25/lots/  (Arizona 2025)
```

## References

- [RM Sotheby's Results Page](https://rmsothebys.com/results/)
- [Monterey 2024 Results](https://rmsothebys.com/media-center/press-releases/rm-sotheby-s-tops-165-million-at-monterey-car-week-led-by-26-million-ferrari-daytona-sp3-and-multiple-world-records/)
- [Ferrari LaFerrari Lot](https://rmsothebys.com/auctions/mo24/lots/r0207-2015-ferrari-laferrari/)
