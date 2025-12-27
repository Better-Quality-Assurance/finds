/**
 * Media Processing Service
 *
 * Handles background processing of uploaded media including:
 * - License plate detection using AI vision
 * - Automatic plate blurring with retry logic
 * - Database updates and state management
 * - User notifications via Pusher and email
 *
 * Follows SOLID principles:
 * - SRP: Single responsibility for media post-upload processing
 * - OCP: Extensible for new media processing types
 * - LSP: Implements IMediaProcessingService interface
 * - ISP: Focused interface with single method
 * - DIP: Depends on abstractions (interfaces) not concrete implementations
 */

import type { PrismaClient } from '@prisma/client'
import type { IStorageService } from '@/services/contracts'
import type { IMediaProcessingService } from '@/services/contracts/media-processing.interface'
import {
  detectLicensePlates,
  createStoredDetection,
  blurLicensePlates,
  type PlateDetectionBox,
} from '@/services/ai/license-plate.service'
import { withRetrySafe } from '@/utils/retry'
import { notifyLicensePlateDetected } from '@/services/notification.service'
import { sendLicensePlateDetectionEmail } from '@/lib/email'

/**
 * Configuration options for media processing
 */
export interface MediaProcessingConfig {
  /**
   * Minimum confidence score for plate detection (0-1)
   * @default 0.7
   */
  confidenceThreshold?: number

  /**
   * Maximum retry attempts for blur operations
   * @default 3
   */
  maxRetries?: number

  /**
   * Base delay for exponential backoff (milliseconds)
   * @default 1000
   */
  baseRetryDelay?: number

  /**
   * Whether to send notifications on detection
   * @default true
   */
  sendNotifications?: boolean
}

const DEFAULT_CONFIG: Required<MediaProcessingConfig> = {
  confidenceThreshold: 0.7,
  maxRetries: 3,
  baseRetryDelay: 1000,
  sendNotifications: true,
}

/**
 * Media processing service implementation
 * Handles license plate detection and blurring for uploaded photos
 */
export class MediaProcessingService implements IMediaProcessingService {
  private readonly prisma: PrismaClient
  private readonly storage: IStorageService
  private readonly config: Required<MediaProcessingConfig>

  /**
   * Processing lock to prevent concurrent processing of same media
   * Maps mediaId to processing promise
   */
  private readonly processingLocks = new Map<string, Promise<void>>()

  constructor(
    prisma: PrismaClient,
    storage: IStorageService,
    config: MediaProcessingConfig = {}
  ) {
    this.prisma = prisma
    this.storage = storage
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Process uploaded media with license plate detection and blurring
   * Implements concurrency control to prevent duplicate processing
   *
   * @param mediaId - ID of the media record
   * @param publicUrl - Public URL of the uploaded media
   * @param listingId - ID of the listing
   * @param sellerId - ID of the seller
   */
  async processUploadedMedia(
    mediaId: string,
    publicUrl: string,
    listingId: string,
    sellerId: string
  ): Promise<void> {
    // Check if already processing this media
    const existingLock = this.processingLocks.get(mediaId)
    if (existingLock) {
      console.log(`[MediaProcessing] Media ${mediaId} is already being processed, waiting...`)
      return existingLock
    }

    // Create new processing promise
    const processingPromise = this.processMediaInternal(
      mediaId,
      publicUrl,
      listingId,
      sellerId
    ).finally(() => {
      // Clean up lock when done
      this.processingLocks.delete(mediaId)
    })

    // Store lock
    this.processingLocks.set(mediaId, processingPromise)

    return processingPromise
  }

  /**
   * Internal processing logic
   */
  private async processMediaInternal(
    mediaId: string,
    publicUrl: string,
    listingId: string,
    sellerId: string
  ): Promise<void> {
    try {
      console.log(`[MediaProcessing] Starting license plate detection for media ${mediaId}`)

      // Detect license plates
      const detectionResult = await detectLicensePlates(publicUrl)

      if (!detectionResult.detected) {
        // No plates detected, mark as checked
        await this.updateMediaNoPlatesDetected(mediaId, detectionResult, publicUrl)
        console.log(`[MediaProcessing] No license plates detected in media ${mediaId}`)
        return
      }

      console.log(
        `[MediaProcessing] License plates detected in media ${mediaId}:`,
        detectionResult.plates.length,
        'plates'
      )

      // Filter for high-confidence plates
      const highConfidencePlates = detectionResult.plates.filter(
        (p) => p.confidence >= this.config.confidenceThreshold
      )

      if (highConfidencePlates.length === 0) {
        // Plates detected but low confidence, just store detection data
        await this.updateMediaLowConfidencePlates(mediaId, detectionResult, publicUrl)
        console.log(
          `[MediaProcessing] Low confidence plates detected in media ${mediaId}, no blurring needed`
        )
        return
      }

      // High confidence plates detected, attempt to blur them
      await this.blurAndUpdateMedia(
        mediaId,
        publicUrl,
        listingId,
        sellerId,
        highConfidencePlates,
        detectionResult
      )
    } catch (error) {
      console.error(`[MediaProcessing] License plate detection failed for media ${mediaId}:`, error)
      // Don't throw - this is background processing, failures should be logged but not propagated
    }
  }

  /**
   * Blur detected license plates and update media record
   */
  private async blurAndUpdateMedia(
    mediaId: string,
    publicUrl: string,
    listingId: string,
    sellerId: string,
    highConfidencePlates: PlateDetectionBox[],
    detectionResult: any
  ): Promise<void> {
    // Retry blur operation with exponential backoff
    const retryResult = await withRetrySafe(
      async () => {
        const blurResult = await blurLicensePlates(publicUrl, highConfidencePlates)

        if (!blurResult.success || !blurResult.blurredBuffer) {
          throw new Error(blurResult.error || 'Blur operation failed')
        }

        return blurResult
      },
      {
        maxRetries: this.config.maxRetries,
        baseDelay: this.config.baseRetryDelay,
        onRetry: (attempt, error) => {
          console.log(
            `[MediaProcessing] Retrying blur operation for media ${mediaId} (attempt ${attempt}/${this.config.maxRetries}):`,
            error.message
          )
        },
      }
    )

    if (retryResult.success && retryResult.value) {
      // Blur succeeded
      await this.handleSuccessfulBlur(
        mediaId,
        publicUrl,
        listingId,
        sellerId,
        highConfidencePlates,
        detectionResult,
        retryResult.value,
        retryResult.attempts
      )
    } else {
      // All retries failed
      await this.handleFailedBlur(
        mediaId,
        publicUrl,
        listingId,
        sellerId,
        highConfidencePlates,
        detectionResult,
        retryResult.error,
        retryResult.attempts
      )
    }
  }

  /**
   * Handle successful blur operation
   */
  private async handleSuccessfulBlur(
    mediaId: string,
    publicUrl: string,
    listingId: string,
    sellerId: string,
    highConfidencePlates: PlateDetectionBox[],
    detectionResult: any,
    blurResult: any,
    attempts: number
  ): Promise<void> {
    // Generate key for blurred version
    const originalKey = this.extractKeyFromUrl(publicUrl)
    const blurredKey = originalKey.replace(/(\.[^.]+)$/, '-blurred$1')

    // Upload blurred image to R2
    const uploadResult = await this.storage.uploadToR2(
      blurResult.blurredBuffer!,
      blurredKey,
      blurResult.blurredMimeType || 'image/jpeg'
    )

    console.log(
      `[MediaProcessing] Blurred image uploaded for media ${mediaId} after ${attempts} attempt(s): ${uploadResult.url}`
    )

    // Update media record with blurred URL as public, keep original for admin
    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        licensePlateDetected: true,
        licensePlateBlurred: true,
        plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(detectionResult))),
        originalUrl: publicUrl, // Keep original for admin access
        publicUrl: uploadResult.url, // Replace public URL with blurred version
        needsManualReview: false, // Successfully blurred
      },
    })

    // Send notifications if enabled
    if (this.config.sendNotifications) {
      await this.sendNotifications(
        sellerId,
        listingId,
        mediaId,
        highConfidencePlates.length,
        true
      )
    }
  }

  /**
   * Handle failed blur operation (after all retries)
   */
  private async handleFailedBlur(
    mediaId: string,
    publicUrl: string,
    listingId: string,
    sellerId: string,
    highConfidencePlates: PlateDetectionBox[],
    detectionResult: any,
    error: Error | undefined,
    attempts: number
  ): Promise<void> {
    console.error(
      `[MediaProcessing] Failed to blur plates for media ${mediaId} after ${attempts} attempt(s):`,
      error?.message
    )

    // Mark for manual review
    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        licensePlateDetected: true,
        licensePlateBlurred: false,
        needsManualReview: true, // Flag for manual review
        plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(detectionResult))),
        originalUrl: publicUrl,
      },
    })

    // Log for monitoring/alerting
    console.error(
      `[MediaProcessing] MANUAL REVIEW REQUIRED: License plate blur failed for media ${mediaId} in listing ${listingId}. ` +
        `Error: ${error?.message}. High-confidence plates detected: ${highConfidencePlates.length}`
    )

    // Send notifications about manual review needed
    if (this.config.sendNotifications) {
      await this.sendNotifications(
        sellerId,
        listingId,
        mediaId,
        highConfidencePlates.length,
        false
      )
    }
  }

  /**
   * Update media record when no plates detected
   */
  private async updateMediaNoPlatesDetected(
    mediaId: string,
    detectionResult: any,
    publicUrl: string
  ): Promise<void> {
    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        licensePlateDetected: false,
        plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(detectionResult))),
      },
    })
  }

  /**
   * Update media record when low confidence plates detected
   */
  private async updateMediaLowConfidencePlates(
    mediaId: string,
    detectionResult: any,
    publicUrl: string
  ): Promise<void> {
    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        licensePlateDetected: true,
        plateDetectionData: JSON.parse(JSON.stringify(createStoredDetection(detectionResult))),
        originalUrl: publicUrl,
      },
    })
  }

  /**
   * Send notifications to seller about license plate detection
   */
  private async sendNotifications(
    sellerId: string,
    listingId: string,
    mediaId: string,
    plateCount: number,
    wasBlurred: boolean
  ): Promise<void> {
    const listingUrl = `${process.env.NEXTAUTH_URL}/sell/listings/${listingId}`

    // Get listing title for notifications
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { title: true },
    })

    if (!listing) {
      console.error(`[MediaProcessing] Listing ${listingId} not found for notifications`)
      return
    }

    // Send Pusher notification (non-blocking)
    notifyLicensePlateDetected(
      sellerId,
      listingId,
      listing.title,
      mediaId,
      plateCount,
      wasBlurred
    ).catch((error) => {
      console.error(`[MediaProcessing] Failed to send notification for media ${mediaId}:`, error)
    })

    // Get seller email and send email notification (non-blocking)
    this.prisma.user
      .findUnique({
        where: { id: sellerId },
        select: { email: true },
      })
      .then((seller) => {
        if (seller?.email) {
          sendLicensePlateDetectionEmail(
            seller.email,
            listing.title,
            plateCount,
            wasBlurred,
            listingUrl
          ).catch((error) => {
            console.error(
              `[MediaProcessing] Failed to send email notification for media ${mediaId}:`,
              error
            )
          })
        }
      })
      .catch((error) => {
        console.error(`[MediaProcessing] Failed to fetch seller for notification:`, error)
      })
  }

  /**
   * Extract storage key from public URL
   */
  private extractKeyFromUrl(publicUrl: string): string {
    const url = new URL(publicUrl)
    // Remove leading slash from pathname
    return url.pathname.substring(1)
  }
}
