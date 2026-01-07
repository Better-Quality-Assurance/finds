import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { z } from 'zod'
import {
  adminAddMediaByUrl,
  adminUpdateMedia,
  adminDeleteMedia,
} from '@/services/listing.service'
import { prisma } from '@/lib/db'

const addMediaByUrlSchema = z.object({
  url: z.string().url('Invalid URL'),
  category: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

const updateMediaSchema = z.object({
  mediaId: z.string(),
  position: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
  category: z.string().optional(),
})

const deleteMediaSchema = z.object({
  mediaId: z.string(),
})

// POST - Add media by URL (for mock data / external images)
export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    const user = await requireAdminOrModerator(session)

    const { id: listingId } = await params
    const body = await request.json()

    const parseResult = addMediaByUrlSchema.safeParse(body)
    if (!parseResult.success) {
      throw new ValidationError(
        'Invalid media data',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { errors: parseResult.error.flatten().fieldErrors }
      )
    }

    // Get listing title for audit log
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { title: true },
    })

    try {
      const media = await adminAddMediaByUrl(listingId, parseResult.data.url, {
        category: parseResult.data.category,
        isPrimary: parseResult.data.isPrimary,
      })

      const container = getContainer()
      await container.audit.logAuditEvent({
        actorId: user.id,
        action: 'MEDIA_ADDED',
        resourceType: 'LISTING',
        resourceId: listingId,
        severity: 'LOW',
        status: 'SUCCESS',
        details: {
          listingTitle: listing?.title,
          mediaId: media.id,
          url: parseResult.data.url,
          externalUrl: true,
          adminAction: true,
        },
      })

      return successResponse({ media })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Listing not found') {
          throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
        }
        // URL validation errors
        if (
          error.message.includes('URL must use HTTPS') ||
          error.message.includes('blocked network') ||
          error.message.includes('not in the allowed list') ||
          error.message.includes('Invalid URL')
        ) {
          throw new ValidationError(error.message, ERROR_CODES.VALIDATION_INVALID_INPUT, {
            url: parseResult.data.url,
          })
        }
      }
      throw error
    }
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.media.add',
  }
)

// PATCH - Update media (position, primary, category)
export const PATCH = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    const user = await requireAdminOrModerator(session)

    const { id: listingId } = await params
    const body = await request.json()

    const parseResult = updateMediaSchema.safeParse(body)
    if (!parseResult.success) {
      throw new ValidationError(
        'Invalid update data',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { errors: parseResult.error.flatten().fieldErrors }
      )
    }

    const { mediaId, ...updateData } = parseResult.data

    // Get listing title for audit log
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { title: true },
    })

    try {
      const media = await adminUpdateMedia(mediaId, listingId, updateData)

      const container = getContainer()
      await container.audit.logAuditEvent({
        actorId: user.id,
        action: 'MEDIA_UPDATED',
        resourceType: 'LISTING',
        resourceId: listingId,
        severity: 'LOW',
        status: 'SUCCESS',
        details: {
          listingTitle: listing?.title,
          mediaId,
          updates: updateData,
          adminAction: true,
        },
      })

      return successResponse({ media })
    } catch (error) {
      if (error instanceof Error && error.message === 'Media not found') {
        throw new NotFoundError('Media not found', ERROR_CODES.RESOURCE_NOT_FOUND)
      }
      throw error
    }
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.media.update',
  }
)

// DELETE - Remove media
export const DELETE = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth()
    const user = await requireAdminOrModerator(session)

    const { id: listingId } = await params
    const body = await request.json()

    const parseResult = deleteMediaSchema.safeParse(body)
    if (!parseResult.success) {
      throw new ValidationError(
        'Invalid delete data',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { errors: parseResult.error.flatten().fieldErrors }
      )
    }

    // Get listing title for audit log
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { title: true },
    })

    try {
      const { deletedPosition, mediaUrl } = await adminDeleteMedia(
        parseResult.data.mediaId,
        listingId
      )

      const container = getContainer()
      await container.audit.logAuditEvent({
        actorId: user.id,
        action: 'MEDIA_DELETED',
        resourceType: 'LISTING',
        resourceId: listingId,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: {
          listingTitle: listing?.title,
          mediaId: parseResult.data.mediaId,
          mediaUrl,
          deletedPosition,
          adminAction: true,
        },
      })

      return successResponse({ deleted: true })
    } catch (error) {
      if (error instanceof Error && error.message === 'Media not found') {
        throw new NotFoundError('Media not found', ERROR_CODES.RESOURCE_NOT_FOUND)
      }
      throw error
    }
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.media.delete',
  }
)
