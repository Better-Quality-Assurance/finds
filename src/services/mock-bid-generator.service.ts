/**
 * Mock Bid Generator Service
 *
 * Generates realistic bid activity on auctions for demo purposes.
 * Follows SRP: Only responsible for bid generation logic.
 */

import { prisma } from '@/lib/db'
import type { Auction, Bid, User } from '@prisma/client'
import { AuctionStatus } from '@prisma/client'
import type {
  IMockBidGenerator,
  MockBidConfig,
  MockBidResult,
} from './contracts/mock-activity.interface'

// =============================================================================
// MOCK BID TEMPLATES
// =============================================================================

const BID_COMMENTS = [
  'Great car, happy to bid!',
  'Been looking for one of these for years.',
  'Love the color!',
  'This is the one.',
  'Serious buyer here.',
  'Beautiful example.',
  'Well maintained, worth every euro.',
  'My dream car!',
  'Perfect weekend driver.',
  'Collector quality.',
]

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export class MockBidGenerator implements IMockBidGenerator {
  private bidCountByAuction: Map<string, number> = new Map()

  /**
   * Get all mock bidder users (those with mock email addresses)
   */
  async getMockBidders(): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        email: { contains: 'mock' },
        biddingEnabled: true,
        bannedAt: null,
      },
    })
  }

  /**
   * Calculate the next bid amount based on current auction state
   */
  calculateNextBidAmount(auction: Auction): number {
    const currentBid = auction.currentBid?.toNumber() ?? auction.startingPrice.toNumber()
    const increment = auction.bidIncrement.toNumber()

    // Add some randomness: 1-3 increments above minimum
    const multiplier = Math.floor(Math.random() * 3) + 1
    return currentBid + increment * multiplier
  }

  /**
   * Generate a single mock bid for an auction
   */
  async generateBid(auctionId: string, config: MockBidConfig): Promise<MockBidResult> {
    try {
      // Get auction with listing info
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          listing: { select: { sellerId: true, title: true } },
        },
      })

      if (!auction) {
        return {
          success: false,
          auctionId,
          bidderId: '',
          error: 'Auction not found',
        }
      }

      // Check if auction is active
      if (auction.status !== AuctionStatus.ACTIVE) {
        return {
          success: false,
          auctionId,
          bidderId: '',
          error: `Auction is not active (status: ${auction.status})`,
        }
      }

      // Check if auction has ended
      if (auction.currentEndTime < new Date()) {
        return {
          success: false,
          auctionId,
          bidderId: '',
          error: 'Auction has ended',
        }
      }

      // Check max bids limit
      const currentCount = this.bidCountByAuction.get(auctionId) ?? 0
      if (currentCount >= config.maxBidsPerAuction) {
        return {
          success: false,
          auctionId,
          bidderId: '',
          error: 'Max bids reached for this auction',
        }
      }

      // Random chance to skip this bid
      if (Math.random() > config.bidProbability) {
        return {
          success: false,
          auctionId,
          bidderId: '',
          error: 'Skipped due to probability',
        }
      }

      // Get mock bidders (excluding seller)
      const bidders = await this.getMockBidders()
      const eligibleBidders = bidders.filter(
        (b) => b.id !== auction.listing.sellerId
      )

      if (eligibleBidders.length === 0) {
        return {
          success: false,
          auctionId,
          bidderId: '',
          error: 'No eligible mock bidders found',
        }
      }

      // Select random bidder (avoid same bidder twice in a row)
      const lastBid = await prisma.bid.findFirst({
        where: { auctionId },
        orderBy: { createdAt: 'desc' },
      })

      let selectedBidder: User
      if (lastBid && eligibleBidders.length > 1) {
        const otherBidders = eligibleBidders.filter(
          (b) => b.id !== lastBid.bidderId
        )
        selectedBidder =
          otherBidders[Math.floor(Math.random() * otherBidders.length)]
      } else {
        selectedBidder =
          eligibleBidders[Math.floor(Math.random() * eligibleBidders.length)]
      }

      // Calculate bid amount
      const bidAmount = this.calculateNextBidAmount(auction)

      // Check anti-sniping
      const now = new Date()
      const timeToEnd = auction.currentEndTime.getTime() - now.getTime()
      const antiSnipeWindow = auction.antiSnipingWindowMinutes * 60 * 1000
      const shouldTriggerExtension =
        config.allowAntiSnipe &&
        auction.antiSnipingEnabled &&
        timeToEnd > 0 &&
        timeToEnd <= antiSnipeWindow &&
        auction.extensionCount < auction.maxExtensions

      // Create the bid
      const bid = await prisma.bid.create({
        data: {
          auctionId,
          bidderId: selectedBidder.id,
          amount: bidAmount,
          currency: auction.currency,
          isWinning: true,
          isValid: true,
          triggeredExtension: shouldTriggerExtension,
        },
      })

      // Update auction
      const updateData: Record<string, unknown> = {
        currentBid: bidAmount,
        bidCount: { increment: 1 },
      }

      // Handle reserve
      const reservePrice = auction.reservePrice?.toNumber()
      if (reservePrice && bidAmount >= reservePrice) {
        updateData.reserveMet = true
      }

      // Handle anti-sniping extension
      if (shouldTriggerExtension) {
        const extensionMs = auction.antiSnipingExtensionMinutes * 60 * 1000
        const newEndTime = new Date(auction.currentEndTime.getTime() + extensionMs)
        updateData.currentEndTime = newEndTime
        updateData.extensionCount = { increment: 1 }
        updateData.status = AuctionStatus.EXTENDED
      }

      await prisma.auction.update({
        where: { id: auctionId },
        data: updateData,
      })

      // Mark previous winning bid as not winning
      if (lastBid && lastBid.isWinning) {
        await prisma.bid.update({
          where: { id: lastBid.id },
          data: { isWinning: false },
        })
      }

      // Track bid count
      this.bidCountByAuction.set(auctionId, currentCount + 1)

      return {
        success: true,
        bid,
        auctionId,
        bidderId: selectedBidder.id,
        amount: bidAmount,
        triggeredExtension: shouldTriggerExtension,
      }
    } catch (error) {
      return {
        success: false,
        auctionId,
        bidderId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate bids across multiple auctions
   */
  async generateBids(
    auctionIds: string[],
    config: MockBidConfig
  ): Promise<MockBidResult[]> {
    const results: MockBidResult[] = []

    // Process auctions in random order
    const shuffled = [...auctionIds].sort(() => Math.random() - 0.5)

    for (const auctionId of shuffled) {
      // Random delay between bids
      const delay =
        config.minIntervalMs +
        Math.random() * (config.maxIntervalMs - config.minIntervalMs)
      await new Promise((resolve) => setTimeout(resolve, delay / shuffled.length))

      const result = await this.generateBid(auctionId, config)
      results.push(result)
    }

    return results
  }

  /**
   * Reset bid counts (call when starting a new session)
   */
  resetCounts(): void {
    this.bidCountByAuction.clear()
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let mockBidGeneratorInstance: MockBidGenerator | null = null

export function getMockBidGenerator(): MockBidGenerator {
  if (!mockBidGeneratorInstance) {
    mockBidGeneratorInstance = new MockBidGenerator()
  }
  return mockBidGeneratorInstance
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export async function generateMockBid(
  auctionId: string,
  config: MockBidConfig
): Promise<MockBidResult> {
  return getMockBidGenerator().generateBid(auctionId, config)
}

export async function generateMockBids(
  auctionIds: string[],
  config: MockBidConfig
): Promise<MockBidResult[]> {
  return getMockBidGenerator().generateBids(auctionIds, config)
}
