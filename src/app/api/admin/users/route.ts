import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { roleValidator } from '@/services/validators'

// GET - List/search users
export const GET = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError(
        'You must be logged in',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !roleValidator.canManageUsers(user.role)) {
      throw new ForbiddenError(
        'You do not have permission to access this resource',
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
      )
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

    return successResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  },
  {
    requiresAuth: true,
    resourceType: 'user',
    action: 'admin.user.list',
    auditLog: true,
  }
)
