/**
 * API endpoint for listing improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/listings/[id]/improvements - Get improvement suggestions
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: listingId } = await params

    // Verify ownership
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Get latest improvements
    const improvement = await prisma.aIListingImprovement.findFirst({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
    })

    if (!improvement) {
      return NextResponse.json({ improvement: null, status: 'not_generated' })
    }

    // Format response
    const response = {
      improvement: {
        id: improvement.id,
        reason: improvement.reason,
        status: improvement.status,
        suggestedStartingPrice: improvement.suggestedStartingPrice
          ? Number(improvement.suggestedStartingPrice)
          : null,
        suggestedReserve: improvement.suggestedReserve
          ? Number(improvement.suggestedReserve)
          : null,
        avgMarketPrice: improvement.avgMarketPrice
          ? Number(improvement.avgMarketPrice)
          : null,
        pricingReasoning: improvement.pricingReasoning,
        suggestions: improvement.suggestions,
        topPriorities: improvement.topPriorities,
        marketData: improvement.marketData,
        localSalesCount: improvement.localSalesCount,
        globalSalesCount: improvement.globalSalesCount,
        createdAt: improvement.createdAt.toISOString(),
      },
      status: improvement.status.toLowerCase(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to get improvements:', error)
    return NextResponse.json(
      { error: 'Failed to get improvements' },
      { status: 500 }
    )
  }
}
