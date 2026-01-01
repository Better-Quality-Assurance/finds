/**
 * API endpoint for relisting expired listings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createRelistService } from '@/services/listing-relist.service'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/listings/[id]/relist - Create a new listing from expired one
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: listingId } = await params

    // Parse options from body
    let applyImprovements = true
    try {
      const body = await request.json()
      applyImprovements = body.applyImprovements !== false
    } catch {
      // Default to applying improvements if no body
    }

    const relistService = createRelistService()

    const result = await relistService.relistListing(
      listingId,
      session.user.id,
      { applyImprovements }
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      newListingId: result.newListingId,
      message: 'Listing relisted successfully. You can now edit and resubmit.',
      editUrl: `/sell?edit=${result.newListingId}`,
    })
  } catch (error) {
    console.error('Failed to relist:', error)
    return NextResponse.json(
      { error: 'Failed to relist listing' },
      { status: 500 }
    )
  }
}
