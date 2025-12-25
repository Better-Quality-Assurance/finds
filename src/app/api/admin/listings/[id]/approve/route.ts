import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { approveListing } from '@/services/listing.service'
import { createAuction } from '@/services/auction.service'
import { prisma } from '@/lib/db'
import { AUCTION_RULES } from '@/domain/auction/rules'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin/moderator/reviewer role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Parse optional auction scheduling parameters from request body
    const body = await request.json().catch(() => ({}))
    const startTime = body.startTime ? new Date(body.startTime) : new Date()
    const durationDays = body.durationDays || AUCTION_RULES.DEFAULT_DURATION_DAYS

    // Validate duration
    if (durationDays < AUCTION_RULES.MIN_DURATION_DAYS || durationDays > AUCTION_RULES.MAX_DURATION_DAYS) {
      return NextResponse.json(
        {
          error: `Duration must be between ${AUCTION_RULES.MIN_DURATION_DAYS} and ${AUCTION_RULES.MAX_DURATION_DAYS} days`
        },
        { status: 400 }
      )
    }

    // Get service container
    const container = getContainer()

    // Approve listing
    const listing = await approveListing(id, session.user.id)

    // Create auction automatically
    let auction
    try {
      auction = await createAuction(listing.id, startTime, durationDays)

      // Log auction creation in audit log
      await container.audit.logAuditEvent({
        actorId: session.user.id,
        action: 'AUCTION_CREATED',
        resourceType: 'AUCTION',
        resourceId: auction.id,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: {
          listingId: listing.id,
          listingTitle: listing.title,
          startTime: auction.startTime,
          endTime: auction.currentEndTime,
          startingPrice: auction.startingPrice.toString(),
          reservePrice: auction.reservePrice?.toString(),
          status: auction.status,
          durationDays,
        },
      })

      // Log listing approval
      await container.audit.logAuditEvent({
        actorId: session.user.id,
        action: 'LISTING_APPROVED',
        resourceType: 'LISTING',
        resourceId: listing.id,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: {
          listingTitle: listing.title,
          sellerId: listing.sellerId,
          auctionId: auction.id,
          auctionCreated: true,
        },
      })

      console.log(`Listing ${listing.id} approved and auction ${auction.id} created (${auction.status})`)

      // Send notifications if auction is active (not scheduled for future)
      if (auction.status === 'ACTIVE') {
        // Notify seller
        await container.notifications.notifyListingApproved(
          listing.sellerId,
          listing.id,
          listing.title,
          auction.id,
          auction.currentEndTime
        ).catch(err => console.error('Failed to notify seller:', err))

        // Broadcast to public channel that new auction is live
        const primaryImage = await prisma.listingMedia.findFirst({
          where: { listingId: listing.id, isPrimary: true },
          select: { publicUrl: true },
        })

        await container.notifications.broadcastAuctionLive(
          auction.id,
          listing.title,
          Number(auction.startingPrice),
          auction.currency,
          auction.currentEndTime,
          primaryImage?.publicUrl
        ).catch(err => console.error('Failed to broadcast auction live:', err))
      }
    } catch (auctionError) {
      // Log failed auction creation but don't fail the approval
      console.error('Failed to create auction after approval:', auctionError)

      await container.audit.logAuditEvent({
        actorId: session.user.id,
        action: 'AUCTION_CREATED',
        resourceType: 'AUCTION',
        resourceId: listing.id,
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage: auctionError instanceof Error ? auctionError.message : 'Unknown error',
        details: {
          listingId: listing.id,
          listingTitle: listing.title,
        },
      })

      return NextResponse.json(
        {
          error: 'Listing approved but auction creation failed: ' + (auctionError instanceof Error ? auctionError.message : 'Unknown error'),
          listing
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ listing, auction })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('Cannot approve')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('Approve listing error:', error)
    return NextResponse.json(
      { error: 'Failed to approve listing' },
      { status: 500 }
    )
  }
}
