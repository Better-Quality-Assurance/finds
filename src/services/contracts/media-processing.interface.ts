/**
 * Media Processing Service Interface
 *
 * Handles background processing of uploaded media including:
 * - License plate detection
 * - Automatic blurring with retry logic
 * - Notification and email sending
 * - Database state management
 *
 * Follows Single Responsibility Principle and Dependency Inversion Principle
 */

/**
 * Media processing service interface
 */
export interface IMediaProcessingService {
  /**
   * Process uploaded media in background
   * Handles license plate detection, blurring, and notifications
   *
   * @param mediaId - ID of the media record to process
   * @param publicUrl - Public URL of the uploaded media
   * @param listingId - ID of the listing the media belongs to
   * @param sellerId - ID of the seller who owns the listing
   * @returns Promise that resolves when processing is complete (or fails)
   */
  processUploadedMedia(
    mediaId: string,
    publicUrl: string,
    listingId: string,
    sellerId: string
  ): Promise<void>
}
