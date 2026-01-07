import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { prisma } from '@/lib/db'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { z } from 'zod'

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

    // Check listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true },
    })

    if (!listing) {
      throw new NotFoundError('Listing not found', ERROR_CODES.RESOURCE_NOT_FOUND)
    }

    // Get current max position
    const maxPositionMedia = await prisma.listingMedia.findFirst({
      where: { listingId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const nextPosition = (maxPositionMedia?.position ?? -1) + 1

    // If setting as primary, unset other primary images
    if (parseResult.data.isPrimary) {
      await prisma.listingMedia.updateMany({
        where: { listingId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    // Create media record with external URL
    const media = await prisma.listingMedia.create({
      data: {
        listingId,
        type: 'PHOTO',
        publicUrl: parseResult.data.url,
        thumbnailUrl: parseResult.data.url,
        storagePath: `external/${listingId}/${nextPosition}.jpg`,
        position: nextPosition,
        isPrimary: parseResult.data.isPrimary ?? (nextPosition === 0),
        category: parseResult.data.category,
      },
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
        listingTitle: listing.title,
        mediaId: media.id,
        url: parseResult.data.url,
        adminAction: true,
      },
    })

    return successResponse({ media })
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

    // Check media exists and belongs to listing
    const existingMedia = await prisma.listingMedia.findFirst({
      where: { id: mediaId, listingId },
      include: { listing: { select: { title: true } } },
    })

    if (!existingMedia) {
      throw new NotFoundError('Media not found', ERROR_CODES.RESOURCE_NOT_FOUND)
    }

    // If setting as primary, unset other primary images
    if (updateData.isPrimary) {
      await prisma.listingMedia.updateMany({
        where: { listingId, isPrimary: true, id: { not: mediaId } },
        data: { isPrimary: false },
      })
    }

    const media = await prisma.listingMedia.update({
      where: { id: mediaId },
      data: updateData,
    })

    const container = getContainer()
    await container.audit.logAuditEvent({
      actorId: user.id,
      action: 'MEDIA_UPDATED',
      resourceType: 'LISTING',
      resourceId: listingId,
      severity: 'LOW',
      status: 'SUCCESS',
      details: {
        listingTitle: existingMedia.listing.title,
        mediaId,
        updates: updateData,
        adminAction: true,
      },
    })

    return successResponse({ media })
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

    // Check media exists and belongs to listing
    const existingMedia = await prisma.listingMedia.findFirst({
      where: { id: parseResult.data.mediaId, listingId },
      include: { listing: { select: { title: true } } },
    })

    if (!existingMedia) {
      throw new NotFoundError('Media not found', ERROR_CODES.RESOURCE_NOT_FOUND)
    }

    // Delete media record
    await prisma.listingMedia.delete({
      where: { id: parseResult.data.mediaId },
    })

    // If deleted media was primary, set next image as primary
    if (existingMedia.isPrimary) {
      const nextMedia = await prisma.listingMedia.findFirst({
        where: { listingId },
        orderBy: { position: 'asc' },
      })
      if (nextMedia) {
        await prisma.listingMedia.update({
          where: { id: nextMedia.id },
          data: { isPrimary: true },
        })
      }
    }

    const container = getContainer()
    await container.audit.logAuditEvent({
      actorId: user.id,
      action: 'MEDIA_DELETED',
      resourceType: 'LISTING',
      resourceId: listingId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        listingTitle: existingMedia.listing.title,
        mediaId: parseResult.data.mediaId,
        mediaUrl: existingMedia.publicUrl,
        adminAction: true,
      },
    })

    return successResponse({ deleted: true })
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'admin.listing.media.delete',
  }
)
