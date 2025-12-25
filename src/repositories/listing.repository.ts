// Listing Repository - Listing-specific database queries
import { PrismaClient, Listing, ListingStatus, ListingMedia } from '@prisma/client'
import { BaseRepository, IRepository } from './base.repository'

export type ListingWithMedia = Listing & {
  media: ListingMedia[]
}

export type ListingWithSeller = Listing & {
  seller: {
    id: string
    name: string | null
    email: string
  }
}

export type ListingWithDetails = Listing & {
  media: ListingMedia[]
  seller: {
    id: string
    name: string | null
  }
}

/**
 * Listing repository interface with specific query methods
 */
export interface IListingRepository extends IRepository<Listing> {
  findByIdWithMedia(id: string): Promise<ListingWithDetails | null>
  findBySellerId(sellerId: string, status?: ListingStatus): Promise<ListingWithMedia[]>
  findPendingReview(): Promise<ListingWithSeller[]>
  findApproved(): Promise<Listing[]>
  updateStatus(id: string, status: ListingStatus): Promise<Listing>
  findByStatus(status: ListingStatus): Promise<Listing[]>
}

/**
 * Listing repository implementation
 * Handles all listing-related database operations
 */
export class ListingRepository extends BaseRepository<Listing> implements IListingRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Listing')
  }

  protected getDelegate() {
    return this.prisma.listing
  }

  /**
   * Find listing by ID with all media and seller info
   */
  async findByIdWithMedia(id: string): Promise<ListingWithDetails | null> {
    return this.prisma.listing.findUnique({
      where: { id },
      include: {
        media: {
          orderBy: { position: 'asc' },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  /**
   * Find all listings for a specific seller
   */
  async findBySellerId(sellerId: string, status?: ListingStatus): Promise<ListingWithMedia[]> {
    return this.prisma.listing.findMany({
      where: {
        sellerId,
        ...(status && { status }),
      },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find all listings pending review
   */
  async findPendingReview(): Promise<ListingWithSeller[]> {
    return this.prisma.listing.findMany({
      where: { status: 'PENDING_REVIEW' },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'asc' },
    })
  }

  /**
   * Find all approved listings
   */
  async findApproved(): Promise<Listing[]> {
    return this.prisma.listing.findMany({
      where: { status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
    })
  }

  /**
   * Update listing status
   */
  async updateStatus(id: string, status: ListingStatus): Promise<Listing> {
    return this.prisma.listing.update({
      where: { id },
      data: { status },
    })
  }

  /**
   * Find listings by status
   */
  async findByStatus(status: ListingStatus): Promise<Listing[]> {
    return this.prisma.listing.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Approve a listing
   */
  async approve(id: string, reviewerId: string): Promise<Listing> {
    return this.prisma.listing.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        approvedAt: new Date(),
      },
    })
  }

  /**
   * Reject a listing with reason
   */
  async reject(id: string, reviewerId: string, reason: string): Promise<Listing> {
    return this.prisma.listing.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    })
  }

  /**
   * Request changes to a listing
   */
  async requestChanges(id: string, reviewerId: string, changes: string[]): Promise<Listing> {
    return this.prisma.listing.update({
      where: { id },
      data: {
        status: 'CHANGES_REQUESTED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        changeRequests: changes,
      },
    })
  }

  /**
   * Submit listing for review
   */
  async submitForReview(id: string): Promise<Listing> {
    return this.prisma.listing.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
      },
    })
  }

  /**
   * Check if user owns a listing
   */
  async isOwnedBy(listingId: string, sellerId: string): Promise<boolean> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id: listingId,
        sellerId,
      },
      select: { id: true },
    })
    return listing !== null
  }

  /**
   * Find listings by category
   */
  async findByCategory(category: string, limit: number = 20): Promise<ListingWithMedia[]> {
    return this.prisma.listing.findMany({
      where: {
        category: category as any,
        status: 'ACTIVE',
      },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Search listings by text
   */
  async search(query: string, limit: number = 20): Promise<ListingWithMedia[]> {
    return this.prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { make: { contains: query, mode: 'insensitive' } },
          { model: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        media: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }
}
