/**
 * Media Review Service
 *
 * Handles media items flagged for manual review due to automated processing failures.
 * Implements IMediaReviewService interface for dependency injection.
 */

import { PrismaClient } from '@prisma/client'
import type {
  IMediaReviewService,
  MediaReviewItem,
  MediaReviewPagination,
  MediaReviewStats,
} from '@/services/contracts/media-review.interface'
import type { IAuditService } from '@/services/contracts/audit.interface'

/**
 * Media Review Service Implementation
 */
export class MediaReviewService implements IMediaReviewService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditService: IAuditService
  ) {}

  /**
   * Get paginated list of media items needing manual review
   */
  async getMediaNeedingReview(
    page: number = 1,
    limit: number = 50
  ): Promise<{
    media: MediaReviewItem[]
    pagination: MediaReviewPagination
  }> {
    const skip = (page - 1) * limit

    const [media, totalCount] = await Promise.all([
      this.prisma.listingMedia.findMany({
        where: {
          needsManualReview: true,
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
              sellerId: true,
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.listingMedia.count({
        where: {
          needsManualReview: true,
        },
      }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return {
      media: media as MediaReviewItem[],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }
  }

  /**
   * Approve a media item after review (no changes needed)
   */
  async approveMedia(mediaId: string, adminId: string): Promise<void> {
    const media = await this.prisma.listingMedia.findUnique({
      where: { id: mediaId },
      select: { listingId: true, publicUrl: true, needsManualReview: true },
    })

    if (!media) {
      throw new Error('Media not found')
    }

    if (!media.needsManualReview) {
      throw new Error('Media does not need manual review')
    }

    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        needsManualReview: false,
      },
    })

    // Log audit event
    await this.auditService.logAuditEvent({
      actorId: adminId,
      action: 'media.manual_review_approved',
      resourceType: 'ListingMedia',
      resourceId: mediaId,
      details: {
        listingId: media.listingId,
        action: 'approve',
      },
      severity: 'LOW',
      status: 'SUCCESS',
    })
  }

  /**
   * Reject a media item (mark as reviewed but not approved)
   */
  async rejectMedia(mediaId: string, adminId: string): Promise<void> {
    const media = await this.prisma.listingMedia.findUnique({
      where: { id: mediaId },
      select: { listingId: true, publicUrl: true, needsManualReview: true },
    })

    if (!media) {
      throw new Error('Media not found')
    }

    if (!media.needsManualReview) {
      throw new Error('Media does not need manual review')
    }

    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        needsManualReview: false,
        // Could add a 'rejected' flag or soft delete if needed in the future
      },
    })

    // Log audit event
    await this.auditService.logAuditEvent({
      actorId: adminId,
      action: 'media.manual_review_rejected',
      resourceType: 'ListingMedia',
      resourceId: mediaId,
      details: {
        listingId: media.listingId,
        action: 'reject',
      },
      severity: 'MEDIUM',
      status: 'SUCCESS',
    })
  }

  /**
   * Mark media as manually blurred with new URL
   */
  async markAsBlurred(
    mediaId: string,
    adminId: string,
    blurredUrl: string
  ): Promise<void> {
    const media = await this.prisma.listingMedia.findUnique({
      where: { id: mediaId },
      select: {
        listingId: true,
        publicUrl: true,
        needsManualReview: true,
      },
    })

    if (!media) {
      throw new Error('Media not found')
    }

    if (!media.needsManualReview) {
      throw new Error('Media does not need manual review')
    }

    await this.prisma.listingMedia.update({
      where: { id: mediaId },
      data: {
        needsManualReview: false,
        licensePlateBlurred: true,
        originalUrl: media.publicUrl,
        publicUrl: blurredUrl,
      },
    })

    // Log audit event
    await this.auditService.logAuditEvent({
      actorId: adminId,
      action: 'media.manual_blur_applied',
      resourceType: 'ListingMedia',
      resourceId: mediaId,
      details: {
        listingId: media.listingId,
        action: 'blur_manually',
        originalUrl: media.publicUrl,
        blurredUrl,
      },
      severity: 'MEDIUM',
      status: 'SUCCESS',
    })
  }

  /**
   * Get statistics about media needing review
   */
  async getMediaReviewStats(): Promise<MediaReviewStats> {
    const [totalNeedingReview, withLicensePlates, byListing] =
      await Promise.all([
        // Total count
        this.prisma.listingMedia.count({
          where: { needsManualReview: true },
        }),

        // Count with detected license plates
        this.prisma.listingMedia.count({
          where: {
            needsManualReview: true,
            licensePlateDetected: true,
          },
        }),

        // Group by listing to find problematic listings
        this.prisma.listingMedia.groupBy({
          by: ['listingId'],
          where: { needsManualReview: true },
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 10,
        }),
      ])

    return {
      totalNeedingReview,
      withLicensePlates,
      listingsAffected: byListing.length,
      topListingsByCount: byListing.map((item) => ({
        listingId: item.listingId,
        count: item._count.id,
      })),
    }
  }

  /**
   * Get count of media items needing review
   */
  async getMediaNeedsReviewCount(listingId?: string): Promise<number> {
    const where: any = {
      needsManualReview: true,
    }

    if (listingId) {
      where.listingId = listingId
    }

    return this.prisma.listingMedia.count({ where })
  }
}
