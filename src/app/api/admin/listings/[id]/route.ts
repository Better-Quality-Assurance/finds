import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { prisma } from '@/lib/db'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { updateListingSchema } from '@/lib/validation-schemas'

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

    // Validate input
    const parseResult = updateListingSchema.safeParse(body)
    if (!parseResult.success) {
      throw new ValidationError(
        'Invalid listing data',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { errors: parseResult.error.flatten().fieldErrors }
      )
    }

    // Check listing exists
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
      },
    })

    if (!existingListing) {
      throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
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

    // Log audit event
    await container.audit.logAuditEvent({
      actorId: user.id,
      action: 'LISTING_UPDATED',
      resourceType: 'LISTING',
      resourceId: id,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        listingTitle: updatedListing.title,
        previousTitle: existingListing.title,
        updatedFields: Object.keys(parseResult.data),
        adminEdit: true,
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
