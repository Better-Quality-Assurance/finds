/**
 * Mock Activity Orchestrator Service
 *
 * Coordinates bid and comment generation across auctions.
 * Follows SRP: Only responsible for orchestration, delegates to specialized generators.
 * Follows DIP: Depends on generator interfaces, not implementations.
 */

import { prisma } from '@/lib/db'
import type { Auction, Listing } from '@prisma/client'
import { AuctionStatus } from '@prisma/client'

type AuctionWithListing = Auction & {
  listing: Pick<Listing, 'id' | 'title' | 'sellerId'>
}
import type {
  IMockActivityOrchestrator,
  MockActivityConfig,
  MockActivitySummary,
  MockBidResult,
  MockCommentResult,
} from './contracts/mock-activity.interface'
import { DEFAULT_MOCK_ACTIVITY_CONFIG } from './contracts/mock-activity.interface'
import { getMockBidGenerator, MockBidGenerator } from './mock-bid-generator.service'
import { getMockCommentGenerator, MockCommentGenerator } from './mock-comment-generator.service'

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export class MockActivityOrchestrator implements IMockActivityOrchestrator {
  private bidGenerator: MockBidGenerator
  private commentGenerator: MockCommentGenerator
  private running = false
  private shouldStop = false

  constructor(
    bidGenerator?: MockBidGenerator,
    commentGenerator?: MockCommentGenerator
  ) {
    this.bidGenerator = bidGenerator ?? getMockBidGenerator()
    this.commentGenerator = commentGenerator ?? getMockCommentGenerator()
  }

  /**
   * Get auctions eligible for mock activity
   */
  async getEligibleAuctions(targetIds?: string[]): Promise<AuctionWithListing[]> {
    const where: Record<string, unknown> = {
      status: { in: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED] },
      currentEndTime: { gt: new Date() },
    }

    if (targetIds && targetIds.length > 0) {
      where.id = { in: targetIds }
    }

    return prisma.auction.findMany({
      where,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            sellerId: true,
          },
        },
      },
      orderBy: { currentEndTime: 'asc' },
    })
  }

  /**
   * Run a single pass of mock activity generation
   */
  async runOnce(
    config: MockActivityConfig = DEFAULT_MOCK_ACTIVITY_CONFIG
  ): Promise<MockActivitySummary> {
    const startedAt = new Date()
    const bidResults: MockBidResult[] = []
    const commentResults: MockCommentResult[] = []
    const errors: string[] = []
    const auctionsAffected = new Set<string>()

    try {
      // Get eligible auctions
      const auctions = await this.getEligibleAuctions(config.targetAuctionIds)

      if (auctions.length === 0) {
        return {
          startedAt,
          endedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          bidsGenerated: 0,
          commentsGenerated: 0,
          auctionsAffected: [],
          errors: ['No eligible auctions found'],
          bidResults: [],
          commentResults: [],
        }
      }

      const auctionIds = auctions.map((a) => a.id)
      const listingIds = auctions.map((a) => a.listing.id)

      // Generate bids
      if (config.enableBids) {
        const bids = await this.bidGenerator.generateBids(
          auctionIds,
          config.bids
        )
        bidResults.push(...bids)

        for (const result of bids) {
          if (result.success) {
            auctionsAffected.add(result.auctionId)
          } else if (
            result.error &&
            !result.error.includes('Skipped') &&
            !result.error.includes('Max bids')
          ) {
            errors.push(`Bid error: ${result.error}`)
          }
        }
      }

      // Generate comments
      if (config.enableComments) {
        const comments = await this.commentGenerator.generateComments(
          listingIds,
          config.comments
        )
        commentResults.push(...comments)

        for (const result of comments) {
          if (result.success) {
            // Find auction ID for this listing
            const auction = auctions.find((a) => a.listing.id === result.listingId)
            if (auction) {
              auctionsAffected.add(auction.id)
            }
          } else if (
            result.error &&
            !result.error.includes('Skipped') &&
            !result.error.includes('Max comments')
          ) {
            errors.push(`Comment error: ${result.error}`)
          }
        }
      }
    } catch (error) {
      errors.push(
        `Orchestrator error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    const endedAt = new Date()

    return {
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
      bidsGenerated: bidResults.filter((r) => r.success).length,
      commentsGenerated: commentResults.filter((r) => r.success).length,
      auctionsAffected: Array.from(auctionsAffected),
      errors,
      bidResults,
      commentResults,
    }
  }

  /**
   * Run continuous mock activity generation
   */
  async runContinuous(
    config: MockActivityConfig = DEFAULT_MOCK_ACTIVITY_CONFIG
  ): Promise<MockActivitySummary> {
    if (this.running) {
      throw new Error('Mock activity generator is already running')
    }

    this.running = true
    this.shouldStop = false

    // Reset counters for fresh run
    this.bidGenerator.resetCounts()
    this.commentGenerator.resetCounts()

    const startedAt = new Date()
    const allBidResults: MockBidResult[] = []
    const allCommentResults: MockCommentResult[] = []
    const allErrors: string[] = []
    const allAuctionsAffected = new Set<string>()

    const runUntil = config.runDurationMs > 0
      ? startedAt.getTime() + config.runDurationMs
      : Infinity

    try {
      while (!this.shouldStop && Date.now() < runUntil) {
        const result = await this.runOnce(config)

        allBidResults.push(...result.bidResults)
        allCommentResults.push(...result.commentResults)
        allErrors.push(...result.errors)
        result.auctionsAffected.forEach((id) => allAuctionsAffected.add(id))

        // Log progress
        console.log(
          `[MockActivity] Pass complete: ${result.bidsGenerated} bids, ${result.commentsGenerated} comments`
        )

        // Wait for next interval
        if (!this.shouldStop && Date.now() < runUntil) {
          await new Promise((resolve) =>
            setTimeout(resolve, config.checkIntervalMs)
          )
        }
      }
    } finally {
      this.running = false
    }

    const endedAt = new Date()

    return {
      startedAt,
      endedAt,
      durationMs: endedAt.getTime() - startedAt.getTime(),
      bidsGenerated: allBidResults.filter((r) => r.success).length,
      commentsGenerated: allCommentResults.filter((r) => r.success).length,
      auctionsAffected: Array.from(allAuctionsAffected),
      errors: allErrors,
      bidResults: allBidResults,
      commentResults: allCommentResults,
    }
  }

  /**
   * Stop continuous generation
   */
  stop(): void {
    this.shouldStop = true
  }

  /**
   * Check if generator is running
   */
  isRunning(): boolean {
    return this.running
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let orchestratorInstance: MockActivityOrchestrator | null = null

export function getMockActivityOrchestrator(): MockActivityOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MockActivityOrchestrator()
  }
  return orchestratorInstance
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export async function runMockActivityOnce(
  config?: MockActivityConfig
): Promise<MockActivitySummary> {
  return getMockActivityOrchestrator().runOnce(config)
}

export async function runMockActivityContinuous(
  config?: MockActivityConfig
): Promise<MockActivitySummary> {
  return getMockActivityOrchestrator().runContinuous(config)
}

export function stopMockActivity(): void {
  getMockActivityOrchestrator().stop()
}

export function isMockActivityRunning(): boolean {
  return getMockActivityOrchestrator().isRunning()
}
