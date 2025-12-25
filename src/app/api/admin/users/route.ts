import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - List/search users
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!admin || !['ADMIN', 'MODERATOR'].includes(admin.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || '' // active, suspended, unverified
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } },
      ]
    }

    if (role) {
      where.role = role
    }

    if (status === 'banned') {
      where.bannedAt = { not: null }
    } else if (status === 'suspended') {
      where.biddingEnabled = false
      where.bannedAt = null
    } else if (status === 'unverified') {
      where.emailVerified = null
    } else if (status === 'active') {
      where.emailVerified = { not: null }
      where.biddingEnabled = true
      where.bannedAt = null
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          emailVerified: true,
          biddingEnabled: true,
          bannedAt: true,
          banReason: true,
          unbannedAt: true,
          unbanReason: true,
          createdAt: true,
          _count: {
            select: {
              listings: true,
              bids: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    )
  }
}
