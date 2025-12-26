/**
 * Auction data transformers for UI components
 *
 * Transforms Prisma auction data to component-ready props format.
 * Handles type conversions, null handling, and data structure mapping.
 */

import type { Prisma } from '@prisma/client'

/**
 * Type definition for auction data with included relations
 */
type AuctionWithRelations = {
  id: string
  currentBid: Prisma.Decimal | null
  bidCount: number
  currentEndTime: Date
  reserveMet: boolean
  extensionCount: number
  status: string
  listing: {
    startingPrice: Prisma.Decimal
    reservePrice: Prisma.Decimal | null
    currency: string
    sellerId: string
  }
}

/**
 * Type definition for bid data from Prisma
 */
type BidWithRelations = {
  id: string
  amount: Prisma.Decimal
  createdAt: Date
  bidderNumber: number
  bidderCountry: string | null
  bidderId: string
}

/**
 * Type definition for transformed auction props
 */
export type BidPanelAuctionProps = {
  id: string
  currentBid: number | null
  bidCount: number
  currentEndTime: string
  reserveMet: boolean
  extensionCount: number
  status: string
  listing: {
    startingPrice: number
    reservePrice: number | null
    currency: string
    sellerId: string
  }
}

/**
 * Type definition for transformed bid props
 */
export type BidPanelBidProps = {
  id: string
  amount: number
  createdAt: string
  bidderNumber: number
  bidderCountry: string | null
  bidder: { id: string }
}

/**
 * Transforms Prisma auction data to BidPanel component props
 *
 * Handles:
 * - Decimal to number conversions for monetary values
 * - Date to ISO string conversions
 * - Null handling for optional fields
 *
 * @param auction - Auction data with listing relation from Prisma
 * @returns Transformed auction object ready for BidPanel
 */
export function transformAuctionForBidPanel(
  auction: AuctionWithRelations
): BidPanelAuctionProps {
  return {
    id: auction.id,
    currentBid: auction.currentBid ? Number(auction.currentBid) : null,
    bidCount: auction.bidCount,
    currentEndTime: auction.currentEndTime.toISOString(),
    reserveMet: auction.reserveMet,
    extensionCount: auction.extensionCount,
    status: auction.status,
    listing: {
      startingPrice: Number(auction.listing.startingPrice),
      reservePrice: auction.listing.reservePrice
        ? Number(auction.listing.reservePrice)
        : null,
      currency: auction.listing.currency,
      sellerId: auction.listing.sellerId,
    },
  }
}

/**
 * Transforms Prisma bid data to BidPanel component props
 *
 * Handles:
 * - Decimal to number conversions for bid amounts
 * - Date to ISO string conversions
 * - Bidder data restructuring to match component expectations
 *
 * @param bids - Array of bid data from Prisma
 * @returns Array of transformed bid objects ready for BidPanel
 */
export function transformBidsForBidPanel(
  bids: BidWithRelations[]
): BidPanelBidProps[] {
  return bids.map((b) => ({
    id: b.id,
    amount: Number(b.amount),
    createdAt: b.createdAt.toISOString(),
    bidderNumber: b.bidderNumber,
    bidderCountry: b.bidderCountry,
    bidder: { id: b.bidderId },
  }))
}
