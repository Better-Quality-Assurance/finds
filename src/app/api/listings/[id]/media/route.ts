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
import { withRetrySafe } from '@/utils/retry'
import { notifyLicensePlateDetected } from '@/services/notification.service'
import { sendLicensePlateDetectionEmail } from '@/lib/email'

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
              // Retry blur operation with exponential backoff
              const retryResult = await withRetrySafe(
                async () => {
                  const blurResult = await blurLicensePlates(media.publicUrl!, highConfidencePlates)

                  if (!blurResult.success || !blurResult.blurredBuffer) {
                    throw new Error(blurResult.error || 'Blur operation failed')
                  }

                  return blurResult
                },
                {
                  maxRetries: 3,
                  baseDelay: 1000, // 1s, 2s, 4s delays
                  onRetry: (attempt, error) => {
                    console.log(
                      `Retrying blur operation for media ${media.id} (attempt ${attempt}/3):`,
                      error.message
                    )
                  },
                }
              )

              if (retryResult.success && retryResult.value) {
                const blurResult = retryResult.value

                // Generate key for blurred version
                const blurredKey = media.storagePath.replace(/(\.[^.]+)$/, '-blurred$1')

                // Upload blurred image to R2 via container
                const uploadResult = await container.storage.uploadToR2(
                  blurResult.blurredBuffer!,
                  blurredKey,
                  blurResult.blurredMimeType || 'image/jpeg'
                )

                console.log(
                  `Blurred image uploaded for media ${media.id} after ${retryResult.attempts} attempt(s): ${uploadResult.url}`
                )

                // Update media record with blurred URL as public, keep original for admin
                await container.prisma.listingMedia.update({
                  where: { id: media.id },
                  data: {
                    licensePlateDetected: true,
                    licensePlateBlurred: true,
                    plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(result))),
                    originalUrl: media.publicUrl, // Keep original for admin access
                    publicUrl: uploadResult.url,  // Replace public URL with blurred version
                    needsManualReview: false, // Successfully blurred
                  },
                })

                // Send notifications to seller (non-blocking)
                const plateCount = highConfidencePlates.length
                const listingUrl = `${process.env.NEXTAUTH_URL}/sell/listings/${id}`

                // Send Pusher notification
                notifyLicensePlateDetected(
                  listing.sellerId,
                  id,
                  listing.title,
                  media.id,
                  plateCount,
                  true
                ).catch(error => {
                  console.error(`Failed to send notification for media ${media.id}:`, error)
                })

                // Get seller email and send email notification
                container.prisma.user.findUnique({
                  where: { id: listing.sellerId },
                  select: { email: true },
                }).then(seller => {
                  if (seller?.email) {
                    sendLicensePlateDetectionEmail(
                      seller.email,
                      listing.title,
                      plateCount,
                      true,
                      listingUrl
                    ).catch(error => {
                      console.error(`Failed to send email notification for media ${media.id}:`, error)
                    })
                  }
                }).catch(error => {
                  console.error(`Failed to fetch seller for notification:`, error)
                })
              } else {
                // All retries failed, mark for manual review
                console.error(
                  `Failed to blur plates for media ${media.id} after ${retryResult.attempts} attempt(s):`,
                  retryResult.error?.message
                )

                await container.prisma.listingMedia.update({
                  where: { id: media.id },
                  data: {
                    licensePlateDetected: true,
                    licensePlateBlurred: false,
                    needsManualReview: true, // Flag for manual review
                    plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(result))),
                    originalUrl: media.publicUrl,
                  },
                })

                // Log error for monitoring/alerting
                console.error(
                  `MANUAL REVIEW REQUIRED: License plate blur failed for media ${media.id} in listing ${id}. ` +
                  `Error: ${retryResult.error?.message}. High-confidence plates detected: ${highConfidencePlates.length}`
                )

                // Send notifications to seller about manual review needed (non-blocking)
                const plateCount = highConfidencePlates.length
                const listingUrl = `${process.env.NEXTAUTH_URL}/sell/listings/${id}`

                // Send Pusher notification
                notifyLicensePlateDetected(
                  listing.sellerId,
                  id,
                  listing.title,
                  media.id,
                  plateCount,
                  false
                ).catch(error => {
                  console.error(`Failed to send notification for media ${media.id}:`, error)
                })

                // Get seller email and send email notification
                container.prisma.user.findUnique({
                  where: { id: listing.sellerId },
                  select: { email: true },
                }).then(seller => {
                  if (seller?.email) {
                    sendLicensePlateDetectionEmail(
                      seller.email,
                      listing.title,
                      plateCount,
                      false,
                      listingUrl
                    ).catch(error => {
                      console.error(`Failed to send email notification for media ${media.id}:`, error)
                    })
                  }
                }).catch(error => {
                  console.error(`Failed to fetch seller for notification:`, error)
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
