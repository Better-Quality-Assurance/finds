import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  moderateComment,
  getPendingCommentModerations,
} from '@/services/ai-moderation.service'

// GET - Get comment moderation queue
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
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [moderations, total] = await Promise.all([
      prisma.aICommentModeration.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          comment: {
            include: {
              author: { select: { id: true, name: true, email: true } },
              listing: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.aICommentModeration.count({ where }),
    ])

    return NextResponse.json({
      moderations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get comment moderations error:', error)
    return NextResponse.json(
      { error: 'Failed to get comment moderations' },
      { status: 500 }
    )
  }
}

// POST - Trigger moderation for a comment
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
    const { commentId } = body

    if (!commentId) {
      return NextResponse.json(
        { error: 'commentId is required' },
        { status: 400 }
      )
    }

    const moderation = await moderateComment(commentId)

    return NextResponse.json({ moderation })
  } catch (error) {
    console.error('Moderate comment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to moderate comment' },
      { status: 500 }
    )
  }
}
