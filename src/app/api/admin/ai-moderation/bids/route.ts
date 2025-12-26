import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  analyzeAuctionBids,
  getSuspiciousBidPatterns,
} from '@/services/ai-moderation.service'

// GET - Get suspicious bid patterns
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const auctionId = searchParams.get('auctionId')
    const suspicious = searchParams.get('suspicious') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (auctionId) where.auctionId = auctionId
    if (suspicious) where.isSuspicious = true

    const [analyses, total] = await Promise.all([
      prisma.aIBidPatternAnalysis.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aIBidPatternAnalysis.count({ where }),
    ])

    return NextResponse.json({
      analyses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get bid pattern analyses error:', error)
    return NextResponse.json(
      { error: 'Failed to get bid pattern analyses' },
      { status: 500 }
    )
  }
}

// POST - Trigger bid pattern analysis for an auction
export async function POST(request: Request) {
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

    const body = await request.json()
    const { auctionId, windowMinutes = 60 } = body

    if (!auctionId) {
      return NextResponse.json(
        { error: 'auctionId is required' },
        { status: 400 }
      )
    }

    const analysis = await analyzeAuctionBids(auctionId, windowMinutes)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Analyze bid patterns error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze bid patterns' },
      { status: 500 }
    )
  }
}
