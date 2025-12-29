// Bid Repository - Bid-specific database queries
import { PrismaClient, Bid } from '@prisma/client'
import { BaseRepository, IRepository } from './base.repository'

export type BidWithBidder = Bid & {
  bidder: {
    id: string
    name: string | null
    email: string
  }
}

export type BidWithAuction = Bid & {
  auction: {
    id: string
    status: string
    currentBid: any // Decimal type from Prisma
    listing: {
      id: string
      title: string
      sellerId: string
    }
  }
}

/**
 * Bid repository interface with specific query methods
 */
export interface IBidRepository extends IRepository<Bid> {
  findByAuctionId(auctionId: string, limit?: number): Promise<BidWithBidder[]>
  findByBidderId(bidderId: string, options?: { skip?: number; take?: number }): Promise<BidWithAuction[]>
  findWinningBid(auctionId: string): Promise<Bid | null>
  findUserBidsOnAuction(auctionId: string, bidderId: string): Promise<Bid[]>
  countByBidderId(bidderId: string): Promise<number>
  findRecentByBidderId(bidderId: string, hoursAgo: number): Promise<Bid[]>
  markAsWinning(bidId: string): Promise<Bid>
  markAsNotWinning(auctionId: string, excludeBidId?: string): Promise<{ count: number }>
  invalidateBid(bidId: string, reason: string): Promise<Bid>
}

/**
 * Bid repository implementation
 * Handles all bid-related database operations
 */
export class BidRepository extends BaseRepository<Bid> implements IBidRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'Bid')
  }

  protected getDelegate() {
    return this.prisma.bid
  }

  /**
   * Find all bids for an auction with bidder information
   */
  async findByAuctionId(auctionId: string, limit: number = 50): Promise<BidWithBidder[]> {
    return this.prisma.bid.findMany({
      where: { auctionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        bidder: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })
  }

  /**
   * Find all bids by a specific bidder
   */
  async findByBidderId(
    bidderId: string,
    options?: { skip?: number; take?: number }
  ): Promise<BidWithAuction[]> {
    const { skip = 0, take = 20 } = options || {}

    return this.prisma.bid.findMany({
      where: { bidderId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        auction: {
          select: {
            id: true,
            status: true,
            currentBid: true,
            listing: {
              select: {
                id: true,
                title: true,
                sellerId: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Find the current winning bid for an auction
   */
  async findWinningBid(auctionId: string): Promise<Bid | null> {
    return this.prisma.bid.findFirst({
      where: {
        auctionId,
        isWinning: true,
        isValid: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find all bids by a user on a specific auction
   */
  async findUserBidsOnAuction(auctionId: string, bidderId: string): Promise<Bid[]> {
    return this.prisma.bid.findMany({
      where: {
        auctionId,
        bidderId,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Count total bids by a bidder
   */
  async countByBidderId(bidderId: string): Promise<number> {
    return this.prisma.bid.count({
      where: { bidderId },
    })
  }

  /**
   * Find recent bids by a bidder within specified hours
   */
  async findRecentByBidderId(bidderId: string, hoursAgo: number): Promise<Bid[]> {
    const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

    return this.prisma.bid.findMany({
      where: {
        bidderId,
        createdAt: { gte: cutoffTime },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Mark a bid as winning
   */
  async markAsWinning(bidId: string): Promise<Bid> {
    return this.prisma.bid.update({
      where: { id: bidId },
      data: { isWinning: true },
    })
  }

  /**
   * Mark all other bids on an auction as not winning
   */
  async markAsNotWinning(auctionId: string, excludeBidId?: string): Promise<{ count: number }> {
    const where: Record<string, unknown> = {
      auctionId,
      isWinning: true,
    }

    if (excludeBidId) {
      where.id = { not: excludeBidId }
    }

    return this.prisma.bid.updateMany({
      where,
      data: { isWinning: false },
    })
  }

  /**
   * Invalidate a bid with a reason
   */
  async invalidateBid(bidId: string, reason: string): Promise<Bid> {
    return this.prisma.bid.update({
      where: { id: bidId },
      data: {
        isValid: false,
        invalidatedReason: reason,
        isWinning: false,
      },
    })
  }

  /**
   * Find last bid by user on auction
   */
  async findLastBidByUser(auctionId: string, bidderId: string): Promise<Bid | null> {
    return this.prisma.bid.findFirst({
      where: {
        auctionId,
        bidderId,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find highest bid amount for an auction
   */
  async findHighestBidAmount(auctionId: string): Promise<number | null> {
    const highestBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        isValid: true,
      },
      orderBy: { amount: 'desc' },
      select: { amount: true },
    })

    return highestBid ? Number(highestBid.amount) : null
  }

  /**
   * Find bids placed within last N minutes of auction end
   */
  async findLastMinuteBids(auctionId: string, minutesBeforeEnd: number): Promise<Bid[]> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { currentEndTime: true },
    })

    if (!auction) {return []}

    const cutoffTime = new Date(auction.currentEndTime.getTime() - minutesBeforeEnd * 60 * 1000)

    return this.prisma.bid.findMany({
      where: {
        auctionId,
        createdAt: { gte: cutoffTime },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find bids by IP address
   */
  async findByIpAddress(ipAddress: string, limit: number = 100): Promise<Bid[]> {
    return this.prisma.bid.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Find distinct bidders on an auction
   */
  async findDistinctBidders(auctionId: string): Promise<string[]> {
    const bids = await this.prisma.bid.findMany({
      where: { auctionId },
      select: { bidderId: true },
      distinct: ['bidderId'],
    })

    return bids.map(bid => bid.bidderId)
  }

  /**
   * Count bids on an auction
   */
  async countByAuctionId(auctionId: string): Promise<number> {
    return this.prisma.bid.count({
      where: { auctionId },
    })
  }

  /**
   * Find losing bidders (for notifications)
   */
  async findLosingBidders(auctionId: string, excludeBidderId?: string): Promise<string[]> {
    const where: Record<string, unknown> = {
      auctionId,
      isWinning: false,
    }

    if (excludeBidderId) {
      where.bidderId = { not: excludeBidderId }
    }

    const bids = await this.prisma.bid.findMany({
      where,
      select: { bidderId: true },
      distinct: ['bidderId'],
    })

    return bids.map(bid => bid.bidderId)
  }
}
