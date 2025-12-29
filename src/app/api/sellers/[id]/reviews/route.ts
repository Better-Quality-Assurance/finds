import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createReviewSchema = z.object({
  auctionId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(100).optional(),
  content: z.string().min(10).max(2000).optional(),
})

// GET /api/sellers/[id]/reviews - Get reviews for a seller
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = params.id
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Get reviews with reviewer info
    const [reviews, total, seller] = await Promise.all([
      prisma.sellerReview.findMany({
        where: {
          sellerId,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          auction: {
            select: {
              id: true,
              listing: {
                select: {
                  title: true,
                  make: true,
                  model: true,
                  year: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.sellerReview.count({
        where: { sellerId },
      }),
      prisma.user.findUnique({
        where: { id: sellerId },
        select: {
          averageRating: true,
          totalReviews: true,
        },
      }),
    ])

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        averageRating: seller?.averageRating || null,
        totalReviews: seller?.totalReviews || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// POST /api/sellers/[id]/reviews - Create a new review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sellerId = params.id
    const reviewerId = session.user.id

    // Can't review yourself
    if (sellerId === reviewerId) {
      return NextResponse.json(
        { error: 'You cannot review yourself' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validation = createReviewSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { auctionId, rating, title, content } = validation.data

    // Verify the auction exists and was won by the reviewer
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        listing: {
          select: {
            sellerId: true,
          },
        },
      },
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Verify the reviewer was the winner
    if (auction.winnerId !== reviewerId) {
      return NextResponse.json(
        { error: 'You can only review auctions you won' },
        { status: 403 }
      )
    }

    // Verify the auction seller matches the sellerId in URL
    if (auction.listing.sellerId !== sellerId) {
      return NextResponse.json(
        { error: 'Seller mismatch' },
        { status: 400 }
      )
    }

    // Verify payment was completed
    if (auction.paymentStatus !== 'PAID') {
      return NextResponse.json(
        { error: 'You can only review after payment is completed' },
        { status: 403 }
      )
    }

    // Check if review already exists
    const existingReview = await prisma.sellerReview.findUnique({
      where: {
        auctionId_reviewerId: {
          auctionId,
          reviewerId,
        },
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this seller for this auction' },
        { status: 409 }
      )
    }

    // Create the review and update seller rating in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create review
      const review = await tx.sellerReview.create({
        data: {
          sellerId,
          reviewerId,
          auctionId,
          rating,
          title,
          content,
        },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          auction: {
            select: {
              id: true,
              listing: {
                select: {
                  title: true,
                  make: true,
                  model: true,
                  year: true,
                },
              },
            },
          },
        },
      })

      // Recalculate seller's average rating
      const stats = await tx.sellerReview.aggregate({
        where: { sellerId },
        _avg: { rating: true },
        _count: true,
      })

      // Update seller's rating
      await tx.user.update({
        where: { id: sellerId },
        data: {
          averageRating: stats._avg.rating || null,
          totalReviews: stats._count,
        },
      })

      return review
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
