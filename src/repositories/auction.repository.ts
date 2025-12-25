// Auction Repository - Auction-specific database queries
import { PrismaClient, Auction, AuctionStatus, Listing, Bid } from '@prisma/client'
import { BaseRepository, IRepository } from './base.repository'

export type AuctionWithListing = Auction & {
  listing: Listing
}

export type AuctionWithBids = Auction & {
  listing: Listing
  bids: (Bid & {
    bidder: {
      id: string
      name: string | null
    }
  })[]
}

export type AuctionWithMedia = Auction & {
  listing: Listing & {
    media: {
      id: string
      publicUrl: string
      isPrimary: boolean
      position: number
    }[]
  }
}

/**
 * Auction repository interface with specific query methods
 */
export interface IAuctionRepository extends IRepository<Auction> {
  findActiveAuctions(): Promise<Auction[]>
  findScheduledAuctionsToActivate(): Promise<AuctionWithMedia[]>
  findEndedAuctionsToClose(): Promise<{ id: string }[]>
  findWithBids(id: string): Promise<AuctionWithBids | null>
  findByListingId(listingId: string): Promise<Auction | null>
  findActiveWithFilters(filters: {
    category?: string
    minPrice?: number
    maxPrice?: number
    country?: string
    skip?: number
    take?: number
  }): Promise<Auction[]>
  findEndingSoon(hoursAhead: number, limit?: number): Promise<AuctionWithMedia[]>
  updateStatus(id: string, status: AuctionStatus): Promise<Auction>
  incrementBidCount(id: string): Promise<Auction>
}

/**
 * Auction repository implementation
 * Handles all auction-related database operations
 */
export class AuctionRepository extends BaseRepository<Auction> implements IAuctionRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Auction')
  }

  protected getDelegate() {
    return this.prisma.auction
  }

  /**
   * Find all active auctions
   */
  async findActiveAuctions(): Promise<Auction[]> {
    return this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        currentEndTime: { gt: new Date() },
      },
      orderBy: { currentEndTime: 'asc' },
    })
  }

  /**
   * Find scheduled auctions that should be activated
   */
  async findScheduledAuctionsToActivate(): Promise<AuctionWithMedia[]> {
    const now = new Date()
    return this.prisma.auction.findMany({
      where: {
        status: 'SCHEDULED',
        startTime: { lte: now },
      },
      include: {
        listing: {
          include: {
            media: {
              where: { isPrimary: true },
              take: 1,
              select: {
                id: true,
                publicUrl: true,
                isPrimary: true,
                position: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Find active auctions that have ended and need to be closed
   */
  async findEndedAuctionsToClose(): Promise<{ id: string }[]> {
    const now = new Date()
    return this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        currentEndTime: { lte: now },
      },
      select: { id: true },
    })
  }

  /**
   * Find auction with all bids and listing details
   */
  async findWithBids(id: string): Promise<AuctionWithBids | null> {
    return this.prisma.auction.findUnique({
      where: { id },
      include: {
        listing: true,
        bids: {
          orderBy: { createdAt: 'desc' },
          include: {
            bidder: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })
  }

  /**
   * Find auction by listing ID
   */
  async findByListingId(listingId: string): Promise<Auction | null> {
    return this.prisma.auction.findUnique({
      where: { listingId },
    })
  }

  /**
   * Find active auctions with various filters
   */
  async findActiveWithFilters(filters: {
    category?: string
    minPrice?: number
    maxPrice?: number
    country?: string
    skip?: number
    take?: number
  }): Promise<Auction[]> {
    const { category, minPrice, maxPrice, country, skip = 0, take = 20 } = filters

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      currentEndTime: { gt: new Date() },
    }

    const listingWhere: Record<string, unknown> = {}
    if (category) listingWhere.category = category
    if (country) listingWhere.locationCountry = country
    if (minPrice !== undefined || maxPrice !== undefined) {
      listingWhere.startingPrice = {}
      if (minPrice !== undefined) (listingWhere.startingPrice as Record<string, number>).gte = minPrice
      if (maxPrice !== undefined) (listingWhere.startingPrice as Record<string, number>).lte = maxPrice
    }

    if (Object.keys(listingWhere).length > 0) {
      where.listing = listingWhere
    }

    return this.prisma.auction.findMany({
      where,
      skip,
      take,
      orderBy: { currentEndTime: 'asc' },
      include: {
        listing: {
          include: {
            media: {
              where: { type: 'PHOTO' },
              take: 1,
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    })
  }

  /**
   * Find auctions ending within specified hours
   */
  async findEndingSoon(hoursAhead: number = 24, limit: number = 6): Promise<AuctionWithMedia[]> {
    const now = new Date()
    const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000)

    return this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        currentEndTime: {
          gt: now,
          lte: endTime,
        },
      },
      orderBy: { currentEndTime: 'asc' },
      take: limit,
      include: {
        listing: {
          include: {
            media: {
              where: { type: 'PHOTO' },
              take: 1,
              orderBy: { position: 'asc' },
              select: {
                id: true,
                publicUrl: true,
                isPrimary: true,
                position: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Update auction status
   */
  async updateStatus(id: string, status: AuctionStatus): Promise<Auction> {
    return this.prisma.auction.update({
      where: { id },
      data: { status },
    })
  }

  /**
   * Increment bid count atomically
   */
  async incrementBidCount(id: string): Promise<Auction> {
    return this.prisma.auction.update({
      where: { id },
      data: {
        bidCount: { increment: 1 },
      },
    })
  }

  /**
   * Update auction with new bid information
   * Used when placing bids to update current bid, reserve status, etc.
   */
  async updateWithBidInfo(
    id: string,
    data: {
      currentBid: number
      reserveMet?: boolean
      currentEndTime?: Date
      extensionCount?: number
    }
  ): Promise<Auction> {
    const updateData: Record<string, unknown> = {
      currentBid: data.currentBid,
      bidCount: { increment: 1 },
    }

    if (data.reserveMet !== undefined) {
      updateData.reserveMet = data.reserveMet
    }

    if (data.currentEndTime) {
      updateData.currentEndTime = data.currentEndTime
    }

    if (data.extensionCount !== undefined) {
      updateData.extensionCount = { increment: 1 }
    }

    return this.prisma.auction.update({
      where: { id },
      data: updateData,
    })
  }

  /**
   * Mark auction as sold with winner information
   */
  async markAsSold(
    id: string,
    data: {
      winnerId: string
      winningBidId?: string
      finalPrice: number
      buyerFeeAmount: number
      paymentDeadline: Date
    }
  ): Promise<Auction> {
    return this.prisma.auction.update({
      where: { id },
      data: {
        status: 'SOLD',
        winnerId: data.winnerId,
        winningBidId: data.winningBidId,
        finalPrice: data.finalPrice,
        buyerFeeAmount: data.buyerFeeAmount,
        paymentDeadline: data.paymentDeadline,
        paymentStatus: 'UNPAID',
      },
    })
  }

  /**
   * Mark auction as no sale (reserve not met)
   */
  async markAsNoSale(id: string): Promise<Auction> {
    return this.prisma.auction.update({
      where: { id },
      data: {
        status: 'NO_SALE',
      },
    })
  }

  /**
   * Activate multiple scheduled auctions at once
   */
  async activateScheduledAuctions(auctionIds: string[]): Promise<{ count: number }> {
    return this.prisma.auction.updateMany({
      where: {
        id: { in: auctionIds },
        status: 'SCHEDULED',
      },
      data: { status: 'ACTIVE' },
    })
  }
}
