import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/fraud/[id]
 *
 * Get detailed information about a specific fraud alert.
 * Admin/Moderator only.
 */
export const GET = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const session = await auth()

    // Require admin or moderator role
    await requireAdminOrModerator(session)

    const container = getContainer()
    const { id } = await context.params

    // Fetch alert details
    const alert = await container.prisma.fraudAlert.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            biddingEnabled: true,
          },
        },
      },
    })

    if (!alert) {
      throw new NotFoundError(
        'Fraud alert not found',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        { alertId: id }
      )
    }

    // Get user's fraud history if there's a user
    let userHistory = null
    if (alert.userId) {
      userHistory = await container.fraud.getUserFraudHistory(alert.userId)
    }

    // Get related bids if this is about an auction
    let relatedBids = null
    if (alert.auctionId) {
      relatedBids = await container.prisma.bid.findMany({
        where: { auctionId: alert.auctionId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          bidder: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    }

    return successResponse({
      alert,
      userHistory,
      relatedBids,
    })
  },
  {
    requiresAuth: true,
    resourceType: 'fraud_alert',
    action: 'admin.fraud.get_details',
    auditLog: false,
  }
)

const reviewSchema = z.object({
  status: z.enum(['INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']),
  notes: z.string().optional(),
})

/**
 * PUT /api/admin/fraud/[id]
 *
 * Review and update the status of a fraud alert.
 * Admin/Moderator only.
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, context: RouteContext) => {
    const session = await auth()

    // Require admin or moderator role
    const user = await requireAdminOrModerator(session)

    const container = getContainer()
    const { id } = await context.params

    // Parse and validate request body
    const body = await request.json()
    const { status, notes } = reviewSchema.parse(body)

    // Review the fraud alert
    const alert = await container.fraud.reviewFraudAlert(
      id,
      user.id,
      status,
      notes
    )

    return successResponse({ alert })
  },
  {
    requiresAuth: true,
    resourceType: 'fraud_alert',
    action: 'admin.fraud.review',
    auditLog: true,
  }
)
