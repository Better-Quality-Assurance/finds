import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireReviewer } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { approveListing } from '@/services/listing.service'
import { createAuction } from '@/services/auction.service'
import { prisma } from '@/lib/db'
import { AUCTION_RULES } from '@/domain/auction/rules'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

type RouteParams = { params: Promise<{ id: string }> }

export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()

    // Require reviewer role (ADMIN, MODERATOR, or REVIEWER)
    const user = await requireReviewer(session)

    const { id } = await params

    // Parse optional auction scheduling parameters from request body
    const body = await request.json().catch(() => ({}))
    const startTime = body.startTime ? new Date(body.startTime) : new Date()
    const durationDays = body.durationDays || AUCTION_RULES.DEFAULT_DURATION_DAYS

    // Validate duration
    if (durationDays < AUCTION_RULES.MIN_DURATION_DAYS || durationDays > AUCTION_RULES.MAX_DURATION_DAYS) {
      throw new ValidationError(
        `Duration must be between ${AUCTION_RULES.MIN_DURATION_DAYS} and ${AUCTION_RULES.MAX_DURATION_DAYS} days`,
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { field: 'durationDays', min: AUCTION_RULES.MIN_DURATION_DAYS, max: AUCTION_RULES.MAX_DURATION_DAYS }
      )
    }

    // Get service container
    const container = getContainer()

    // Approve listing
    const listing = await approveListing(id, user.id)

    // Create auction automatically
    let auction
    try {
      auction = await createAuction(listing.id, startTime, durationDays)

      // Log auction creation in audit log
      await container.audit.logAuditEvent({
        actorId: user.id,
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
        actorId: user.id,
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
        actorId: user.id,
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

      throw new AppError(
        'Listing approved but auction creation failed: ' + (auctionError instanceof Error ? auctionError.message : 'Unknown error'),
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        500,
        { listing }
      )
    }

    return successResponse({ listing, auction })
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.approve',
    auditLog: true,
  }
)
