/**
 * AI Price Estimation API
 *
 * POST /api/admin/listings/[id]/estimate
 * Generates AI-powered price estimate for a listing
 *
 * Admin/Moderator only
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { estimateListingPrice } from '@/services/ai-price-estimation.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin or moderator role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: listingId } = await params

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, estimateLow: true, estimateHigh: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Generate estimate
    const { estimateLow, estimateHigh, result } = await estimateListingPrice(listingId)

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'GENERATE_PRICE_ESTIMATE',
        resourceType: 'Listing',
        resourceId: listingId,
        actorId: session.user.id,
        details: {
          estimateLow,
          estimateHigh,
          confidence: result.confidence,
          reasoning: result.reasoning,
        } as object,
      },
    })

    return NextResponse.json({
      success: true,
      listingId,
      estimateLow,
      estimateHigh,
      confidence: result.confidence,
      currency: result.currency,
      reasoning: result.reasoning,
      factors: result.factors,
      comparables: result.comparables,
      marketInsights: result.marketInsights,
    })
  } catch (error) {
    console.error('Price estimation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate price estimate' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/listings/[id]/estimate
 * Manually update price estimate (admin override)
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role only for manual overrides
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { id: listingId } = await params
    const body = await request.json()

    const { estimateLow, estimateHigh } = body

    if (typeof estimateLow !== 'number' || typeof estimateHigh !== 'number') {
      return NextResponse.json(
        { error: 'estimateLow and estimateHigh must be numbers' },
        { status: 400 }
      )
    }

    if (estimateLow > estimateHigh) {
      return NextResponse.json(
        { error: 'estimateLow cannot be greater than estimateHigh' },
        { status: 400 }
      )
    }

    // Get current values for audit
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { estimateLow: true, estimateHigh: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Update estimate
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        estimateLow: Math.round(estimateLow),
        estimateHigh: Math.round(estimateHigh),
      },
    })

    // Log the override
    await prisma.auditLog.create({
      data: {
        action: 'OVERRIDE_PRICE_ESTIMATE',
        resourceType: 'Listing',
        resourceId: listingId,
        actorId: session.user.id,
        details: {
          previousLow: listing.estimateLow,
          previousHigh: listing.estimateHigh,
          newLow: estimateLow,
          newHigh: estimateHigh,
        } as object,
      },
    })

    return NextResponse.json({
      success: true,
      listingId,
      estimateLow: Math.round(estimateLow),
      estimateHigh: Math.round(estimateHigh),
    })
  } catch (error) {
    console.error('Price estimate update error:', error)
    return NextResponse.json(
      { error: 'Failed to update price estimate' },
      { status: 500 }
    )
  }
}
