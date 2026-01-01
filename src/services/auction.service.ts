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
import {
  AuctionNotActiveError,
  AuctionEndedError,
  AuctionNotStartedError,
  BidTooLowError,
  SelfBidError,
  NotFoundError,
} from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

type AuctionWithRelations = Auction & {
  listing: Listing
  bids: Bid[]
}

import { PaginatedAuctions } from '@/services/contracts/auction.interface'

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
 * Get active auctions with pagination and optional full-text search
 */
export async function getActiveAuctions(options: {
  page?: number
  limit?: number
  category?: string
  minPrice?: number
  maxPrice?: number
  country?: string
  sortBy?: 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids' | 'relevance'
  searchQuery?: string
}): Promise<PaginatedAuctions> {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    country,
    sortBy = 'ending_soon',
    searchQuery,
  } = options

  // If searching, use raw SQL for full-text search with ranking
  if (searchQuery && searchQuery.trim()) {
    return getActiveAuctionsWithSearch({
      page,
      limit,
      category,
      minPrice,
      maxPrice,
      country,
      sortBy: sortBy === 'relevance' ? 'relevance' : sortBy,
      searchQuery: searchQuery.trim(),
    })
  }

  // Regular query without search
  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    currentEndTime: { gt: new Date() },
  }

  // Build listing filters
  const listingWhere: Record<string, unknown> = {}
  if (category) {listingWhere.category = category}
  if (country) {listingWhere.locationCountry = country}
  if (minPrice !== undefined || maxPrice !== undefined) {
    listingWhere.startingPrice = {}
    if (minPrice !== undefined) {(listingWhere.startingPrice as Record<string, number>).gte = minPrice}
    if (maxPrice !== undefined) {(listingWhere.startingPrice as Record<string, number>).lte = maxPrice}
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

  const [rawAuctions, total] = await Promise.all([
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

  // Transform Prisma Decimal types to numbers
  const auctions = rawAuctions.map(a => ({
    id: a.id,
    listingId: a.listingId,
    startTime: a.startTime,
    currentEndTime: a.currentEndTime,
    currentBid: a.currentBid ? Number(a.currentBid) : null,
    bidCount: a.bidCount,
    reserveMet: a.reserveMet,
    listing: {
      id: a.listing.id,
      title: a.listing.title,
      year: a.listing.year,
      make: a.listing.make,
      model: a.listing.model,
      startingPrice: Number(a.listing.startingPrice),
      currency: a.listing.currency,
      locationCity: a.listing.locationCity,
      locationCountry: a.listing.locationCountry,
      isRunning: a.listing.isRunning,
      media: a.listing.media.map(m => ({
        id: m.id,
        publicUrl: m.publicUrl,
        thumbnailUrl: m.thumbnailUrl,
      })),
    },
    _count: a._count,
  }))

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
 * Get active auctions with full-text search
 */
async function getActiveAuctionsWithSearch(options: {
  page: number
  limit: number
  category?: string
  minPrice?: number
  maxPrice?: number
  country?: string
  sortBy: 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids' | 'relevance'
  searchQuery: string
}): Promise<PaginatedAuctions> {
  const {
    page,
    limit,
    category,
    minPrice,
    maxPrice,
    country,
    sortBy,
    searchQuery,
  } = options

  // Sanitize search query and convert to tsquery format
  // Replace special characters and split into words
  const sanitized = searchQuery
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(' & ') // Use AND operator for all words

  if (!sanitized) {
    // If search query becomes empty after sanitization, return regular results
    return getActiveAuctions({ page, limit, category, minPrice, maxPrice, country, sortBy })
  }

  // Build WHERE clauses for filters
  const filterConditions: string[] = ['a.status = \'ACTIVE\'', 'a.current_end_time > NOW()']
  const filterParams: unknown[] = []
  let paramIndex = 1

  if (category) {
    filterConditions.push(`l.category = $${paramIndex}`)
    filterParams.push(category)
    paramIndex++
  }

  if (country) {
    filterConditions.push(`l.location_country = $${paramIndex}`)
    filterParams.push(country)
    paramIndex++
  }

  if (minPrice !== undefined) {
    filterConditions.push(`l.starting_price >= $${paramIndex}`)
    filterParams.push(minPrice)
    paramIndex++
  }

  if (maxPrice !== undefined) {
    filterConditions.push(`l.starting_price <= $${paramIndex}`)
    filterParams.push(maxPrice)
    paramIndex++
  }

  // Add search condition
  filterConditions.push(`l.search_vector @@ to_tsquery('english', $${paramIndex})`)
  filterParams.push(sanitized)
  const searchParamIndex = paramIndex
  paramIndex++

  const whereClause = filterConditions.join(' AND ')

  // Determine ORDER BY clause
  let orderByClause = ''
  switch (sortBy) {
    case 'relevance':
      orderByClause = `ts_rank(l.search_vector, to_tsquery('english', $${searchParamIndex})) DESC, a.current_end_time ASC`
      break
    case 'ending_soon':
      orderByClause = 'a.current_end_time ASC'
      break
    case 'newly_listed':
      orderByClause = 'a.start_time DESC'
      break
    case 'price_low':
      orderByClause = 'a.current_bid ASC NULLS FIRST'
      break
    case 'price_high':
      orderByClause = 'a.current_bid DESC NULLS LAST'
      break
    case 'most_bids':
      orderByClause = 'a.bid_count DESC'
      break
  }

  // Count total matching auctions
  const countQuery = `
    SELECT COUNT(*)::int as count
    FROM auctions a
    INNER JOIN listings l ON a.listing_id = l.id
    WHERE ${whereClause}
  `

  const countResult = await prisma.$queryRawUnsafe<[{ count: number }]>(countQuery, ...filterParams)
  const total = countResult[0]?.count || 0

  // Fetch paginated auctions
  const offset = (page - 1) * limit
  filterParams.push(limit, offset)

  const auctionsQuery = `
    SELECT
      a.id,
      a.listing_id,
      a.start_time,
      a.original_end_time,
      a.current_end_time,
      a.anti_sniping_enabled,
      a.anti_sniping_window_minutes,
      a.anti_sniping_extension_minutes,
      a.extension_count,
      a.max_extensions,
      a.starting_price,
      a.reserve_price,
      a.reserve_met,
      a.current_bid,
      a.bid_increment,
      a.currency,
      a.bid_count,
      a.next_bidder_number,
      a.status,
      a.winner_id,
      a.winning_bid_id,
      a.final_price,
      a.buyer_fee_rate,
      a.buyer_fee_amount,
      a.payment_status,
      a.payment_intent_id,
      a.paid_at,
      a.payment_deadline,
      a.seller_payout_status,
      a.seller_payout_id,
      a.seller_payout_amount,
      a.seller_paid_at,
      a.created_at,
      a.updated_at,
      l.id as listing_id,
      l.title,
      l.year,
      l.make,
      l.model,
      l.starting_price as listing_starting_price,
      l.currency as listing_currency,
      l.location_city,
      l.location_country,
      l.is_running,
      ts_rank(l.search_vector, to_tsquery('english', $${searchParamIndex})) as search_rank
    FROM auctions a
    INNER JOIN listings l ON a.listing_id = l.id
    WHERE ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `

  const auctionsRaw = await prisma.$queryRawUnsafe<unknown[]>(auctionsQuery, ...filterParams)

  // Fetch media for each listing
  const auctionIds = (auctionsRaw as { id: string }[]).map(a => a.id)

  const media = auctionIds.length > 0
    ? await prisma.listingMedia.findMany({
        where: {
          listing: {
            auction: {
              id: { in: auctionIds }
            }
          },
          type: 'PHOTO',
        },
        orderBy: { position: 'asc' },
        take: auctionIds.length, // One per auction
      })
    : []

  // Transform raw results to match expected structure
  const auctions = (auctionsRaw as {
    id: string
    listing_id: string
    start_time: Date
    current_end_time: Date
    current_bid: number | null
    bid_count: number
    reserve_met: boolean
    title: string
    year: number
    make: string
    model: string
    listing_starting_price: number
    listing_currency: string
    location_city: string
    location_country: string
    is_running: boolean
    search_rank: number
  }[]).map(a => ({
    id: a.id,
    listingId: a.listing_id,
    startTime: a.start_time,
    currentEndTime: a.current_end_time,
    currentBid: a.current_bid,
    bidCount: a.bid_count,
    reserveMet: a.reserve_met,
    listing: {
      id: a.listing_id,
      title: a.title,
      year: a.year,
      make: a.make,
      model: a.model,
      startingPrice: a.listing_starting_price,
      currency: a.listing_currency,
      locationCity: a.location_city,
      locationCountry: a.location_country,
      isRunning: a.is_running,
      media: media.filter(m => m.listingId === a.listing_id).slice(0, 1),
    },
    _count: {
      bids: a.bid_count,
    },
  }))

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
      throw new NotFoundError('Auction not found', ERROR_CODES.AUCTION_NOT_FOUND)
    }

    // Validate auction is active
    const now = new Date()
    if (!auctionStatusValidator.canPlaceBid(auction.status)) {
      throw new AuctionNotActiveError('Auction is not accepting bids')
    }
    if (now < auction.startTime) {
      throw new AuctionNotStartedError()
    }
    if (now >= auction.currentEndTime) {
      throw new AuctionEndedError()
    }

    // Validate bidder is not the seller
    if (auction.listing.sellerId === bidderId) {
      throw new SelfBidError()
    }

    // Validate bid amount
    const currentBid = auction.currentBid ? Number(auction.currentBid) : null
    const startingPrice = Number(auction.listing.startingPrice)
    const validation = validateBidAmount(amount, currentBid, startingPrice)

    if (!validation.valid) {
      throw new BidTooLowError(validation.minimumBid, validation.error)
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
        where: { isWinning: true, isValid: true },
        orderBy: { createdAt: 'desc' },
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
      winningBidId: result === 'SOLD' ? winningBid?.id : null,
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

  // Handle unsold auctions: notify seller and generate AI suggestions
  if (result === 'NO_SALE') {
    const improvementReason = currentBid === null ? 'no_bids' : 'reserve_not_met'

    // Notify seller immediately (non-blocking)
    import('./notification.service')
      .then(({ notifySellerAuctionExpired }) => {
        return notifySellerAuctionExpired(
          auction.listing.sellerId,
          auctionId,
          auction.listingId,
          auction.listing.title,
          improvementReason,
          [] // Suggestions will be available later
        )
      })
      .catch(error => {
        logError(auctionLogger, 'Failed to notify seller of expired auction', error, { auctionId })
      })

    // Generate AI improvement suggestions (non-blocking, takes longer)
    import('./ai/listing-improvement.service')
      .then(({ generateListingImprovements }) => {
        return generateListingImprovements(
          auction.listingId,
          auctionId,
          improvementReason
        )
      })
      .then(() => {
        auctionLogger.info(
          { auctionId, listingId: auction.listingId, reason: improvementReason },
          'Generated listing improvement suggestions'
        )
      })
      .catch(error => {
        logError(
          auctionLogger,
          'Failed to generate listing improvements',
          error,
          { auctionId, listingId: auction.listingId }
        )
      })
  }

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
