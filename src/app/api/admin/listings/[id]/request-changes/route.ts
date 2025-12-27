import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireReviewer } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { requestChanges } from '@/services/listing.service'
import { prisma } from '@/lib/db'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { sendListingChangesRequestedEmail } from '@/lib/email'

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
        'Changes requested reason must be at least 10 characters',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { field: 'reason' }
      )
    }

    // Get service container
    const container = getContainer()

    // Request changes (pass as array to match service signature)
    const listing = await requestChanges(id, user.id, [reason])

    // Log changes requested
    await container.audit.logAuditEvent({
      actorId: user.id,
      action: 'LISTING_CHANGES_REQUESTED',
      resourceType: 'LISTING',
      resourceId: listing.id,
      severity: 'LOW',
      status: 'SUCCESS',
      details: {
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        changes: [reason],
      },
    })

    console.log(`Changes requested for listing ${listing.id} by ${user.id}`)

    // Send notification to seller
    await container.notifications.notifyListingChangesRequested(
      listing.sellerId,
      listing.id,
      listing.title,
      [reason]
    ).catch(err => console.error('Failed to notify seller:', err))

    // Get seller email and send email notification
    const seller = await prisma.user.findUnique({
      where: { id: listing.sellerId },
      select: { email: true, name: true },
    })

    if (seller?.email) {
      const editUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/sell/listings/${listing.id}`
      await sendListingChangesRequestedEmail(
        seller.email,
        seller.name || 'Seller',
        listing.title,
        reason,
        editUrl
      ).catch(err => console.error('Failed to send changes requested email:', err))
    }

    return successResponse(listing)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.request_changes',
    auditLog: true,
  }
)
