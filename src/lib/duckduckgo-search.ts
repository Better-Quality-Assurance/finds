/**
 * DuckDuckGo Search Utility
 *
 * Uses DuckDuckGo to search for auction results since it allows scraping.
 */

import { search, SafeSearchType } from 'duck-duck-scrape'

export interface SearchResult {
  title: string
  url: string
  description: string
}

// Delay between retries
const RETRY_DELAY_MS = 5000
const MAX_RETRIES = 3

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Search DuckDuckGo for auction results with retry logic
 */
export async function searchDuckDuckGo(
  query: string,
  options?: { limit?: number; retries?: number }
): Promise<SearchResult[]> {
  const { limit = 10, retries = MAX_RETRIES } = options || {}

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const results = await search(query, {
        safeSearch: SafeSearchType.OFF,
      })

      if (!results.results || results.results.length === 0) {
        return []
      }

      return results.results.slice(0, limit).map(result => ({
        title: result.title || '',
        url: result.url || '',
        description: result.description || '',
      }))
    } catch (error) {
      const isRateLimit =
        error instanceof Error && error.message.includes('anomaly')

      if (isRateLimit && attempt < retries) {
        console.warn(
          `[DDG Search] Rate limited, retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt}/${retries})`
        )
        await sleep(RETRY_DELAY_MS * attempt) // Exponential backoff
        continue
      }

      console.error('[DDG Search] Error:', error)
      return []
    }
  }

  return []
}

/**
 * Search for recent auction sales from a specific site
 */
export async function searchAuctionSite(
  siteDomain: string,
  query?: string
): Promise<SearchResult[]> {
  const searchQuery = query
    ? `site:${siteDomain} ${query} sold`
    : `site:${siteDomain} sold auction results`

  return searchDuckDuckGo(searchQuery, { limit: 15 })
}

/**
 * European countries for location filtering
 */
export const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Czechia', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
  'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
  'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden', 'United Kingdom', 'UK', 'Switzerland', 'Norway',
  // Cities often mentioned
  'Paris', 'London', 'Monaco', 'Amsterdam', 'Munich', 'Berlin', 'Milan',
  'Rome', 'Barcelona', 'Madrid', 'Vienna', 'Brussels', 'Zurich', 'Geneva',
]

/**
 * Check if a location string indicates Europe
 */
export function isEuropeanLocation(location: string | null | undefined): boolean {
  if (!location) {return false}
  const locationLower = location.toLowerCase()
  return EU_COUNTRIES.some(country => locationLower.includes(country.toLowerCase()))
}

/**
 * Build search queries for finding recent classic car sales - EU focused
 */
export function buildSaleSearchQueries(): string[] {
  return [
    // EU-ONLY sources (prioritize these)
    'site:catawiki.com classic car sold',
    'site:catawiki.com oldtimer auction',
    'site:catawiki.com vintage car',
    'site:artcurial.com automobiles sold',
    'site:artcurial.com voiture collection',
    // Collecting Cars (UK-based, EU focused)
    'site:collectingcars.com sold',
    // RM Sotheby's EU auctions
    'site:rmsothebys.com Monaco sold',
    'site:rmsothebys.com Paris sold',
    'site:rmsothebys.com London sold',
    // Bonhams EU auctions
    'site:bonhams.com Paris motor car sold',
    'site:bonhams.com London motor car sold',
    // BaT Europe section (they do have some EU cars)
    'site:bringatrailer.com Europe sold',
    'site:bringatrailer.com UK sold',
    'site:bringatrailer.com Germany sold',
    // Generic EU queries
    'classic car auction sold Europe',
    'oldtimer auction results Germany France',
  ]
}
