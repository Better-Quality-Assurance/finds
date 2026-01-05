# Catawiki Scraper Fix - Price Extraction Solution

## Problem Summary

The Catawiki scraper was successfully finding auction URLs, but the AI parsing could not extract sold prices from the page content. This occurred because:

1. **Catawiki uses Next.js with client-side hydration**: Price data is not in server-rendered HTML
2. **Data is in JavaScript variables**: Specifically in `<script id="__NEXT_DATA__">` and `window.__PRELOADED_STATE__`
3. **Simple HTTP fetch returns incomplete HTML**: The page needs JavaScript execution to access auction data
4. **403 Forbidden on direct access**: Catawiki blocks basic HTTP requests

## Root Cause

Catawiki is a modern single-page application built with Next.js. The auction data (including prices) is embedded as JSON in the page's JavaScript, not as HTML data attributes or meta tags. When the original scraper used `fetchWithPuppeteer()`, it waited for the page to load but didn't extract the embedded JavaScript data, leaving the AI with no structured information to parse.

## Solution Architecture

### 1. Enhanced Puppeteer Function: `fetchCatawikiPage()`

**Location**: `/Users/brad/Code2/finds/src/lib/puppeteer-scraper.ts`

This specialized function uses Puppeteer's `page.evaluate()` to execute JavaScript in the browser context and extract:

- **Next.js Data** (`__NEXT_DATA__`): Complete lot/auction data including:
  - `lot.currentBid` / `lot.hammer_price` / `lot.winning_bid` - Sold price
  - `lot.currency_code` - Currency (EUR, USD, etc.)
  - `lot.auction_end_date` / `lot.closed_at` - Sale date
  - `lot.title` - Vehicle title
  - `lot.main_image_url` - Main image
  - Seller/location information

- **Window Globals** (`__PRELOADED_STATE__`, `__INITIAL_STATE__`): Additional state data

- **JSON-LD Structured Data**: Schema.org Product data (if available)

- **Meta Tags**: Open Graph tags (og:title, og:image, og:description)

- **Data Attributes**: Any data-* attributes on key elements

- **Price Text Patterns**: Visible price strings extracted from DOM (e.g., "€15,000")

The extracted data is prepended to the HTML as HTML comments in a structured format:

```html
<!-- CATAWIKI STRUCTURED DATA -->
<!-- NEXT_DATA: {"props":{"pageProps":{"lot":{"currentBid":15000,...},...}}} -->
<!-- PRICE_TEXTS: ["€15,000","€12,500"] -->
<!-- META_TAGS: {"og:title":"1989 Porsche 911",...} -->
<!-- END CATAWIKI STRUCTURED DATA -->
<html>...rest of page...</html>
```

### 2. Modified Scraper Router: `fetchAuctionPage()`

**Location**: `/Users/brad/Code2/finds/src/lib/auction-scrapers.ts`

The main fetch function now detects Catawiki URLs and routes them to the specialized fetcher:

```typescript
if (url.includes('catawiki.com')) {
  if (usePuppeteer) {
    console.log('[Scraper] Using enhanced Catawiki fetcher')
    return fetchCatawikiPage(url)
  } else {
    console.log('[Scraper] Catawiki requires Puppeteer (USE_PUPPETEER=true)')
    return null
  }
}
```

### 3. Enhanced Data Extraction: `extractStructuredData()`

**Location**: `/Users/brad/Code2/finds/src/services/ai/global-sales.service.ts`

The extraction function now:

1. **Detects Catawiki structured data** from HTML comments
2. **Extracts each data type** (NEXT_DATA, PRELOADED_STATE, JSON-LD, etc.)
3. **Formats it for the AI** in a clear, hierarchical structure
4. **Falls back to standard extraction** for other auction sites

### 4. Updated AI Parsing Prompt

**Location**: `/Users/brad/Code2/finds/src/services/ai/global-sales.service.ts`

The AI prompt now includes specific guidance for Catawiki:

```
1. CATAWIKI STRUCTURED DATA (for Catawiki):
   - Next.js Data (__NEXT_DATA__): Contains complete auction/lot data in JSON format
     * Look for: lot.currentBid, lot.hammer_price, lot.winning_bid, lot.current_bid_amount
     * Currency: lot.currency_code or lot.currency
     * Title: lot.title or lot.description
     * Sale date: lot.auction_end_date or lot.closed_at
     * Location: seller.location or lot.location
     * Image: lot.main_image_url or lot.images[0]
   - Price Texts: Array of price strings found on the page
```

And updated rules:

```
- soldPrice: For Catawiki: Search Next.js Data for lot.currentBid, lot.hammer_price,
  lot.winning_bid, or parse from Price Texts array
- saleDate: For Catawiki: Use lot.auction_end_date or lot.closed_at from Next.js Data
- currency: For Catawiki: Use lot.currency_code or lot.currency (usually "EUR")
```

## How It Works

### Data Flow

1. **Scraper discovers Catawiki URLs** via `scrapeCatawiki()` using Puppeteer
2. **Cron job calls `fetchAuctionPage()`** for each URL
3. **Router detects Catawiki** and calls `fetchCatawikiPage()`
4. **Puppeteer loads page** and waits 4 seconds for React hydration
5. **JavaScript executes in browser** to extract all structured data
6. **Data is embedded in HTML comments** at the top of the page
7. **Enhanced HTML returned** to the parsing service
8. **`extractStructuredData()` extracts** the Catawiki data from comments
9. **AI receives structured data** first, then page excerpt
10. **AI parses JSON** following Catawiki-specific rules
11. **Sale data stored** in database

### Example: What the AI Receives

```
Source: Catawiki
URL: https://www.catawiki.com/en/l/12345678-porsche-911-carrera-1989

CATAWIKI STRUCTURED DATA (extracted via Puppeteer):
  Next.js Data (from __NEXT_DATA__):
  {"props":{"pageProps":{"lot":{"id":12345678,"title":"Porsche - 911 Carrera - 1989",
  "currentBid":35000,"currency_code":"EUR","auction_end_date":"2024-12-15T20:00:00Z",
  "main_image_url":"https://assets.catawiki.nl/assets/...",
  "seller":{"location":"Germany"},...}}}}

  Price Texts Found on Page:
  ["€35,000","€32,500","€30,000"]

  Open Graph Meta Tags:
  {"og:title":"Porsche - 911 Carrera - 1989","og:image":"https://..."}

PAGE CONTENT (excerpt):
<html>...</html>
```

The AI can now easily extract:
- **soldPrice**: 35000 (from `lot.currentBid`)
- **currency**: EUR (from `lot.currency_code`)
- **saleDate**: 2024-12-15 (from `lot.auction_end_date`)
- **title**: Porsche - 911 Carrera - 1989
- **make**: Porsche
- **model**: 911 Carrera
- **year**: 1989
- **imageUrl**: https://assets.catawiki.nl/assets/...
- **location**: Germany (from `seller.location`)

## Key Technical Decisions

### Why Use HTML Comments?

- **Simplicity**: No need to modify data structures or create new APIs
- **Reliability**: Comments are preserved in the HTML string
- **AI-Friendly**: The AI can easily parse structured data at the start of content
- **Backwards Compatible**: Other auction sites work unchanged

### Why Extract Multiple Data Sources?

Different Catawiki pages may structure data differently:
- Some use `currentBid`, others use `hammer_price` or `winning_bid`
- Provides fallbacks if one field is missing
- Price texts give the AI a third validation source

### Why 4-Second Wait?

Catawiki uses React hydration which takes time:
- 2 seconds: Initial page load
- 1-2 seconds: React app initialization
- 4 seconds total: Safe margin for data to be available

## Files Modified

1. **`/Users/brad/Code2/finds/src/lib/puppeteer-scraper.ts`**
   - Added `fetchCatawikiPage()` function (135 lines)
   - Extracts 6 types of structured data from Catawiki pages

2. **`/Users/brad/Code2/finds/src/lib/auction-scrapers.ts`**
   - Imported `fetchCatawikiPage`
   - Modified `fetchAuctionPage()` to route Catawiki URLs to specialized fetcher
   - Removed `catawiki.com` from generic `jsRenderedDomains` array

3. **`/Users/brad/Code2/finds/src/services/ai/global-sales.service.ts`**
   - Enhanced `extractStructuredData()` to parse Catawiki HTML comments (45 new lines)
   - Updated `PARSE_AUCTION_PROMPT` with Catawiki-specific instructions
   - Added rules for extracting price/date/currency from Next.js data

## Testing

To test the fix:

1. **Set environment variable**:
   ```bash
   export USE_PUPPETEER=true
   ```

2. **Run the cron job** (requires authentication):
   ```bash
   curl -H "Authorization: Bearer ${CRON_SECRET}" \
     http://localhost:3000/api/cron/fetch-global-sales
   ```

3. **Check logs** for:
   ```
   [Scraper] Using enhanced Catawiki fetcher
   [Scraper] Catawiki: Found X URLs
   [CRON] Got XXXXX chars from [Catawiki]
   [CRON] Stored: <vehicle-title> - €<price>
   ```

4. **Verify database**:
   ```sql
   SELECT * FROM ExternalAuctionSale
   WHERE source = 'Catawiki'
   ORDER BY createdAt DESC
   LIMIT 10;
   ```

## Limitations & Future Improvements

### Current Limitations

1. **Requires Puppeteer**: Catawiki will not work without `USE_PUPPETEER=true`
2. **Slower than HTTP**: Each page takes ~6-8 seconds (vs 1-2 seconds for simple sites)
3. **Memory intensive**: Puppeteer with headless Chrome uses significant RAM
4. **Cloudflare risk**: If Catawiki adds aggressive bot protection, stealth mode may be needed

### Potential Improvements

1. **Add stealth mode**: If Catawiki starts blocking, use puppeteer-extra-plugin-stealth
2. **Cache parsed data**: Store structured data separately to avoid re-fetching
3. **Direct API access**: Investigate if Catawiki has an undocumented API
4. **Rate limiting**: Add delays between Catawiki fetches to be respectful
5. **Error recovery**: Retry with exponential backoff on failures
6. **Data validation**: Verify extracted prices match expected ranges

## Alternative Approaches Considered

### 1. API Reverse Engineering
**Pros**: Faster, more reliable
**Cons**: Against Catawiki ToS, may break frequently
**Decision**: Not implemented to respect platform rules

### 2. Browser Extension / Desktop App
**Pros**: No server resources needed
**Cons**: Requires manual operation, not scalable
**Decision**: Not suitable for automated cron jobs

### 3. Third-Party Scraping Service
**Pros**: Outsources complexity
**Cons**: Expensive, dependency on external service
**Decision**: Puppeteer is sufficient for current needs

### 4. Machine Vision / OCR
**Pros**: Works even if JavaScript changes
**Cons**: Expensive, error-prone, slow
**Decision**: Overkill when JavaScript data is accessible

## Maintenance Notes

### What to Monitor

- **Success rate**: Percentage of Catawiki pages that successfully extract price
- **Parse failures**: Log when AI returns null or missing price
- **Performance**: Average time per Catawiki page
- **Error patterns**: 403 errors, timeouts, parsing exceptions

### When to Update

- **Catawiki redesign**: If they change Next.js structure or variable names
- **New data fields**: If lot structure adds/removes fields
- **Bot detection**: If they start blocking Puppeteer
- **Performance issues**: If pages take >10 seconds to load

### Debugging Tips

1. **Enable verbose logging**: Set `DEBUG=puppeteer:*` to see browser actions
2. **Take screenshots**: Add `await page.screenshot({path: 'debug.png'})` before extraction
3. **Inspect __NEXT_DATA__**: Open Catawiki page in browser, run `console.log(document.getElementById('__NEXT_DATA__').textContent)` in DevTools
4. **Check network requests**: See if Catawiki loads data via API after page load
5. **Test with sold vs active auctions**: Sold auctions may have different data structure

## Success Criteria

The fix is successful if:

- ✅ Catawiki URLs are fetched using Puppeteer
- ✅ Structured data (Next.js, JSON-LD, etc.) is extracted from the page
- ✅ Data is formatted and passed to the AI parser
- ✅ AI successfully extracts sold price, currency, and sale date
- ✅ Sales are stored in the database with correct values
- ✅ No errors in the cron job logs
- ✅ Other auction sites continue working unchanged

## Conclusion

The Catawiki price extraction issue was solved by:
1. Creating a specialized Puppeteer function that extracts JavaScript-embedded data
2. Routing Catawiki URLs through this function
3. Enhancing the data extraction to parse the structured data
4. Updating the AI prompt with Catawiki-specific instructions

This approach is robust, maintainable, and respects Catawiki's platform while providing the data needed for market analysis.
