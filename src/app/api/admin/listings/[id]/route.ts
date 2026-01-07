import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { updateListingSchema } from '@/lib/validation-schemas'
import {
  adminGetListing,
  adminUpdateListing,
} from '@/services/listing.service'

export const GET = withErrorHandler<{ id: string }>(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    await requireAdminOrModerator(session)

    const { id } = await params

    try {
      const listing = await adminGetListing(id)
      return successResponse({ listing })
    } catch (error) {
      if (error instanceof Error && error.message === 'Listing not found') {
        throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
      }
      throw error
    }
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.get',
  }
)

export const PUT = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    const user = await requireAdminOrModerator(session)

    const { id } = await params
    const body = await request.json()

    // Extract admin override flag
    const adminOverride = body._adminOverride === true
    delete body._adminOverride

    // Validate input
    const parseResult = updateListingSchema.safeParse(body)
    if (!parseResult.success) {
      throw new ValidationError(
        'Invalid listing data',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { errors: parseResult.error.flatten().fieldErrors }
      )
    }

    const container = getContainer()

    try {
      // Use service layer for business logic
      const result = await adminUpdateListing(id, user.id, parseResult.data, {
        adminOverride,
        adminRole: user.role as 'ADMIN' | 'MODERATOR',
      })

      // Log audit event with comprehensive details
      await container.audit.logAuditEvent({
        actorId: user.id,
        action: 'LISTING_UPDATED',
        resourceType: 'LISTING',
        resourceId: id,
        severity: result.wasRestricted || result.hadActiveBids ? 'HIGH' : 'MEDIUM',
        status: 'SUCCESS',
        details: {
          listingTitle: result.listing.title,
          updatedFields: Object.keys(parseResult.data),
          adminEdit: true,
          adminOverride,
          wasRestricted: result.wasRestricted,
          hadActiveBids: result.hadActiveBids,
        },
      })

      return successResponse({ listing: result.listing })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Listing not found') {
          throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
        }
        if (error.message.includes('without admin override')) {
          throw new ForbiddenError(error.message, ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, {
            requiresOverride: true,
          })
        }
        if (error.message.includes('Only ADMIN can')) {
          throw new ForbiddenError(error.message, ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS)
        }
        if (error.message.includes('Reserve price')) {
          throw new ValidationError(error.message, ERROR_CODES.VALIDATION_INVALID_INPUT)
        }
      }
      throw error
    }
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.update',
    auditLog: true,
  }
)
