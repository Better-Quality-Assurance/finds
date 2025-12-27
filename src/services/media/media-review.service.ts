/**
 * Media Review Service
 *
 * Handles media items flagged for manual review due to automated processing failures.
 */

import { PrismaClient, ListingMedia } from '@prisma/client'

export interface MediaNeedsReviewQuery {
  page?: number
  limit?: number
  listingId?: string
}

export interface MediaNeedsReviewResult {
  media: ListingMedia[]
  totalCount: number
  page: number
  totalPages: number
}

/**
 * Fetches all media items that need manual review
 */
export async function getMediaNeedingReview(
  prisma: PrismaClient,
  query: MediaNeedsReviewQuery = {}
): Promise<MediaNeedsReviewResult> {
  const { page = 1, limit = 50, listingId } = query
  const skip = (page - 1) * limit

  const where: any = {
    needsManualReview: true,
  }

  if (listingId) {
    where.listingId = listingId
  }

  const [media, totalCount] = await Promise.all([
    prisma.listingMedia.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.listingMedia.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return {
    media,
    totalCount,
    page,
    totalPages,
  }
}

/**
 * Gets count of media items needing manual review
 */
export async function getMediaNeedsReviewCount(
  prisma: PrismaClient,
  listingId?: string
): Promise<number> {
  const where: any = {
    needsManualReview: true,
  }

  if (listingId) {
    where.listingId = listingId
  }

  return prisma.listingMedia.count({ where })
}

/**
 * Marks a media item as reviewed and approved
 */
export async function approveMediaAfterReview(
  prisma: PrismaClient,
  mediaId: string
): Promise<ListingMedia> {
  return prisma.listingMedia.update({
    where: { id: mediaId },
    data: {
      needsManualReview: false,
    },
  })
}

/**
 * Updates media with manually blurred version
 */
export async function updateMediaWithManualBlur(
  prisma: PrismaClient,
  mediaId: string,
  blurredUrl: string
): Promise<ListingMedia> {
  const media = await prisma.listingMedia.findUnique({
    where: { id: mediaId },
  })

  if (!media) {
    throw new Error('Media not found')
  }

  return prisma.listingMedia.update({
    where: { id: mediaId },
    data: {
      needsManualReview: false,
      licensePlateBlurred: true,
      originalUrl: media.publicUrl,
      publicUrl: blurredUrl,
    },
  })
}

/**
 * Gets statistics about media requiring review
 */
export async function getMediaReviewStats(prisma: PrismaClient) {
  const [
    totalNeedingReview,
    withLicensePlates,
    byListing,
  ] = await Promise.all([
    // Total count
    prisma.listingMedia.count({
      where: { needsManualReview: true },
    }),

    // Count with detected license plates
    prisma.listingMedia.count({
      where: {
        needsManualReview: true,
        licensePlateDetected: true,
      },
    }),

    // Group by listing to find problematic listings
    prisma.listingMedia.groupBy({
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
