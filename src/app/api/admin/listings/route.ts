import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPendingListings } from '@/services/listing.service'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin/moderator/reviewer role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING_REVIEW'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL') {
      where.status = status
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          media: {
            where: { type: 'PHOTO' },
            take: 4,
            orderBy: { position: 'asc' },
          },
          _count: {
            select: { media: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ])

    return NextResponse.json({
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get admin listings error:', error)
    return NextResponse.json(
      { error: 'Failed to get listings' },
      { status: 500 }
    )
  }
}
