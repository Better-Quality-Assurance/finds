/**
 * Mock Auction Service
 *
 * Handles mock auction lifecycle operations including auto-extension.
 * Following SOLID principles:
 * - SRP: Only handles mock auction operations
 * - DIP: Implements IMockAuctionService interface
 */

import { prisma } from '@/lib/db'
import type { Auction } from '@prisma/client'
import type {
  IMockAuctionService,
  MockAuctionExtendConfig,
  AutoExtendResult,
} from '@/services/contracts/mock-auction.interface'
import { DEFAULT_MOCK_AUCTION_CONFIG } from '@/services/contracts/mock-auction.interface'

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

class MockAuctionService implements IMockAuctionService {
  /**
   * Auto-extend expired mock auctions using a transaction for atomicity
   */
  async autoExtendExpiredMockAuctions(
    config: MockAuctionExtendConfig = DEFAULT_MOCK_AUCTION_CONFIG
  ): Promise<AutoExtendResult> {
    const errors: string[] = []
    const extensionMs = config.extensionDays * 24 * 60 * 60 * 1000
    const newEndTime = new Date(Date.now() + extensionMs)

    try {
      // Use transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Find expired mock auctions
        const expiredAuctions = await tx.auction.findMany({
          where: {
            isMock: true,
            status: 'ACTIVE',
            currentEndTime: { lte: new Date() },
          },
          select: { id: true, extensionCount: true },
        })

        if (expiredAuctions.length === 0) {
          return { extendedCount: 0, extendedAuctionIds: [] }
        }

        // Filter out auctions that have exceeded max extensions
        const eligibleAuctions = config.maxExtensions
          ? expiredAuctions.filter((a) => a.extensionCount < (config.maxExtensions ?? Infinity))
          : expiredAuctions

        if (eligibleAuctions.length === 0) {
          return { extendedCount: 0, extendedAuctionIds: [] }
        }

        const eligibleIds = eligibleAuctions.map((a) => a.id)

        // Update all eligible auctions
        await tx.auction.updateMany({
          where: { id: { in: eligibleIds } },
          data: {
            currentEndTime: newEndTime,
            originalEndTime: newEndTime,
            extensionCount: { increment: 1 },
          },
        })

        return {
          extendedCount: eligibleIds.length,
          extendedAuctionIds: eligibleIds,
        }
      })

      console.log(
        `[MockAuctionService] Auto-extended ${result.extendedCount} mock auctions to ${newEndTime.toISOString()}`
      )

      return {
        ...result,
        newEndTime,
        errors,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push(errorMsg)
      console.error('[MockAuctionService] Error in autoExtendExpiredMockAuctions:', error)

      return {
        extendedCount: 0,
        extendedAuctionIds: [],
        newEndTime,
        errors,
      }
    }
  }

  /**
   * Get count of active mock auctions (not expired)
   */
  async getActiveMockAuctionCount(): Promise<number> {
    return prisma.auction.count({
      where: {
        isMock: true,
        status: { in: ['ACTIVE', 'EXTENDED'] },
        currentEndTime: { gt: new Date() },
      },
    })
  }

  /**
   * Get count of expired mock auctions
   */
  async getExpiredMockAuctionCount(): Promise<number> {
    return prisma.auction.count({
      where: {
        isMock: true,
        status: 'ACTIVE',
        currentEndTime: { lte: new Date() },
      },
    })
  }

  /**
   * Mark a single auction as mock
   */
  async markAsMock(auctionId: string): Promise<Auction> {
    return prisma.auction.update({
      where: { id: auctionId },
      data: { isMock: true },
    })
  }

  /**
   * Mark multiple auctions as mock
   * If no IDs provided, marks ALL auctions as mock (use with caution!)
   */
  async markManyAsMock(auctionIds?: string[]): Promise<number> {
    const where = auctionIds?.length ? { id: { in: auctionIds } } : {}

    const result = await prisma.auction.updateMany({
      where,
      data: { isMock: true },
    })

    console.log(`[MockAuctionService] Marked ${result.count} auctions as mock`)
    return result.count
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const mockAuctionService = new MockAuctionService()

// Also export individual functions for backwards compatibility
export const autoExtendExpiredMockAuctions = (config?: MockAuctionExtendConfig) =>
  mockAuctionService.autoExtendExpiredMockAuctions(config)

export const getActiveMockAuctionCount = () => mockAuctionService.getActiveMockAuctionCount()

export const getExpiredMockAuctionCount = () => mockAuctionService.getExpiredMockAuctionCount()

export const markAuctionAsMock = (auctionId: string) => mockAuctionService.markAsMock(auctionId)

export const markManyAuctionsAsMock = (auctionIds?: string[]) =>
  mockAuctionService.markManyAsMock(auctionIds)
