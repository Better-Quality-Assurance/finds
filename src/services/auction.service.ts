// Auction Service - handles auction lifecycle and operations
import { prisma } from '@/lib/db'
import { Auction, Bid, Listing } from '@prisma/client'
import {
  AUCTION_RULES,
  calculateMinimumBid,
  validateBidAmount,
  shouldExtendAuction,
  calculateExtendedEndTime,
  calculateBuyerFee,
  isReserveMet,
  determineAuctionResult,
  calculatePaymentDeadline,
} from '@/domain/auction/rules'
import { auctionLogger, logError } from '@/lib/logger'
import { auctionStatusValidator } from '@/services/validators/auction-status.validator'
import { listingStatusValidator } from '@/services/validators/listing-status.validator'
import { getOrAssignBidderNumber } from '@/services/bidder-number.service'

type AuctionWithRelations = Auction & {
  listing: Listing
  bids: Bid[]
}

/**
 * Create an auction for an approved listing
 */
export async function createAuction(
  listingId: string,
  startTime: Date,
  durationDays: number = AUCTION_RULES.DEFAULT_DURATION_DAYS
): Promise<Auction> {
  // Verify listing exists and is approved
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (!listingStatusValidator.isApproved(listing.status)) {
    throw new Error('Listing must be approved before creating auction')
  }

  // Check no existing auction
  const existingAuction = await prisma.auction.findUnique({
    where: { listingId },
  })

  if (existingAuction) {
    throw new Error('Auction already exists for this listing')
  }

  // Validate duration
  if (durationDays < AUCTION_RULES.MIN_DURATION_DAYS || durationDays > AUCTION_RULES.MAX_DURATION_DAYS) {
    throw new Error(`Duration must be between ${AUCTION_RULES.MIN_DURATION_DAYS} and ${AUCTION_RULES.MAX_DURATION_DAYS} days`)
  }

  // Calculate end time
  const endTime = new Date(startTime)
  endTime.setDate(endTime.getDate() + durationDays)

  // Create auction with pricing from listing
  const auction = await prisma.auction.create({
    data: {
      listingId,
      startTime,
      originalEndTime: endTime,
      currentEndTime: endTime,
      status: startTime <= new Date() ? 'ACTIVE' : 'SCHEDULED',
      antiSnipingEnabled: true,
      startingPrice: listing.startingPrice,
      reservePrice: listing.reservePrice,
      currency: listing.currency,
    },
  })

  // Update listing status
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: 'ACTIVE' },
  })

  return auction
}

/**
 * Get auction by ID with all relations
 */
export async function getAuctionById(auctionId: string): Promise<AuctionWithRelations | null> {
  return prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      listing: true,
      bids: {
        orderBy: { createdAt: 'desc' },
        include: {
          bidder: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })
}

/**
 * Get auction by listing ID
 */
export async function getAuctionByListingId(listingId: string): Promise<Auction | null> {
  return prisma.auction.findUnique({
    where: { listingId },
  })
}

/**
 * Get active auctions with pagination
 */
export async function getActiveAuctions(options: {
  page?: number
  limit?: number
  category?: string
  minPrice?: number
  maxPrice?: number
  country?: string
  sortBy?: 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids'
}) {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    country,
    sortBy = 'ending_soon',
  } = options

  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    currentEndTime: { gt: new Date() },
  }

  // Build listing filters
  const listingWhere: Record<string, unknown> = {}
  if (category) listingWhere.category = category
  if (country) listingWhere.locationCountry = country
  if (minPrice !== undefined || maxPrice !== undefined) {
    listingWhere.startingPrice = {}
    if (minPrice !== undefined) (listingWhere.startingPrice as Record<string, number>).gte = minPrice
    if (maxPrice !== undefined) (listingWhere.startingPrice as Record<string, number>).lte = maxPrice
  }

  if (Object.keys(listingWhere).length > 0) {
    where.listing = listingWhere
  }

  // Determine sort order
  let orderBy: Record<string, unknown> = {}
  switch (sortBy) {
    case 'ending_soon':
      orderBy = { currentEndTime: 'asc' }
      break
    case 'newly_listed':
      orderBy = { startTime: 'desc' }
      break
    case 'price_low':
      orderBy = { currentBid: 'asc' }
      break
    case 'price_high':
      orderBy = { currentBid: 'desc' }
      break
    case 'most_bids':
      orderBy = { bidCount: 'desc' }
      break
  }

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        listing: {
          include: {
            media: {
              where: { type: 'PHOTO' },
              take: 1,
              orderBy: { position: 'asc' },
            },
          },
        },
        _count: {
          select: { bids: true },
        },
      },
    }),
    prisma.auction.count({ where }),
  ])

  return {
    auctions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get ending soon auctions (for homepage)
 */
export async function getEndingSoonAuctions(limit: number = 6) {
  const now = new Date()
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  return prisma.auction.findMany({
    where: {
      status: 'ACTIVE',
      currentEndTime: {
        gt: now,
        lte: soon,
      },
    },
    orderBy: { currentEndTime: 'asc' },
    take: limit,
    include: {
      listing: {
        include: {
          media: {
            where: { type: 'PHOTO' },
            take: 1,
            orderBy: { position: 'asc' },
          },
        },
      },
      _count: {
        select: { bids: true },
      },
    },
  })
}

/**
 * Place a bid on an auction
 */
export async function placeBid(
  auctionId: string,
  bidderId: string,
  amount: number,
  metadata?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ bid: Bid; auction: Auction; extended: boolean }> {
  // Use transaction for atomic operations
  return prisma.$transaction(async (tx) => {
    // Get auction with lock
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { listing: true },
    })

    if (!auction) {
      throw new Error('Auction not found')
    }

    // Validate auction is active
    const now = new Date()
    if (!auctionStatusValidator.canPlaceBid(auction.status)) {
      throw new Error('Auction is not accepting bids')
    }
    if (now < auction.startTime) {
      throw new Error('Auction has not started yet')
    }
    if (now >= auction.currentEndTime) {
      throw new Error('Auction has ended')
    }

    // Validate bidder is not the seller
    if (auction.listing.sellerId === bidderId) {
      throw new Error('Sellers cannot bid on their own listings')
    }

    // Validate bid amount
    const currentBid = auction.currentBid ? Number(auction.currentBid) : null
    const startingPrice = Number(auction.listing.startingPrice)
    const validation = validateBidAmount(amount, currentBid, startingPrice)

    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Check for anti-sniping extension
    let extended = false
    let newEndTime = auction.currentEndTime

    if (auction.antiSnipingEnabled && shouldExtendAuction(now, auction.currentEndTime, auction.extensionCount)) {
      newEndTime = calculateExtendedEndTime(auction.currentEndTime)
      extended = true
    }

    // Check if reserve is met
    const reservePrice = auction.listing.reservePrice ? Number(auction.listing.reservePrice) : null
    const reserveMet = isReserveMet(amount, reservePrice)

    // Get or assign bidder number for anonymity
    const { bidderNumber, bidderCountry } = await getOrAssignBidderNumber(
      auctionId,
      bidderId,
      tx
    )

    // Create bid
    const bid = await tx.bid.create({
      data: {
        auctionId,
        bidderId,
        amount,
        bidderNumber,
        bidderCountry,
        isWinning: true,
        triggeredExtension: extended,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    })

    // Update previous winning bid
    await tx.bid.updateMany({
      where: {
        auctionId,
        isWinning: true,
        id: { not: bid.id },
      },
      data: { isWinning: false },
    })

    // Update auction
    const updatedAuction = await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentBid: amount,
        bidCount: { increment: 1 },
        reserveMet,
        currentEndTime: newEndTime,
        extensionCount: extended ? { increment: 1 } : undefined,
      },
    })

    return { bid, auction: updatedAuction, extended }
  })
}

/**
 * Get bid history for an auction
 */
export async function getBidHistory(auctionId: string, limit: number = 50) {
  return prisma.bid.findMany({
    where: { auctionId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      bidder: {
        select: { id: true, name: true },
      },
    },
  })
}

/**
 * Get user's bid history
 */
export async function getUserBids(userId: string, options?: { page?: number; limit?: number }) {
  const { page = 1, limit = 20 } = options || {}

  const [bids, total] = await Promise.all([
    prisma.bid.findMany({
      where: { bidderId: userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        auction: {
          include: {
            listing: {
              include: {
                media: {
                  where: { type: 'PHOTO' },
                  take: 1,
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
    }),
    prisma.bid.count({ where: { bidderId: userId } }),
  ])

  return {
    bids,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

/**
 * End an auction (called by cron job or manually)
 */
export async function endAuction(auctionId: string): Promise<Auction> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      listing: true,
      bids: {
        where: { isWinning: true },
        take: 1,
      },
    },
  })

  if (!auction) {
    throw new Error('Auction not found')
  }

  if (!auctionStatusValidator.canEnd(auction.status)) {
    throw new Error('Auction cannot be ended in current status')
  }

  // Determine result
  const currentBid = auction.currentBid ? Number(auction.currentBid) : null
  const reservePrice = auction.listing.reservePrice ? Number(auction.listing.reservePrice) : null
  const result = determineAuctionResult(currentBid, reservePrice)

  const winningBid = auction.bids[0]
  const buyerFee = result === 'SOLD' && currentBid ? calculateBuyerFee(currentBid) : null

  // Calculate payment deadline if sold
  const paymentDeadline = result === 'SOLD' ? calculatePaymentDeadline(auction.currentEndTime) : null

  // Update auction
  const updatedAuction = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status: result,
      winnerId: result === 'SOLD' ? winningBid?.bidderId : null,
      finalPrice: result === 'SOLD' ? currentBid : null,
      buyerFeeAmount: buyerFee,
      paymentDeadline,
      paymentStatus: result === 'SOLD' ? 'UNPAID' : 'UNPAID',
    },
  })

  // Update listing status
  await prisma.listing.update({
    where: { id: auction.listingId },
    data: { status: result === 'SOLD' ? 'SOLD' : 'EXPIRED' },
  })

  // Notify watchers about auction ending (non-blocking)
  import('./notification.service')
    .then(({ notifyWatchersAuctionEnded, notifyAuctionWon, notifyAuctionLost }) => {
      // Notify watchers
      const watcherPromise = notifyWatchersAuctionEnded(
        auctionId,
        currentBid,
        auction.currency,
        result
      )

      // Notify winner if sold
      const winnerPromise = result === 'SOLD' && winningBid
        ? notifyAuctionWon(
            winningBid.bidderId,
            auctionId,
            auction.listing.title,
            currentBid!,
            auction.currency
          )
        : Promise.resolve()

      // Notify losing bidders
      const losersPromise = notifyAuctionLost(
        auctionId,
        auction.listing.title,
        winningBid?.bidderId
      )

      return Promise.allSettled([watcherPromise, winnerPromise, losersPromise])
    })
    .catch(error => {
      logError(
        auctionLogger,
        'Failed to send auction end notifications',
        error,
        { auctionId }
      )
    })

  return updatedAuction
}

/**
 * Cancel an auction (admin only)
 */
export async function cancelAuction(auctionId: string, reason: string): Promise<Auction> {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
  })

  if (!auction) {
    throw new Error('Auction not found')
  }

  if (!auctionStatusValidator.canCancel(auction.status)) {
    throw new Error('Cannot cancel auction in current status')
  }

  // Update auction
  const updatedAuction = await prisma.auction.update({
    where: { id: auctionId },
    data: {
      status: 'CANCELLED',
    },
  })

  // Update listing status back to approved
  await prisma.listing.update({
    where: { id: auction.listingId },
    data: { status: 'WITHDRAWN' },
  })

  // TODO: Log cancellation reason in audit log
  // TODO: Notify bidders about cancellation

  return updatedAuction
}

/**
 * Check and activate scheduled auctions (called by cron)
 * Returns count of activated auctions
 * Also broadcasts notifications for newly activated auctions
 */
export async function activateScheduledAuctions(): Promise<number> {
  const now = new Date()

  // Find scheduled auctions that should become active
  const scheduledAuctions = await prisma.auction.findMany({
    where: {
      status: 'SCHEDULED',
      startTime: { lte: now },
    },
    include: {
      listing: {
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  })

  if (scheduledAuctions.length === 0) {
    return 0
  }

  // Update all to active
  const result = await prisma.auction.updateMany({
    where: {
      status: 'SCHEDULED',
      startTime: { lte: now },
    },
    data: { status: 'ACTIVE' },
  })

  // Trigger notifications for each newly activated auction
  // Import notification service dynamically to avoid circular dependencies
  const { notifyListingApproved, broadcastAuctionLive } = await import('./notification.service')

  for (const auction of scheduledAuctions) {
    try {
      // Notify seller
      await notifyListingApproved(
        auction.listing.sellerId,
        auction.listingId,
        auction.listing.title,
        auction.id,
        auction.currentEndTime
      )

      // Broadcast to public
      const imageUrl = auction.listing.media[0]?.publicUrl

      await broadcastAuctionLive(
        auction.id,
        auction.listing.title,
        Number(auction.startingPrice),
        auction.currency,
        auction.currentEndTime,
        imageUrl
      )

      auctionLogger.info({
        auctionId: auction.id,
        listingTitle: auction.listing.title,
        startingPrice: Number(auction.startingPrice),
        currency: auction.currency,
      }, 'Auction activated and broadcasted')
    } catch (error) {
      logError(
        auctionLogger,
        'Failed to notify for activated auction',
        error,
        { auctionId: auction.id }
      )
    }
  }

  return result.count
}

/**
 * Check and end expired auctions (called by cron)
 * Returns count of ended auctions
 * Note: This function is a wrapper - the actual ending and broadcasting
 * is handled by the cron job which calls endAuction() for each expired auction
 */
export async function endExpiredAuctions(): Promise<number> {
  const now = new Date()

  // Find expired active auctions
  const expiredAuctions = await prisma.auction.findMany({
    where: {
      status: 'ACTIVE',
      currentEndTime: { lte: now },
    },
    select: { id: true },
  })

  // End each auction
  for (const auction of expiredAuctions) {
    try {
      await endAuction(auction.id)
      auctionLogger.info({ auctionId: auction.id }, 'Auction ended successfully')
    } catch (error) {
      logError(
        auctionLogger,
        'Failed to end auction',
        error,
        { auctionId: auction.id }
      )
    }
  }

  return expiredAuctions.length
}
