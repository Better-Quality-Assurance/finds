import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireReviewer } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { rejectListing } from '@/services/listing.service'
import { prisma } from '@/lib/db'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { sendListingRejectedEmail } from '@/lib/email'

type RouteParams = { params: Promise<{ id: string }> }

export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()

    // Require reviewer role (ADMIN, MODERATOR, or REVIEWER)
    const user = await requireReviewer(session)

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      throw new ValidationError(
        'Rejection reason must be at least 10 characters',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { field: 'reason' }
      )
    }

    // Get service container
    const container = getContainer()

    // Reject listing
    const listing = await rejectListing(id, user.id, reason)

    // Log listing rejection
    await container.audit.logAuditEvent({
      actorId: user.id,
      action: 'LISTING_REJECTED',
      resourceType: 'LISTING',
      resourceId: listing.id,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        reason,
      },
    })

    console.log(`Listing ${listing.id} rejected by ${user.id}`)

    // Send notification to seller
    await container.notifications.notifyListingRejected(
      listing.sellerId,
      listing.id,
      listing.title,
      reason
    ).catch(err => console.error('Failed to notify seller:', err))

    // Get seller email and send email notification
    const seller = await prisma.user.findUnique({
      where: { id: listing.sellerId },
      select: { email: true, name: true },
    })

    if (seller?.email) {
      await sendListingRejectedEmail(
        seller.email,
        seller.name || 'Seller',
        listing.title,
        reason
      ).catch(err => console.error('Failed to send rejection email:', err))
    }

    return successResponse(listing)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.reject',
    auditLog: true,
  }
)
