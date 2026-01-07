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

// Allowed external image domains for security (SSRF prevention)
const ALLOWED_IMAGE_DOMAINS = [
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'picsum.photos',
  'fastly.picsum.photos',
  'images.unsplash.com',
  'source.unsplash.com',
  'placehold.co',
  // R2 storage domains
  'pub-', // R2 public bucket prefix
]

// Blocked patterns (internal networks, localhost, etc.)
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  /^file:/i,
  /^ftp:/i,
]

/**
 * Validate external URL for security
 * - Must be HTTPS (except localhost in dev)
 * - Must be from allowed domains
 * - Must not be internal network
 */
function validateExternalUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'URL must use HTTPS protocol' }
    }

    // Check against blocked patterns (SSRF prevention)
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(url)) {
        return { valid: false, reason: 'URL points to blocked network range' }
      }
    }

    // Check against allowed domains
    const hostname = parsed.hostname.toLowerCase()
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some((domain) => {
      if (domain.endsWith('-')) {
        // Prefix match (e.g., 'pub-' for R2 buckets)
        return hostname.startsWith(domain)
      }
      return hostname === domain || hostname.endsWith('.' + domain)
    })

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Domain '${hostname}' is not in the allowed list. Allowed: ${ALLOWED_IMAGE_DOMAINS.join(', ')}`,
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

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

// Helper: Ensure only one primary image
async function ensureSinglePrimaryImage(listingId: string, primaryId?: string) {
  await prisma.listingMedia.updateMany({
    where: {
      listingId,
      isPrimary: true,
      ...(primaryId ? { id: { not: primaryId } } : {}),
    },
    data: { isPrimary: false },
  })
}

// Helper: Reorder media positions after deletion
async function reorderMediaPositions(listingId: string, deletedPosition: number) {
  await prisma.listingMedia.updateMany({
    where: {
      listingId,
      position: { gt: deletedPosition },
    },
    data: {
      position: { decrement: 1 },
    },
  })
}

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

    // Security: Validate external URL
    const urlValidation = validateExternalUrl(parseResult.data.url)
    if (!urlValidation.valid) {
      throw new ValidationError(
        urlValidation.reason || 'Invalid URL',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { url: parseResult.data.url }
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
      await ensureSinglePrimaryImage(listingId)
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
        externalUrl: true,
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
      await ensureSinglePrimaryImage(listingId, mediaId)
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

    const deletedPosition = existingMedia.position
    const wasPrimary = existingMedia.isPrimary

    // Delete media record
    await prisma.listingMedia.delete({
      where: { id: parseResult.data.mediaId },
    })

    // Reorder remaining media positions to close the gap
    await reorderMediaPositions(listingId, deletedPosition)

    // If deleted media was primary, set next image as primary
    if (wasPrimary) {
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
        deletedPosition,
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
