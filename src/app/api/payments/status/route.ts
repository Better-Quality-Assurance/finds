import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { z } from 'zod'

const statusSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
})

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = statusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { auctionId } = validation.data
    const userId = session.user.id

    const container = getContainer()

    // Verify user is authorized to view this payment status
    const auction = await container.prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        winnerId: true,
        listing: {
          select: { sellerId: true },
        },
      },
    })

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Only winner, seller, or admin can view payment status
    const user = await container.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    const isAuthorized =
      auction.winnerId === userId ||
      auction.listing.sellerId === userId ||
      user?.role === 'ADMIN'

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to view this payment status' },
        { status: 403 }
      )
    }

    // Get payment status
    const paymentStatus = await container.fees.getAuctionPaymentStatus(auctionId)

    return NextResponse.json({
      success: true,
      ...paymentStatus,
    })
  } catch (error) {
    console.error('Payment status API error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
