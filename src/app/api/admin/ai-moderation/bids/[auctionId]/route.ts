import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  analyzeAuctionBids,
  getRecentBidAnalyses,
} from '@/services/ai-moderation.service'

// GET - Get bid pattern analyses for an auction
export async function GET(
  request: Request,
  { params }: { params: Promise<{ auctionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { auctionId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const analyses = await getRecentBidAnalyses(auctionId, limit)

    return NextResponse.json({ analyses })
  } catch (error) {
    console.error('Get auction bid analyses error:', error)
    return NextResponse.json(
      { error: 'Failed to get bid analyses' },
      { status: 500 }
    )
  }
}

// POST - Trigger new analysis for auction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ auctionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { auctionId } = await params
    const body = await request.json().catch(() => ({}))
    const { windowMinutes = 60 } = body

    const analysis = await analyzeAuctionBids(auctionId, windowMinutes)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Trigger bid analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze bids' },
      { status: 500 }
    )
  }
}
