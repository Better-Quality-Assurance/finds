import { Auction, Bid, Listing } from '@prisma/client'

/**
 * Auction with all relations
 */
export type AuctionWithRelations = Auction & {
  listing: Listing
  bids: Bid[]
}

/**
 * Options for getting active auctions
 */
export type GetActiveAuctionsOptions = {
  page?: number
  limit?: number
  category?: string
  minPrice?: number
  maxPrice?: number
  country?: string
  sortBy?: 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids'
}

/**
 * Paginated auction results
 */
export type PaginatedAuctions = {
  auctions: Auction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Bid placement result
 */
export type PlaceBidResult = {
  bid: Bid
  auction: Auction
  extended: boolean
}

/**
 * Metadata for bid placement
 */
export type BidMetadata = {
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * User bids result
 */
export type UserBidsResult = {
  bids: Bid[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Interface for auction service
 * Handles auction lifecycle, bidding, and auction operations
 */
export interface IAuctionService {
  /**
   * Create an auction for an approved listing
   */
  createAuction(
    listingId: string,
    startTime: Date,
    durationDays?: number
  ): Promise<Auction>

  /**
   * Get auction by ID with all relations
   */
  getAuctionById(auctionId: string): Promise<AuctionWithRelations | null>

  /**
   * Get auction by listing ID
   */
  getAuctionByListingId(listingId: string): Promise<Auction | null>

  /**
   * Get active auctions with pagination and filtering
   */
  getActiveAuctions(options: GetActiveAuctionsOptions): Promise<PaginatedAuctions>

  /**
   * Get ending soon auctions (for homepage)
   */
  getEndingSoonAuctions(limit?: number): Promise<Auction[]>

  /**
   * Place a bid on an auction
   */
  placeBid(
    auctionId: string,
    bidderId: string,
    amount: number,
    metadata?: BidMetadata
  ): Promise<PlaceBidResult>

  /**
   * Get bid history for an auction
   */
  getBidHistory(auctionId: string, limit?: number): Promise<Bid[]>

  /**
   * Get user's bid history
   */
  getUserBids(userId: string, options?: { page?: number; limit?: number }): Promise<UserBidsResult>

  /**
   * End an auction (called by cron job or manually)
   */
  endAuction(auctionId: string): Promise<Auction>

  /**
   * Cancel an auction (admin only)
   */
  cancelAuction(auctionId: string, reason: string): Promise<Auction>

  /**
   * Check and activate scheduled auctions (called by cron)
   */
  activateScheduledAuctions(): Promise<number>

  /**
   * Check and end expired auctions (called by cron)
   */
  endExpiredAuctions(): Promise<number>
}
