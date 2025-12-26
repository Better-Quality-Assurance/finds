// Auction-related type definitions
// Centralized type definitions for auction entities and related data structures

import { Auction, AuctionStatus, Listing, Bid } from '@prisma/client'

/**
 * Auction with associated listing details
 */
export type AuctionWithListing = Auction & {
  listing: Listing
}

/**
 * Auction with bids and bidder information
 */
export type AuctionWithBids = Auction & {
  listing: Listing
  bids: (Bid & {
    bidder: {
      id: string
      name: string | null
    }
  })[]
}

/**
 * Minimal media information for auction display
 */
export type AuctionMedia = {
  id: string
  publicUrl: string
  isPrimary: boolean
  position: number
}

/**
 * Auction with listing and media
 */
export type AuctionWithMedia = Auction & {
  listing: Listing & {
    media: AuctionMedia[]
  }
}

/**
 * Filter options for auction queries
 */
export type AuctionFilters = {
  category?: string
  minPrice?: number
  maxPrice?: number
  country?: string
  skip?: number
  take?: number
}

/**
 * Bid update data for auction modifications
 */
export type BidUpdateData = {
  currentBid: number
  reserveMet?: boolean
  currentEndTime?: Date
  extensionCount?: number
}

/**
 * Data for marking an auction as sold
 */
export type SoldAuctionData = {
  winnerId: string
  winningBidId?: string
  finalPrice: number
  buyerFeeAmount: number
  paymentDeadline: Date
}

export { AuctionStatus }
