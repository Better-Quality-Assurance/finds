import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/auctions/[id]/similar
 * Returns similar active auctions based on listing properties
 *
 * Similarity algorithm (in priority order):
 * 1. Same make AND model (different year OK)
 * 2. Same make (different model)
 * 3. Same category
 *
 * Returns max 6 results, excludes current auction, only active auctions
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    // Get the current auction to extract listing properties for comparison
    const currentAuction = await prisma.auction.findUnique({
      where: { id },
      select: {
        id: true,
        listing: {
          select: {
            make: true,
            model: true,
            category: true,
          },
        },
      },
    })

    if (!currentAuction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const { make, model, category } = currentAuction.listing

    // Find similar auctions using similarity algorithm
    // We'll use a single query with ordering by similarity priority
    const similarAuctions = await prisma.auction.findMany({
      where: {
        id: { not: id }, // Exclude current auction
        status: 'ACTIVE', // Only active auctions
        listing: {
          status: 'ACTIVE', // Ensure listing is also active
        },
      },
      select: {
        id: true,
        currentBid: true,
        bidCount: true,
        currentEndTime: true,
        reserveMet: true,
        listing: {
          select: {
            id: true,
            title: true,
            year: true,
            make: true,
            model: true,
            startingPrice: true,
            currency: true,
            locationCity: true,
            locationCountry: true,
            isRunning: true,
            category: true,
            media: {
              where: { type: 'PHOTO' },
              orderBy: { position: 'asc' },
              take: 1,
              select: {
                publicUrl: true,
              },
            },
            seller: {
              select: {
                id: true,
                averageRating: true,
                totalReviews: true,
              },
            },
          },
        },
        _count: {
          select: {
            watchlist: true,
          },
        },
      },
      take: 50, // Get more than needed to filter and sort by similarity
    })

    // Calculate similarity score for each auction
    const auctionsWithScore = similarAuctions.map((auction) => {
      let score = 0

      // Priority 1: Same make AND model (highest priority)
      if (
        auction.listing.make === make &&
        auction.listing.model === model
      ) {
        score = 3
      }
      // Priority 2: Same make (different model)
      else if (auction.listing.make === make) {
        score = 2
      }
      // Priority 3: Same category
      else if (auction.listing.category === category) {
        score = 1
      }

      return {
        ...auction,
        similarityScore: score,
      }
    })

    // Sort by similarity score (descending), then by bid count (descending) for tie-breaking
    const sortedAuctions = auctionsWithScore
      .sort((a, b) => {
        if (b.similarityScore !== a.similarityScore) {
          return b.similarityScore - a.similarityScore
        }
        // Tie-breaker: more popular auctions (more bids) first
        return b.bidCount - a.bidCount
      })
      .slice(0, 6) // Limit to 6 results

    // Transform to include watchlist count
    const results = sortedAuctions.map(({ similarityScore, ...auction }) => ({
      ...auction,
      watchlistCount: auction._count.watchlist,
      _count: undefined, // Remove _count from response
    }))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error fetching similar auctions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch similar auctions' },
      { status: 500 }
    )
  }
}
