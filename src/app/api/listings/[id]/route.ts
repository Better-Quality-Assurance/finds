import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { updateListingSchema } from '@/lib/validation-schemas'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { NotFoundError, UnauthorizedError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

type RouteParams = { params: Promise<{ id: string }> }

export const GET = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const container = getContainer()
    const listing = await container.listings.getListingById(id)

    if (!listing) {
      throw new NotFoundError(
        'Listing not found',
        ERROR_CODES.LISTING_NOT_FOUND
      )
    }

    return successResponse(listing)
  },
  {
    resourceType: 'listing',
    action: 'listing.read',
  }
)

export const PATCH = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError(
        'You must be logged in to update a listing',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    const { id } = await params
    const body = await request.json()
    const data = updateListingSchema.parse(body)

    const container = getContainer()
    const listing = await container.listings.updateListing(id, session.user.id, data)

    return successResponse(listing)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'listing.update',
    auditLog: true,
  }
)
