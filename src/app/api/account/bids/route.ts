import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schema for query parameters
const bidsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  status: z.enum(['all', 'active', 'won', 'lost']).default('all'),
})

/**
 * Mask email for privacy - show domain only
 * e.g., "john.doe@example.com" -> "j***@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) {return '***@***.com'}
  const maskedLocal = local.length > 1 ? local[0] + '***' : '***'
  return `${maskedLocal}@${domain}`
}

// GET - Fetch user's bid history with auction details
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const validation = bidsQuerySchema.safeParse({
      page: searchParams.get('page') || '1',
      status: searchParams.get('status') || 'all',
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { page, status } = validation.data
    const perPage = 20
    const skip = (page - 1) * perPage

    // Build status filter
    let auctionStatusFilter = {}
    if (status === 'active') {
      auctionStatusFilter = {
        status: {
          in: ['SCHEDULED', 'ACTIVE', 'EXTENDED'],
        },
      }
    } else if (status === 'won') {
      auctionStatusFilter = {
        status: {
          in: ['ENDED', 'SOLD'],
        },
        winnerId: session.user.id,
      }
    } else if (status === 'lost') {
      auctionStatusFilter = {
        status: {
          in: ['ENDED', 'SOLD', 'NO_SALE'],
        },
        NOT: {
          winnerId: session.user.id,
        },
      }
    }

    // Fetch bids with auction and listing details
    const [bids, totalCount] = await Promise.all([
      prisma.bid.findMany({
        where: {
          bidderId: session.user.id,
          isValid: true,
          auction: auctionStatusFilter,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: perPage,
        select: {
          id: true,
          amount: true,
          currency: true,
          createdAt: true,
          isWinning: true,
          auction: {
            select: {
              id: true,
              status: true,
              currentBid: true,
              finalPrice: true,
              buyerFeeAmount: true,
              winnerId: true,
              currentEndTime: true,
              paymentStatus: true,
              paymentDeadline: true,
              listing: {
                select: {
                  id: true,
                  title: true,
                  make: true,
                  model: true,
                  year: true,
                  currency: true,
                  media: {
                    where: {
                      isPrimary: true,
                    },
                    select: {
                      publicUrl: true,
                      thumbnailUrl: true,
                    },
                    take: 1,
                  },
                  seller: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.bid.count({
        where: {
          bidderId: session.user.id,
          isValid: true,
          auction: auctionStatusFilter,
        },
      }),
    ])

    // Transform data for client
    const transformedBids = bids.map((bid) => {
      const auction = bid.auction
      const listing = auction.listing
      const isWinner = auction.winnerId === session.user.id
      const isPaid = auction.paymentStatus === 'PAID'

      // Determine bid status
      let bidStatus: 'active' | 'won' | 'lost' | 'outbid'
      if (['SCHEDULED', 'ACTIVE', 'EXTENDED'].includes(auction.status)) {
        bidStatus = bid.isWinning ? 'active' : 'outbid'
      } else if (isWinner && ['ENDED', 'SOLD'].includes(auction.status)) {
        bidStatus = 'won'
      } else {
        bidStatus = 'lost'
      }

      // Only reveal seller contact if winner has paid
      const canSeeSellerContact = isWinner && isPaid
      const sellerContact = canSeeSellerContact && listing.seller ? {
        name: listing.seller.name,
        email: listing.seller.email,
        phone: listing.seller.phone,
        contactRevealed: true,
      } : listing.seller ? {
        name: listing.seller.name,
        email: maskEmail(listing.seller.email),
        phone: null,
        contactRevealed: false,
      } : null

      return {
        id: bid.id,
        amount: bid.amount,
        currency: bid.currency,
        createdAt: bid.createdAt,
        status: bidStatus,
        auction: {
          id: auction.id,
          status: auction.status,
          currentBid: auction.currentBid,
          finalPrice: auction.finalPrice,
          buyerFeeAmount: auction.buyerFeeAmount,
          endTime: auction.currentEndTime,
          // Payment info for winners
          paymentStatus: isWinner ? auction.paymentStatus : null,
          paymentDeadline: isWinner ? auction.paymentDeadline : null,
        },
        listing: {
          id: listing.id,
          title: listing.title,
          make: listing.make,
          model: listing.model,
          year: listing.year,
          currency: listing.currency,
          image: listing.media[0]?.thumbnailUrl || listing.media[0]?.publicUrl || null,
        },
        // Seller contact for winners only
        seller: isWinner ? sellerContact : null,
      }
    })

    const totalPages = Math.ceil(totalCount / perPage)

    return NextResponse.json({
      bids: transformedBids,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Failed to fetch bid history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bid history' },
      { status: 500 }
    )
  }
}
