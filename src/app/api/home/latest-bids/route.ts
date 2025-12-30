import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/home/latest-bids
 * Returns recent bids from active auctions and count of live auctions
 */
export async function GET() {
  try {
    // Fetch latest bids from active auctions
    const recentBids = await prisma.bid.findMany({
      where: {
        auction: {
          status: 'ACTIVE',
        },
        isValid: true,
      },
      include: {
        auction: {
          select: {
            id: true,
            currentEndTime: true,
            reserveMet: true,
            listing: {
              select: {
                id: true,
                title: true,
                year: true,
                make: true,
                model: true,
                currency: true,
                media: {
                  where: {
                    isPrimary: true,
                  },
                  select: {
                    publicUrl: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })

    // Get count of active auctions
    const liveAuctionCount = await prisma.auction.count({
      where: {
        status: 'ACTIVE',
      },
    })

    // Transform data for response
    const formattedBids = recentBids.map((bid) => {
      const listing = bid.auction.listing
      const primaryImage = listing.media[0]

      return {
        id: bid.id,
        amount: Number(bid.amount),
        currency: bid.currency,
        createdAt: bid.createdAt.toISOString(),
        bidderNumber: bid.bidderNumber,
        bidderCountry: bid.bidderCountry,
        auction: {
          id: bid.auction.id,
          currentEndTime: bid.auction.currentEndTime.toISOString(),
          reserveMet: bid.auction.reserveMet,
        },
        listing: {
          id: listing.id,
          title: listing.title,
          year: listing.year,
          make: listing.make,
          model: listing.model,
          currency: listing.currency,
          imageUrl: primaryImage?.publicUrl || null,
        },
      }
    })

    return NextResponse.json({
      bids: formattedBids,
      liveAuctionCount,
    })
  } catch (error) {
    console.error('Error fetching latest bids:', error)
    return NextResponse.json(
      { error: 'Failed to fetch latest bids' },
      { status: 500 }
    )
  }
}
