import { NextResponse } from 'next/server'
import { getAuctionById, getBidHistory } from '@/services/auction.service'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const auction = await getAuctionById(id)

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Get bid history
    const bids = await getBidHistory(id, 20)

    return NextResponse.json({
      auction,
      bids,
    })
  } catch (error) {
    console.error('Get auction error:', error)
    return NextResponse.json(
      { error: 'Failed to get auction' },
      { status: 500 }
    )
  }
}
