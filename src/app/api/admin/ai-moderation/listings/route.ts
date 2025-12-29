import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  analyzeListing,
  getPendingListingAnalyses,
} from '@/services/ai-moderation.service'

// GET - Get pending listing analyses
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

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const decision = searchParams.get('decision')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status) {where.status = status}
    if (decision) {where.decision = decision}

    const [analyses, total] = await Promise.all([
      prisma.aIListingAnalysis.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              make: true,
              model: true,
              year: true,
              status: true,
              seller: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
      prisma.aIListingAnalysis.count({ where }),
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
    console.error('Get listing analyses error:', error)
    return NextResponse.json(
      { error: 'Failed to get listing analyses' },
      { status: 500 }
    )
  }
}

// POST - Trigger analysis for a listing
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

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { listingId } = body

    if (!listingId) {
      return NextResponse.json(
        { error: 'listingId is required' },
        { status: 400 }
      )
    }

    const analysis = await analyzeListing(listingId)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Analyze listing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze listing' },
      { status: 500 }
    )
  }
}
