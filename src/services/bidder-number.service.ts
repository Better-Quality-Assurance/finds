// Bidder Number Service - assigns anonymous bidder numbers within auctions
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

/**
 * Get or assign a bidder number for a user in a specific auction.
 *
 * Each auction has its own sequence of bidder numbers (1, 2, 3...).
 * Once a user is assigned a number in an auction, they keep it for all their bids.
 *
 * @param auctionId - The auction ID
 * @param userId - The bidder's user ID
 * @param tx - Optional Prisma transaction client
 * @returns The bidder number and country for display
 */
export async function getOrAssignBidderNumber(
  auctionId: string,
  userId: string,
  tx?: Prisma.TransactionClient
): Promise<{ bidderNumber: number; bidderCountry: string | null }> {
  const client = tx || prisma

  // First check if user already has a bidder number in this auction
  const existingBid = await client.bid.findFirst({
    where: {
      auctionId,
      bidderId: userId,
      bidderNumber: { gt: 0 }, // Exclude legacy bids with bidderNumber = 0
    },
    select: {
      bidderNumber: true,
      bidderCountry: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  if (existingBid && existingBid.bidderNumber > 0) {
    return {
      bidderNumber: existingBid.bidderNumber,
      bidderCountry: existingBid.bidderCountry,
    }
  }

  // Get user's country
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { country: true },
  })

  // User doesn't have a number yet - assign the next one atomically
  // Use raw SQL for atomic increment to avoid race conditions
  const auction = await client.auction.update({
    where: { id: auctionId },
    data: {
      nextBidderNumber: { increment: 1 },
    },
    select: {
      nextBidderNumber: true,
    },
  })

  // The new bidder number is the value BEFORE increment (nextBidderNumber - 1 after increment)
  // Since we just incremented, the assigned number is nextBidderNumber - 1
  const assignedNumber = auction.nextBidderNumber - 1

  return {
    bidderNumber: assignedNumber,
    bidderCountry: user?.country || null,
  }
}

/**
 * Get all bidder number mappings for an auction (admin use only).
 * Returns the mapping of bidder numbers to user details.
 */
export async function getAuctionBidderMappings(auctionId: string) {
  const bids = await prisma.bid.findMany({
    where: {
      auctionId,
      bidderNumber: { gt: 0 },
    },
    select: {
      bidderNumber: true,
      bidderCountry: true,
      bidder: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    distinct: ['bidderId'],
    orderBy: {
      bidderNumber: 'asc',
    },
  })

  return bids.map((bid) => ({
    bidderNumber: bid.bidderNumber,
    country: bid.bidderCountry,
    user: bid.bidder,
  }))
}

/**
 * Format bidder display name for public display.
 * Shows "Bidder X" or "Bidder X (Country)" format.
 */
export function formatBidderDisplay(
  bidderNumber: number,
  country?: string | null
): string {
  if (bidderNumber <= 0) {
    // Legacy bid without number
    return 'Anonymous Bidder'
  }

  if (country) {
    return `Bidder ${bidderNumber} (${country})`
  }

  return `Bidder ${bidderNumber}`
}

/**
 * Get the country display name from ISO code.
 * Uses Intl.DisplayNames for localized country names.
 */
export function getCountryDisplayName(
  countryCode: string | null,
  locale: string = 'en'
): string | null {
  if (!countryCode) return null

  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    return displayNames.of(countryCode.toUpperCase()) || countryCode
  } catch {
    // Fallback to code if DisplayNames not supported
    return countryCode
  }
}
