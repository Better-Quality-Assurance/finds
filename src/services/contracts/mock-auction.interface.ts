/**
 * Mock Auction Service Interface
 *
 * Following SOLID principles:
 * - SRP: Handles only mock auction lifecycle operations
 * - OCP: Configurable via environment variables
 * - DIP: Route handlers depend on this abstraction
 */

import type { Auction } from '@prisma/client'

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for mock auction auto-extension
 */
export type MockAuctionExtendConfig = {
  /** Number of days to extend expired mock auctions */
  extensionDays: number
  /** Maximum number of times an auction can be extended */
  maxExtensions?: number
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Result of auto-extend operation
 */
export type AutoExtendResult = {
  /** Number of auctions extended */
  extendedCount: number
  /** IDs of extended auctions */
  extendedAuctionIds: string[]
  /** New end time applied */
  newEndTime: Date
  /** Any errors encountered */
  errors: string[]
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

/**
 * Interface for mock auction management
 */
export interface IMockAuctionService {
  /**
   * Auto-extend expired mock auctions
   * Only extends auctions where isMock=true and status=ACTIVE but past end time
   *
   * @param config - Extension configuration
   * @returns Result of extension operation
   */
  autoExtendExpiredMockAuctions(config?: MockAuctionExtendConfig): Promise<AutoExtendResult>

  /**
   * Get count of active mock auctions
   * @returns Number of currently active mock auctions
   */
  getActiveMockAuctionCount(): Promise<number>

  /**
   * Get count of expired mock auctions (ACTIVE status but past end time)
   * @returns Number of expired mock auctions
   */
  getExpiredMockAuctionCount(): Promise<number>

  /**
   * Mark an auction as mock
   * @param auctionId - Auction ID to mark
   * @returns Updated auction
   */
  markAsMock(auctionId: string): Promise<Auction>

  /**
   * Mark multiple auctions as mock
   * @param auctionIds - Auction IDs to mark (empty = all existing auctions)
   * @returns Number of auctions updated
   */
  markManyAsMock(auctionIds?: string[]): Promise<number>
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default mock auction extension configuration
 * Can be overridden via MOCK_AUCTION_EXTEND_DAYS environment variable
 */
export const DEFAULT_MOCK_AUCTION_CONFIG: MockAuctionExtendConfig = {
  extensionDays: parseInt(process.env.MOCK_AUCTION_EXTEND_DAYS || '7', 10),
  maxExtensions: 52, // ~1 year of weekly extensions
}
