import { ListingMedia } from '@prisma/client'

/**
 * Pagination result for media review
 */
export type MediaReviewPagination = {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/**
 * Media item with related listing information
 */
export type MediaReviewItem = ListingMedia & {
  listing: {
    id: string
    title: string
    status: string
    sellerId: string
    seller: {
      id: string
      name: string | null
      email: string
    }
  }
}

/**
 * Statistics about media requiring review
 */
export type MediaReviewStats = {
  totalNeedingReview: number
  withLicensePlates: number
  listingsAffected: number
  topListingsByCount: Array<{
    listingId: string
    count: number
  }>
}

/**
 * Interface for Media Review Service
 * Handles media items flagged for manual review due to automated processing failures
 */
export interface IMediaReviewService {
  /**
   * Get paginated list of media items needing manual review
   */
  getMediaNeedingReview(
    page: number,
    limit: number
  ): Promise<{
    media: MediaReviewItem[]
    pagination: MediaReviewPagination
  }>

  /**
   * Approve a media item after review (no changes needed)
   */
  approveMedia(mediaId: string, adminId: string): Promise<void>

  /**
   * Reject a media item (mark as reviewed but not approved)
   */
  rejectMedia(mediaId: string, adminId: string): Promise<void>

  /**
   * Mark media as manually blurred with new URL
   */
  markAsBlurred(
    mediaId: string,
    adminId: string,
    blurredUrl: string
  ): Promise<void>

  /**
   * Get statistics about media needing review
   */
  getMediaReviewStats(): Promise<MediaReviewStats>

  /**
   * Get count of media items needing review
   */
  getMediaNeedsReviewCount(listingId?: string): Promise<number>
}
