import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addToWatchlistSchema, updateWatchlistSchema } from '@/lib/validation-schemas'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { pusher, CHANNELS, EVENTS } from '@/lib/pusher'
import type { WatchlistCountUpdatedEvent } from '@/lib/pusher'

// GET - Get user's watchlist
export const GET = withSimpleErrorHandler(
  async () => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError(
        'You must be logged in to view your watchlist',
        ERROR_CODES.AUTH_REQUIRED
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

    return successResponse({ watchlist })
  },
  {
    requiresAuth: true,
    resourceType: 'watchlist',
    action: 'watchlist.list',
  }
)

// POST - Add auction to watchlist
export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError(
        'You must be logged in to add to watchlist',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    const body = await request.json()
    const { auctionId } = addToWatchlistSchema.parse(body)

    // Check auction exists
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    })

    if (!auction) {
      throw new NotFoundError(
        'Auction not found',
        ERROR_CODES.AUCTION_NOT_FOUND
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
      throw new ConflictError(
        'Already watching this auction',
        ERROR_CODES.RESOURCE_NOT_FOUND // Using generic code since WATCHLIST_DUPLICATE_ENTRY doesn't exist
      )
    }

    // Add to watchlist
    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId: session.user.id,
        auctionId,
      },
    })

    // Get updated watchlist count
    const watchlistCount = await prisma.watchlist.count({
      where: { auctionId },
    })

    // Broadcast updated count via Pusher
    await pusher.trigger(CHANNELS.auction(auctionId), EVENTS.WATCHLIST_COUNT_UPDATED, {
      auctionId,
      watchlistCount,
    } as WatchlistCountUpdatedEvent)

    return successResponse({ watchlistItem }, 201)
  },
  {
    requiresAuth: true,
    resourceType: 'watchlist',
    action: 'watchlist.add',
    auditLog: true,
  }
)

// PATCH - Update watchlist notification preferences
export const PATCH = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError(
        'You must be logged in to update watchlist preferences',
        ERROR_CODES.AUTH_REQUIRED
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
      throw new NotFoundError(
        'Watchlist entry not found',
        ERROR_CODES.RESOURCE_NOT_FOUND
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

    return successResponse({ watchlistItem: updatedWatchlist })
  },
  {
    requiresAuth: true,
    resourceType: 'watchlist',
    action: 'watchlist.update',
    auditLog: true,
  }
)

// DELETE - Remove from watchlist
export const DELETE = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError(
        'You must be logged in to remove from watchlist',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')

    if (!auctionId) {
      throw new ValidationError(
        'Auction ID required',
        ERROR_CODES.VALIDATION_MISSING_FIELD
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

    // Get updated watchlist count
    const watchlistCount = await prisma.watchlist.count({
      where: { auctionId },
    })

    // Broadcast updated count via Pusher
    await pusher.trigger(CHANNELS.auction(auctionId), EVENTS.WATCHLIST_COUNT_UPDATED, {
      auctionId,
      watchlistCount,
    } as WatchlistCountUpdatedEvent)

    return successResponse({ success: true })
  },
  {
    requiresAuth: true,
    resourceType: 'watchlist',
    action: 'watchlist.remove',
    auditLog: true,
  }
)
