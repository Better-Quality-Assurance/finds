import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { rejectListing } from '@/services/listing.service'
import { prisma } from '@/lib/db'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

type RouteParams = { params: Promise<{ id: string }> }

export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError(
        'You must be logged in',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    // Check if user has admin/moderator role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      throw new ForbiddenError(
        'You do not have permission to reject listings',
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
      )
    }

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

    const listing = await rejectListing(id, session.user.id, reason)

    return successResponse(listing)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.reject',
    auditLog: true,
  }
)
