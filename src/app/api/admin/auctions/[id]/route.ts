import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { logAuditEvent } from '@/services/audit.service'
import { cancelAuction, endAuction } from '@/services/auction.service'
import { releaseNonWinningDeposits } from '@/services/payment.service'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - Get auction details
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!admin || !['ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            seller: {
              select: { id: true, name: true, email: true },
            },
            media: {
              where: { type: 'PHOTO' },
              take: 5,
              orderBy: { position: 'asc' },
            },
          },
        },
        bids: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            bidder: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { bids: true, watchlist: true },
        },
      },
    })

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    // Get fraud alerts for this auction
    const fraudAlerts = await prisma.fraudAlert.findMany({
      where: { auctionId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({ auction, fraudAlerts })
  } catch (error) {
    console.error('Get auction error:', error)
    return NextResponse.json(
      { error: 'Failed to get auction' },
      { status: 500 }
    )
  }
}

const actionSchema = z.object({
  action: z.enum(['cancel', 'end', 'extend', 'invalidate_bid']),
  reason: z.string().optional(),
  bidId: z.string().optional(),
  extensionMinutes: z.number().optional(),
})

// PUT - Admin auction actions
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!admin || !['ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { action, reason, bidId, extensionMinutes } = actionSchema.parse(body)

    const auction = await prisma.auction.findUnique({
      where: { id },
      include: { listing: true },
    })

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    let result: unknown

    switch (action) {
      case 'cancel':
        if (!['SCHEDULED', 'ACTIVE'].includes(auction.status)) {
          return NextResponse.json(
            { error: 'Cannot cancel auction in current status' },
            { status: 400 }
          )
        }

        result = await cancelAuction(id, reason || 'Cancelled by admin')

        // Release all deposits
        await releaseNonWinningDeposits(id)

        await logAuditEvent({
          actorId: session.user.id,
          action: 'AUCTION_CANCELLED',
          resourceType: 'AUCTION',
          resourceId: id,
          details: { reason },
          severity: 'HIGH',
        })
        break

      case 'end':
        if (auction.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Auction is not active' },
            { status: 400 }
          )
        }

        result = await endAuction(id)

        await logAuditEvent({
          actorId: session.user.id,
          action: 'AUCTION_ENDED',
          resourceType: 'AUCTION',
          resourceId: id,
          details: { reason, forcedEnd: true },
          severity: 'MEDIUM',
        })
        break

      case 'extend':
        if (auction.status !== 'ACTIVE') {
          return NextResponse.json(
            { error: 'Auction is not active' },
            { status: 400 }
          )
        }

        const minutes = extensionMinutes || 60
        const newEndTime = new Date(auction.currentEndTime.getTime() + minutes * 60 * 1000)

        result = await prisma.auction.update({
          where: { id },
          data: {
            currentEndTime: newEndTime,
            extensionCount: { increment: 1 },
          },
        })

        await logAuditEvent({
          actorId: session.user.id,
          action: 'AUCTION_EXTENDED',
          resourceType: 'AUCTION',
          resourceId: id,
          details: { reason, extensionMinutes: minutes, newEndTime },
          severity: 'MEDIUM',
        })
        break

      case 'invalidate_bid':
        if (!bidId) {
          return NextResponse.json(
            { error: 'Bid ID required' },
            { status: 400 }
          )
        }

        const bid = await prisma.bid.findUnique({
          where: { id: bidId },
        })

        if (!bid || bid.auctionId !== id) {
          return NextResponse.json(
            { error: 'Bid not found' },
            { status: 404 }
          )
        }

        result = await prisma.bid.update({
          where: { id: bidId },
          data: {
            isValid: false,
            invalidatedReason: reason || 'Invalidated by admin',
          },
        })

        // If this was the winning bid, need to recalculate current bid
        if (bid.isWinning) {
          const nextBid = await prisma.bid.findFirst({
            where: {
              auctionId: id,
              isValid: true,
              id: { not: bidId },
            },
            orderBy: { amount: 'desc' },
          })

          await prisma.auction.update({
            where: { id },
            data: {
              currentBid: nextBid?.amount || null,
              bidCount: { decrement: 1 },
            },
          })

          if (nextBid) {
            await prisma.bid.update({
              where: { id: nextBid.id },
              data: { isWinning: true },
            })
          }
        }

        await logAuditEvent({
          actorId: session.user.id,
          action: 'BID_INVALIDATED',
          resourceType: 'BID',
          resourceId: bidId,
          details: { reason, auctionId: id, amount: Number(bid.amount) },
          severity: 'HIGH',
        })
        break
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    console.error('Auction action error:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
