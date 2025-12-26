import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { createListingSchema } from '@/lib/validation-schemas'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError(
        'You must be logged in to create a listing',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    // Check if user has verified their email
    if (!session.user.emailVerified) {
      throw new ForbiddenError(
        'Please verify your email before creating a listing',
        ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED
      )
    }

    const body = await request.json()
    const data = createListingSchema.parse(body)

    const container = getContainer()
    const listing = await container.listings.createListing({
      ...data,
      sellerId: session.user.id,
    })

    return successResponse(listing, 201)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'listing.create',
    auditLog: true,
  }
)

export const GET = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError(
        'You must be logged in to view your listings',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any

    const container = getContainer()
    const listings = await container.listings.getSellerListings(session.user.id, status)

    return successResponse(listings)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'listing.list',
  }
)
