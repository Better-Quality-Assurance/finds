import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAuction } from '@/services/auction.service'
import { logAuditEvent, AUDIT_ACTIONS } from '@/services/audit.service'
import { notifyListingApproved, broadcastAuctionLive } from '@/services/notification.service'
import { AUCTION_RULES } from '@/domain/auction/rules'

// GET - List auctions for admin
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.listing = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              make: true,
              model: true,
              year: true,
              seller: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          _count: {
            select: { bids: true, watchlist: true },
          },
        },
      }),
      prisma.auction.count({ where }),
    ])

    // Get stats
    const stats = await prisma.auction.groupBy({
      by: ['status'],
      _count: true,
    })

    return NextResponse.json({
      auctions,
      stats: Object.fromEntries(stats.map(s => [s.status, s._count])),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get admin auctions error:', error)
    return NextResponse.json(
      { error: 'Failed to get auctions' },
      { status: 500 }
    )
  }
}

// POST - Create auction from approved listing (manual scheduling)
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!admin || !['ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { listingId, startTime, durationDays } = body

    // Validate required field
    if (!listingId) {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 })
    }

    // Validate and parse startTime (defaults to now)
    const auctionStartTime = startTime ? new Date(startTime) : new Date()
    if (isNaN(auctionStartTime.getTime())) {
      return NextResponse.json({ error: 'Invalid startTime format' }, { status: 400 })
    }

    // Validate duration (defaults to 7 days)
    const auctionDuration = durationDays || AUCTION_RULES.DEFAULT_DURATION_DAYS
    if (auctionDuration < AUCTION_RULES.MIN_DURATION_DAYS || auctionDuration > AUCTION_RULES.MAX_DURATION_DAYS) {
      return NextResponse.json(
        {
          error: `Duration must be between ${AUCTION_RULES.MIN_DURATION_DAYS} and ${AUCTION_RULES.MAX_DURATION_DAYS} days`
        },
        { status: 400 }
      )
    }

    // Verify listing exists and is approved
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Listing must be APPROVED before creating auction. Current status: ' + listing.status },
        { status: 400 }
      )
    }

    // Check for existing auction
    const existingAuction = await prisma.auction.findUnique({
      where: { listingId },
    })

    if (existingAuction) {
      return NextResponse.json(
        {
          error: 'Auction already exists for this listing',
          auctionId: existingAuction.id,
          auctionStatus: existingAuction.status,
        },
        { status: 409 }
      )
    }

    // Create auction
    const auction = await createAuction(listingId, auctionStartTime, auctionDuration)

    // Log auction creation
    await logAuditEvent({
      actorId: session.user.id,
      action: AUDIT_ACTIONS.AUCTION_CREATED,
      resourceType: 'AUCTION',
      resourceId: auction.id,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        listingId: listing.id,
        listingTitle: listing.title,
        sellerId: listing.sellerId,
        sellerEmail: listing.seller.email,
        startTime: auction.startTime,
        endTime: auction.currentEndTime,
        startingPrice: auction.startingPrice.toString(),
        reservePrice: auction.reservePrice?.toString(),
        status: auction.status,
        durationDays: auctionDuration,
        manuallyCreated: true,
      },
    })

    console.log(`Auction ${auction.id} manually created for listing ${listing.id} (${auction.status})`)

    // Send notifications if auction is active
    if (auction.status === 'ACTIVE') {
      // Notify seller
      await notifyListingApproved(
        listing.sellerId,
        listing.id,
        listing.title,
        auction.id,
        auction.currentEndTime
      ).catch(err => console.error('Failed to notify seller:', err))

      // Broadcast to public channel
      const primaryImage = await prisma.listingMedia.findFirst({
        where: { listingId: listing.id, isPrimary: true },
        select: { publicUrl: true },
      })

      await broadcastAuctionLive(
        auction.id,
        listing.title,
        Number(auction.startingPrice),
        auction.currency,
        auction.currentEndTime,
        primaryImage?.publicUrl
      ).catch(err => console.error('Failed to broadcast auction live:', err))
    }

    return NextResponse.json({
      auction,
      listing: {
        id: listing.id,
        title: listing.title,
        seller: listing.seller,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Create auction error:', error)

    if (error instanceof Error) {
      // Handle specific errors from createAuction service
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('must be approved')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes('Duration must be')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create auction' },
      { status: 500 }
    )
  }
}
