/**
 * AI Price Estimation Service
 *
 * Uses AI to analyze classic car listings and generate market value estimates.
 * Considers make, model, year, mileage, condition, location, and market trends.
 */

import { chatCompletionJSON, type OpenRouterModel } from '@/lib/openrouter'
import { getAIModerationConfig } from './system-config.service'
import { prisma } from '@/lib/db'

// ============================================================================
// TYPES
// ============================================================================

export interface PriceEstimateInput {
  make: string
  model: string
  year: number
  mileage?: number | null
  mileageUnit?: string
  category: string
  locationCountry: string
  locationCity: string
  isRunning: boolean
  conditionOverall?: string | null
  conditionPaintBody?: string | null
  conditionInterior?: string | null
  conditionFrame?: string | null
  conditionMechanical?: string | null
  conditionNotes?: string | null
  knownIssues?: string | null
  description?: string | null
  hasReserve?: boolean
}

export interface PriceEstimateResult {
  estimateLow: number
  estimateHigh: number
  confidence: number // 0-1
  currency: string
  reasoning: string
  factors: PriceFactor[]
  comparables?: ComparableSale[]
  marketInsights: string
}

export interface PriceFactor {
  factor: string
  impact: 'positive' | 'negative' | 'neutral'
  description: string
  percentage?: number // Impact on price (+/- %)
}

export interface ComparableSale {
  description: string
  salePrice: number
  date?: string
  source?: string
}

// ============================================================================
// PROMPT
// ============================================================================

const PRICE_ESTIMATION_PROMPT = `You are an expert classic car appraiser and market analyst. Your task is to estimate the market value of a classic/collector vehicle based on the provided details.

VEHICLE DETAILS:
Make: {make}
Model: {model}
Year: {year}
Category: {category}
Mileage: {mileage} {mileageUnit}
Location: {locationCity}, {locationCountry}
Running Condition: {isRunning}

CONDITION ASSESSMENT:
- Overall: {conditionOverall}
- Paint & Body: {conditionPaintBody}
- Interior: {conditionInterior}
- Frame & Underbody: {conditionFrame}
- Mechanical: {conditionMechanical}

ADDITIONAL NOTES:
{conditionNotes}

KNOWN ISSUES:
{knownIssues}

DESCRIPTION:
{description}

Based on your knowledge of classic car markets (European focus, especially Eastern Europe), provide a realistic price estimate range. Consider:

1. **Base Value**: What similar vehicles in average condition typically sell for
2. **Condition Adjustments**: How this vehicle's condition affects value
3. **Market Factors**: Location, rarity, desirability, current trends
4. **Mileage Impact**: How mileage affects value for this specific model
5. **Running vs Non-Running**: Significant discount for non-running vehicles

IMPORTANT GUIDELINES:
- Prices should be in EUR
- Provide a realistic range (low to high) - typically 15-25% spread
- Low estimate = quick sale / auction starting point
- High estimate = optimistic private sale / perfect conditions
- Consider that this is for auction (prices often 10-20% below private sale)
- Be conservative - it's better to under-promise and over-deliver

Respond in JSON format:
{
  "estimateLow": 15000,
  "estimateHigh": 22000,
  "confidence": 0.75,
  "currency": "EUR",
  "reasoning": "Brief explanation of how you arrived at this estimate",
  "factors": [
    {
      "factor": "Desirability",
      "impact": "positive",
      "description": "The 205 GTI is highly sought after by enthusiasts",
      "percentage": 15
    },
    {
      "factor": "Mileage",
      "impact": "negative",
      "description": "182,000 km is above average for this model",
      "percentage": -10
    }
  ],
  "comparables": [
    {
      "description": "Similar 1989 205 GTI in France",
      "salePrice": 18500,
      "date": "2024",
      "source": "Bring a Trailer"
    }
  ],
  "marketInsights": "The Peugeot 205 GTI market has been strong, with clean examples commanding premiums. Eastern European location may slightly reduce buyer pool but also means lower reserve expectations."
}

Provide your best professional estimate.`

// ============================================================================
// SERVICE
// ============================================================================

/**
 * Generate AI-powered price estimate for a listing
 */
export async function generatePriceEstimate(
  input: PriceEstimateInput
): Promise<PriceEstimateResult> {
  const config = await getAIModerationConfig()

  // Build the prompt with vehicle details
  const prompt = PRICE_ESTIMATION_PROMPT
    .replace('{make}', input.make)
    .replace('{model}', input.model)
    .replace('{year}', String(input.year))
    .replace('{category}', input.category)
    .replace('{mileage}', input.mileage ? String(input.mileage) : 'Not specified')
    .replace('{mileageUnit}', input.mileageUnit || 'km')
    .replace('{locationCity}', input.locationCity)
    .replace('{locationCountry}', input.locationCountry)
    .replace('{isRunning}', input.isRunning ? 'Yes - runs and drives' : 'No - not running')
    .replace('{conditionOverall}', input.conditionOverall || 'Not specified')
    .replace('{conditionPaintBody}', input.conditionPaintBody || 'Not specified')
    .replace('{conditionInterior}', input.conditionInterior || 'Not specified')
    .replace('{conditionFrame}', input.conditionFrame || 'Not specified')
    .replace('{conditionMechanical}', input.conditionMechanical || 'Not specified')
    .replace('{conditionNotes}', input.conditionNotes || 'None provided')
    .replace('{knownIssues}', input.knownIssues || 'None disclosed')
    .replace('{description}', input.description || 'No description provided')

  const result = await chatCompletionJSON<PriceEstimateResult>(
    [{ role: 'user', content: prompt }],
    {
      model: config.defaultModel as OpenRouterModel,
      temperature: 0.3, // Lower temperature for more consistent estimates
    }
  )

  return {
    estimateLow: Math.round(result.estimateLow),
    estimateHigh: Math.round(result.estimateHigh),
    confidence: Math.min(1, Math.max(0, result.confidence)),
    currency: result.currency || 'EUR',
    reasoning: result.reasoning,
    factors: result.factors || [],
    comparables: result.comparables,
    marketInsights: result.marketInsights,
  }
}

/**
 * Generate and save price estimate for a listing
 */
export async function estimateListingPrice(listingId: string): Promise<{
  estimateLow: number
  estimateHigh: number
  result: PriceEstimateResult
}> {
  // Fetch listing details
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      make: true,
      model: true,
      year: true,
      mileage: true,
      mileageUnit: true,
      category: true,
      locationCountry: true,
      locationCity: true,
      isRunning: true,
      conditionOverall: true,
      conditionPaintBody: true,
      conditionInterior: true,
      conditionFrame: true,
      conditionMechanical: true,
      conditionNotes: true,
      knownIssues: true,
      description: true,
      reservePrice: true,
    },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  // Generate estimate
  const result = await generatePriceEstimate({
    make: listing.make,
    model: listing.model,
    year: listing.year,
    mileage: listing.mileage,
    mileageUnit: listing.mileageUnit,
    category: listing.category,
    locationCountry: listing.locationCountry,
    locationCity: listing.locationCity,
    isRunning: listing.isRunning,
    conditionOverall: listing.conditionOverall,
    conditionPaintBody: listing.conditionPaintBody,
    conditionInterior: listing.conditionInterior,
    conditionFrame: listing.conditionFrame,
    conditionMechanical: listing.conditionMechanical,
    conditionNotes: listing.conditionNotes,
    knownIssues: listing.knownIssues,
    description: listing.description,
    hasReserve: listing.reservePrice !== null,
  })

  // Update listing with estimate
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      estimateLow: result.estimateLow,
      estimateHigh: result.estimateHigh,
    },
  })

  return {
    estimateLow: result.estimateLow,
    estimateHigh: result.estimateHigh,
    result,
  }
}

/**
 * Batch estimate prices for multiple listings
 */
export async function batchEstimateListingPrices(
  listingIds: string[],
  options: { concurrency?: number } = {}
): Promise<Map<string, PriceEstimateResult | Error>> {
  const { concurrency = 3 } = options
  const results = new Map<string, PriceEstimateResult | Error>()

  // Process in batches to respect rate limits
  for (let i = 0; i < listingIds.length; i += concurrency) {
    const batch = listingIds.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map(async (id) => {
        const { result } = await estimateListingPrice(id)
        return { id, result }
      })
    )

    batchResults.forEach((settledResult, index) => {
      const listingId = batch[index]
      if (settledResult.status === 'fulfilled') {
        results.set(listingId, settledResult.value.result)
      } else {
        results.set(listingId, new Error(settledResult.reason?.message || 'Unknown error'))
      }
    })
  }

  return results
}
