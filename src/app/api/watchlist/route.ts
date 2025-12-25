import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET - Get user's watchlist
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
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
            _count: {
              select: { bids: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ watchlist })
  } catch (error) {
    console.error('Get watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to get watchlist' },
      { status: 500 }
    )
  }
}

const addToWatchlistSchema = z.object({
  auctionId: z.string().min(1),
})

// POST - Add auction to watchlist
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { auctionId } = addToWatchlistSchema.parse(body)

    // Check auction exists
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Check if already watching
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_auctionId: {
          userId: session.user.id,
          auctionId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already watching this auction' },
        { status: 400 }
      )
    }

    // Add to watchlist
    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId: session.user.id,
        auctionId,
      },
    })

    return NextResponse.json({ watchlistItem }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid auction ID' },
        { status: 400 }
      )
    }

    console.error('Add to watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
}

const updateWatchlistSchema = z.object({
  auctionId: z.string().min(1),
  notifyOnBid: z.boolean().optional(),
  notifyOnEnd: z.boolean().optional(),
})

// PATCH - Update watchlist notification preferences
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { auctionId, notifyOnBid, notifyOnEnd } = updateWatchlistSchema.parse(body)

    // Check watchlist entry exists
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_auctionId: {
          userId: session.user.id,
          auctionId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Watchlist entry not found' },
        { status: 404 }
      )
    }

    // Update preferences
    const updatedWatchlist = await prisma.watchlist.update({
      where: {
        userId_auctionId: {
          userId: session.user.id,
          auctionId,
        },
      },
      data: {
        ...(notifyOnBid !== undefined && { notifyOnBid }),
        ...(notifyOnEnd !== undefined && { notifyOnEnd }),
      },
    })

    return NextResponse.json({ watchlistItem: updatedWatchlist })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid watchlist preferences' },
        { status: 400 }
      )
    }

    console.error('Update watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to update watchlist preferences' },
      { status: 500 }
    )
  }
}

// DELETE - Remove from watchlist
export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')

    if (!auctionId) {
      return NextResponse.json(
        { error: 'Auction ID required' },
        { status: 400 }
      )
    }

    await prisma.watchlist.delete({
      where: {
        userId_auctionId: {
          userId: session.user.id,
          auctionId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove from watchlist error:', error)
    return NextResponse.json(
      { error: 'Failed to remove from watchlist' },
      { status: 500 }
    )
  }
}
