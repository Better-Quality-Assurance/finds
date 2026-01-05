# Silverstone Auctions / Iconic Auctioneers Scraper Fix

## Summary

Fixed the `scrapeSilverstoneAuctions` function in `src/lib/auction-scrapers.ts` which was returning 0 URLs. Silverstone Auctions has rebranded to **Iconic Auctioneers** with a new domain and URL structure.

## Problem

- Old URL: `https://www.silverstoneauctions.com/auction/archive-auctions-cars`
- silverstoneauctions.com returns 403 Forbidden (blocked scraping)
- The site has rebranded to iconicauctioneers.com
- Old selector `a[href*="/lot/"]` didn't match the new URL structure

## Solution

### 1. Updated Domain
- Changed from `silverstoneauctions.com` to `iconicauctioneers.com`
- New URL: `https://www.iconicauctioneers.com/auction/archive-auctions-cars`

### 2. Updated URL Pattern Matching
The site uses a specific URL pattern for individual vehicle lots:

```
/[year]-[make]-[model]-[lot-code]-[location]-[date]
```

Example:
```
/1960-jaguar-mk2-rec16398-1-stoneleigh-0226
```

Breaking down the components:
- `1960` - vehicle year
- `jaguar` - make
- `mk2` - model
- `rec16398-1` - lot code
- `stoneleigh` - auction location
- `0226` - auction date (February 2026)

### 3. Implemented Regex Filter

```typescript
const lotPattern = /^\/(?:19|20)\d{2}-[a-z0-9]+-[a-z0-9-]+-[a-z0-9-]+-[a-z0-9-]+-\d{4}$/i
```

This pattern matches:
- URLs starting with `/` followed by a year (19xx or 20xx)
- Followed by at least 5 segments separated by hyphens
- Ending with a 4-digit date code

### 4. Improved Title Extraction

Extracts year, make, and model from the URL to create descriptive titles:

```typescript
const parts = path.split('-')
const year = parts[0]   // "1960"
const make = parts[1]   // "jaguar"
const model = parts[2]  // "mk2"
const title = `${year} ${make} ${model}` // "1960 jaguar mk2"
```

### 5. Re-enabled in Scraper Pool

The scraper was previously disabled in the `scrapeAllAuctionSites` function. It's now re-enabled as `'Iconic Auctioneers'` in the secondary scrapers pool.

## Technical Details

### Site Architecture
- **Framework**: Vue.js/Nuxt (JavaScript-rendered)
- **Requires**: Puppeteer with `USE_PUPPETEER=true`
- **Rendering**: Dynamic AJAX-based auction listing
- **AJAX Endpoint**: `/index.php?option=com_calendar&format=json&task=archive.filterAuctions`

### Archive URLs
The site has multiple archive sections:
- `/auction/archive-auctions` - all past auctions
- `/auction/archive-auctions-cars` - cars only (used by scraper)
- `/auction/archive-auctions-motorcycles` - motorcycles only
- `/auction/upcoming-auctions-automobilia` - automobilia

### Catalogue View
Individual auctions also have a catalogue view:
```
/index.php?option=com_bidding&view=commission&layout=catalogue&id=[auction_id]
```

## Files Modified

- `/Users/brad/Code2/finds/src/lib/auction-scrapers.ts`
  - Updated `scrapeSilverstoneAuctions()` function (lines 510-574)
  - Re-enabled in `secondaryScrapers` array (line 1004)
  - Updated source name to "Iconic Auctioneers"
  - Updated log messages and comments

## Testing Notes

When testing with `USE_PUPPETEER=true`:
1. The scraper will fetch up to 50 URLs from the archive page
2. Filters to vehicle lot URLs using the regex pattern
3. Returns up to 20 validated lot URLs
4. Each URL should follow the format: `https://www.iconicauctioneers.com/YYYY-make-model-...`

## Example Output

```javascript
{
  url: 'https://www.iconicauctioneers.com/1960-jaguar-mk2-rec16398-1-stoneleigh-0226',
  title: '1960 jaguar mk2',
  source: 'Iconic Auctioneers'
}
```

## Related Documentation

- Catawiki scraper fix: `CATAWIKI_SCRAPER_FIX.md`
- Cars and Bids scraper fix: `CARSANDBIDS_SCRAPER_FIX.md`
- RM Sotheby's scraper fixes: `RM_SOTHEBYS_SCRAPER_FIXES.md`
