import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { LISTING_RULES, validateFileType, validateFileSize } from '@/domain/listing/rules'
import { listingStatusValidator } from '@/services/validators/listing-status.validator'
import { z } from 'zod'
import { MediaType } from '@prisma/client'
import {
  detectLicensePlates,
  createStoredDetection,
  blurLicensePlates,
} from '@/services/ai/license-plate.service'
import { uploadToR2 } from '@/lib/r2'

type RouteParams = { params: Promise<{ id: string }> }

// Get presigned upload URL
const getUploadUrlSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  type: z.enum(['PHOTO', 'VIDEO']),
  category: z.string().optional(),
})

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = getUploadUrlSchema.parse(body)

    const container = getContainer()

    // Verify listing ownership
    const listing = await container.listings.getListingById(id)
    if (!listing || listing.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Listing not found or unauthorized' },
        { status: 403 }
      )
    }

    if (!listingStatusValidator.isEditable(listing.status)) {
      return NextResponse.json(
        { error: 'Cannot add media to listing in current status' },
        { status: 400 }
      )
    }

    // Validate file type
    const mediaType = data.type.toLowerCase() as 'photo' | 'video'
    if (!validateFileType(data.contentType, mediaType)) {
      return NextResponse.json(
        { error: `Invalid file type for ${mediaType}` },
        { status: 400 }
      )
    }

    // Check limits
    const existingMedia = listing.media.filter(
      (m) => m.type === data.type
    )
    const maxCount =
      data.type === 'PHOTO' ? LISTING_RULES.MAX_PHOTOS : LISTING_RULES.MAX_VIDEOS
    if (existingMedia.length >= maxCount) {
      return NextResponse.json(
        { error: `Maximum ${maxCount} ${mediaType}s allowed` },
        { status: 400 }
      )
    }

    // Generate key and presigned URL
    const key = container.storage.generateMediaKey(id, mediaType, data.filename)
    const uploadUrl = await container.storage.getSignedUploadUrl(key, data.contentType, 3600)

    // Create a pending media record to get the ID
    const position = existingMedia.length

    const pendingMedia = await container.prisma.listingMedia.create({
      data: {
        listingId: id,
        type: data.type as MediaType,
        storagePath: key,
        publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
        position,
        isPrimary: false,
        category: data.category,
        fileSize: 0, // Will be updated on confirm
        mimeType: data.contentType,
      },
    })

    return NextResponse.json({
      uploadUrl,
      key,
      mediaId: pendingMedia.id,
      publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Get upload URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get upload URL' },
      { status: 500 }
    )
  }
}

// Confirm upload - just returns the media record
const confirmUploadSchema = z.object({
  mediaId: z.string().min(1),
})

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = confirmUploadSchema.parse(body)

    const container = getContainer()

    // Verify listing ownership
    const listing = await container.listings.getListingById(id)
    if (!listing || listing.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Listing not found or unauthorized' },
        { status: 403 }
      )
    }

    // Get the media record
    const media = await container.prisma.listingMedia.findUnique({
      where: { id: data.mediaId },
    })

    if (!media || media.listingId !== id) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      )
    }

    // Run license plate detection for photos (non-blocking)
    if (media.type === 'PHOTO' && media.publicUrl) {
      // Run detection in background - don't block the response
      detectLicensePlates(media.publicUrl)
        .then(async (result) => {
          if (result.detected) {
            console.log(`License plate detected in media ${media.id}:`, result.plates.length, 'plates')

            // Filter for high-confidence plates
            const highConfidencePlates = result.plates.filter(p => p.confidence >= 0.7)

            if (highConfidencePlates.length > 0) {
              // Blur the plates and upload the blurred version
              const blurResult = await blurLicensePlates(media.publicUrl!, highConfidencePlates)

              if (blurResult.success && blurResult.blurredBuffer) {
                // Generate key for blurred version
                const blurredKey = media.storagePath.replace(/(\.[^.]+)$/, '-blurred$1')

                // Upload blurred image to R2
                const uploadResult = await uploadToR2(
                  blurResult.blurredBuffer,
                  blurredKey,
                  blurResult.blurredMimeType || 'image/jpeg'
                )

                console.log(`Blurred image uploaded for media ${media.id}: ${uploadResult.url}`)

                // Update media record with blurred URL as public, keep original for admin
                await container.prisma.listingMedia.update({
                  where: { id: media.id },
                  data: {
                    licensePlateDetected: true,
                    licensePlateBlurred: true,
                    plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(result))),
                    originalUrl: media.publicUrl, // Keep original for admin access
                    publicUrl: uploadResult.url,  // Replace public URL with blurred version
                  },
                })
              } else {
                // Blur failed, just mark as detected
                console.error(`Failed to blur plates for media ${media.id}:`, blurResult.error)
                await container.prisma.listingMedia.update({
                  where: { id: media.id },
                  data: {
                    licensePlateDetected: true,
                    plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(result))),
                    originalUrl: media.publicUrl,
                  },
                })
              }
            } else {
              // Plates detected but low confidence, just mark as detected
              await container.prisma.listingMedia.update({
                where: { id: media.id },
                data: {
                  licensePlateDetected: true,
                  plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(result))),
                  originalUrl: media.publicUrl,
                },
              })
            }
          } else {
            // Mark as checked (no plates found)
            await container.prisma.listingMedia.update({
              where: { id: media.id },
              data: {
                licensePlateDetected: false,
                plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(result))),
              },
            })
          }
        })
        .catch((error) => {
          console.error(`License plate detection failed for media ${media.id}:`, error)
        })
    }

    return NextResponse.json({ media })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Confirm upload error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm upload' },
      { status: 500 }
    )
  }
}
