import { NextResponse } from 'next/server'
import { getPublishedCarReview } from '@/services/ai-moderation.service'

// GET - Get published AI review for a listing (public endpoint)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params
    const review = await getPublishedCarReview(listingId)

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found or not published' },
        { status: 404 }
      )
    }

    // Return only public-safe fields
    return NextResponse.json({
      review: {
        overallScore: review.overallScore,
        conditionSummary: review.conditionSummary,
        highlights: review.highlights,
        concerns: review.concerns,
        estimatedValue: {
          low: review.estimatedValueLow,
          mid: review.estimatedValueMid,
          high: review.estimatedValueHigh,
          reasoning: review.valuationReasoning,
          comparisons: review.marketComparisons,
        },
        exteriorAnalysis: review.exteriorAnalysis,
        interiorAnalysis: review.interiorAnalysis,
        mechanicalNotes: review.mechanicalNotes,
        authenticityCheck: review.authenticityCheck,
        investmentOutlook: review.investmentOutlook,
        appreciationPotential: review.appreciationPotential,
        publishedAt: review.publishedAt,
      },
    })
  } catch (error) {
    console.error('Get public car review error:', error)
    return NextResponse.json(
      { error: 'Failed to get car review' },
      { status: 500 }
    )
  }
}
