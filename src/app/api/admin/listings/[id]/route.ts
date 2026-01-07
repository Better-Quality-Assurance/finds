import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { prisma } from '@/lib/db'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { updateListingSchema } from '@/lib/validation-schemas'

// Statuses that are safe to edit without restrictions
const SAFE_EDIT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED']

// Statuses that require admin override confirmation
const RESTRICTED_EDIT_STATUSES = ['APPROVED', 'ACTIVE', 'SOLD', 'WITHDRAWN', 'EXPIRED']

export const GET = withErrorHandler<{ id: string }>(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    await requireAdminOrModerator(session)

    const { id } = await params

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: {
          orderBy: { position: 'asc' },
        },
        auction: {
          select: {
            id: true,
            status: true,
            bidCount: true,
          },
        },
      },
    })

    if (!listing) {
      throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
    }

    return successResponse({ listing })
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

    // Check for admin override flag (allows editing restricted statuses)
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

    // Check listing exists with auction and bid info
    const existingListing = await prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        make: true,
        model: true,
        year: true,
        status: true,
        startingPrice: true,
        reservePrice: true,
        auction: {
          select: {
            id: true,
            status: true,
            bidCount: true,
          },
        },
      },
    })

    if (!existingListing) {
      throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
    }

    // Status validation: Check if editing is allowed
    const isRestrictedStatus = RESTRICTED_EDIT_STATUSES.includes(existingListing.status)
    const hasActiveBids = existingListing.auction?.bidCount && existingListing.auction.bidCount > 0
    const isActiveAuction = existingListing.auction?.status === 'ACTIVE'

    if (isRestrictedStatus && !adminOverride) {
      throw new ForbiddenError(
        `Cannot edit listing in ${existingListing.status} status without admin override`,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        { status: existingListing.status, requiresOverride: true }
      )
    }

    // Extra protection: Listings with active bids require ADMIN role (not just MODERATOR)
    if (hasActiveBids && isActiveAuction) {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenError(
          'Only ADMIN can edit listings with active bids',
          ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
          { bidCount: existingListing.auction?.bidCount, auctionStatus: existingListing.auction?.status }
        )
      }
      if (!adminOverride) {
        throw new ForbiddenError(
          'Editing a listing with active bids requires explicit admin override',
          ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
          { bidCount: existingListing.auction?.bidCount, requiresOverride: true }
        )
      }
    }

    // Validate reserve price >= starting price if both provided
    const finalStartingPrice = parseResult.data.startingPrice ?? Number(existingListing.startingPrice)
    const finalReservePrice = parseResult.data.reservePrice ?? (existingListing.reservePrice ? Number(existingListing.reservePrice) : null)

    if (finalReservePrice !== null && finalReservePrice < finalStartingPrice) {
      throw new ValidationError(
        'Reserve price must be greater than or equal to starting price',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { startingPrice: finalStartingPrice, reservePrice: finalReservePrice }
      )
    }

    const container = getContainer()

    // Update listing
    const updatedListing = await prisma.listing.update({
      where: { id },
      data: parseResult.data,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        media: {
          orderBy: { position: 'asc' },
        },
      },
    })

    // Log audit event with comprehensive details
    await container.audit.logAuditEvent({
      actorId: user.id,
      action: 'LISTING_UPDATED',
      resourceType: 'LISTING',
      resourceId: id,
      severity: isRestrictedStatus || hasActiveBids ? 'HIGH' : 'MEDIUM',
      status: 'SUCCESS',
      details: {
        listingTitle: updatedListing.title,
        previousTitle: existingListing.title,
        updatedFields: Object.keys(parseResult.data),
        adminEdit: true,
        adminOverride,
        listingStatus: existingListing.status,
        hadActiveBids: hasActiveBids,
        auctionStatus: existingListing.auction?.status,
      },
    })

    return successResponse({ listing: updatedListing })
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.update',
    auditLog: true,
  }
)
