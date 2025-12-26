/**
 * Mock Activity Generator Interfaces
 *
 * Following SOLID principles:
 * - SRP: Each generator handles one type of activity
 * - OCP: New generators can be added without modifying existing code
 * - LSP: All generators are interchangeable via common interface
 * - ISP: Small, focused interfaces for each responsibility
 * - DIP: Services depend on abstractions, not implementations
 */

import type { Auction, Bid, Comment, User } from '@prisma/client'

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for mock bid generation
 */
export type MockBidConfig = {
  /** Minimum time between bids in milliseconds */
  minIntervalMs: number
  /** Maximum time between bids in milliseconds */
  maxIntervalMs: number
  /** Probability of placing a bid on each check (0-1) */
  bidProbability: number
  /** Maximum number of bids to generate per auction */
  maxBidsPerAuction: number
  /** Whether to trigger anti-sniping extensions */
  allowAntiSnipe: boolean
}

/**
 * Configuration for mock comment generation
 */
export type MockCommentConfig = {
  /** Minimum time between comments in milliseconds */
  minIntervalMs: number
  /** Maximum time between comments in milliseconds */
  maxIntervalMs: number
  /** Probability of posting a comment on each check (0-1) */
  commentProbability: number
  /** Maximum comments per auction */
  maxCommentsPerAuction: number
  /** Include seller responses */
  includeSellResponses: boolean
}

/**
 * Overall mock activity orchestration config
 */
export type MockActivityConfig = {
  /** Enable/disable bid generation */
  enableBids: boolean
  /** Enable/disable comment generation */
  enableComments: boolean
  /** Bid generation config */
  bids: MockBidConfig
  /** Comment generation config */
  comments: MockCommentConfig
  /** Target auction IDs (empty = all active auctions) */
  targetAuctionIds?: string[]
  /** Duration to run in milliseconds (0 = single run) */
  runDurationMs: number
  /** Check interval in milliseconds */
  checkIntervalMs: number
}

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Result of a mock bid generation
 */
export type MockBidResult = {
  success: boolean
  bid?: Bid
  auctionId: string
  bidderId: string
  amount?: number
  triggeredExtension?: boolean
  error?: string
}

/**
 * Result of a mock comment generation
 */
export type MockCommentResult = {
  success: boolean
  comment?: Comment
  listingId: string
  authorId: string
  isSellerResponse?: boolean
  error?: string
}

/**
 * Overall activity generation summary
 */
export type MockActivitySummary = {
  startedAt: Date
  endedAt: Date
  durationMs: number
  bidsGenerated: number
  commentsGenerated: number
  auctionsAffected: string[]
  errors: string[]
  bidResults: MockBidResult[]
  commentResults: MockCommentResult[]
}

// =============================================================================
// GENERATOR INTERFACES (ISP - Interface Segregation)
// =============================================================================

/**
 * Interface for mock bid generation
 * Handles creating realistic bid activity on auctions
 */
export interface IMockBidGenerator {
  /**
   * Generate a single mock bid for an auction
   * @param auctionId - Target auction ID
   * @param config - Bid generation configuration
   * @returns Result of bid generation attempt
   */
  generateBid(auctionId: string, config: MockBidConfig): Promise<MockBidResult>

  /**
   * Generate multiple bids across auctions
   * @param auctionIds - Target auction IDs
   * @param config - Bid generation configuration
   * @returns Array of bid generation results
   */
  generateBids(auctionIds: string[], config: MockBidConfig): Promise<MockBidResult[]>

  /**
   * Get mock bidder users
   * @returns Array of users that can place mock bids
   */
  getMockBidders(): Promise<User[]>

  /**
   * Calculate next bid amount for an auction
   * @param auction - Target auction
   * @returns Suggested bid amount
   */
  calculateNextBidAmount(auction: Auction): number
}

/**
 * Interface for mock comment generation
 * Handles creating realistic Q&A activity on listings
 */
export interface IMockCommentGenerator {
  /**
   * Generate a single mock comment for a listing
   * @param listingId - Target listing ID
   * @param config - Comment generation configuration
   * @returns Result of comment generation attempt
   */
  generateComment(listingId: string, config: MockCommentConfig): Promise<MockCommentResult>

  /**
   * Generate seller response to a comment
   * @param listingId - Target listing ID
   * @param parentCommentId - Comment to respond to
   * @returns Result of comment generation
   */
  generateSellerResponse(listingId: string, parentCommentId: string): Promise<MockCommentResult>

  /**
   * Generate multiple comments across listings
   * @param listingIds - Target listing IDs
   * @param config - Comment generation configuration
   * @returns Array of comment generation results
   */
  generateComments(listingIds: string[], config: MockCommentConfig): Promise<MockCommentResult[]>

  /**
   * Get mock commenters
   * @returns Array of users that can post mock comments
   */
  getMockCommenters(): Promise<User[]>
}

/**
 * Interface for orchestrating all mock activity
 * Coordinates bid and comment generation across auctions
 */
export interface IMockActivityOrchestrator {
  /**
   * Run a single pass of mock activity generation
   * @param config - Activity generation configuration
   * @returns Summary of generated activity
   */
  runOnce(config: MockActivityConfig): Promise<MockActivitySummary>

  /**
   * Run continuous mock activity generation
   * Generates activity at intervals until duration expires
   * @param config - Activity generation configuration
   * @returns Summary of all generated activity
   */
  runContinuous(config: MockActivityConfig): Promise<MockActivitySummary>

  /**
   * Stop any running continuous generation
   */
  stop(): void

  /**
   * Check if generator is currently running
   */
  isRunning(): boolean

  /**
   * Get active auctions eligible for mock activity
   * @param targetIds - Optional specific auction IDs
   * @returns Array of active auctions
   */
  getEligibleAuctions(targetIds?: string[]): Promise<Auction[]>
}

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Default configuration for demo/testing
 */
export const DEFAULT_MOCK_ACTIVITY_CONFIG: MockActivityConfig = {
  enableBids: true,
  enableComments: true,
  bids: {
    minIntervalMs: 30000, // 30 seconds
    maxIntervalMs: 180000, // 3 minutes
    bidProbability: 0.3, // 30% chance per check
    maxBidsPerAuction: 50,
    allowAntiSnipe: true,
  },
  comments: {
    minIntervalMs: 60000, // 1 minute
    maxIntervalMs: 300000, // 5 minutes
    commentProbability: 0.2, // 20% chance per check
    maxCommentsPerAuction: 20,
    includeSellResponses: true,
  },
  runDurationMs: 0, // Single run by default
  checkIntervalMs: 30000, // Check every 30 seconds
}

/**
 * Aggressive configuration for demos
 */
export const DEMO_MOCK_ACTIVITY_CONFIG: MockActivityConfig = {
  enableBids: true,
  enableComments: true,
  bids: {
    minIntervalMs: 5000, // 5 seconds
    maxIntervalMs: 30000, // 30 seconds
    bidProbability: 0.5, // 50% chance
    maxBidsPerAuction: 100,
    allowAntiSnipe: true,
  },
  comments: {
    minIntervalMs: 10000, // 10 seconds
    maxIntervalMs: 60000, // 1 minute
    commentProbability: 0.4, // 40% chance
    maxCommentsPerAuction: 30,
    includeSellResponses: true,
  },
  runDurationMs: 3600000, // 1 hour
  checkIntervalMs: 10000, // Check every 10 seconds
}
