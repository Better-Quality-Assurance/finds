import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

export const GET = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError(
        'You must be logged in',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    // Check if user has admin/moderator/reviewer role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      throw new ForbiddenError(
        'You do not have permission to access this resource',
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS
      )
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
            select: {
              id: true,
              publicUrl: true,
              originalUrl: true,
              type: true,
              category: true,
              licensePlateDetected: true,
              licensePlateBlurred: true,
            },
          },
          _count: {
            select: { media: true },
          },
        },
      }),
      prisma.listing.count({ where }),
    ])

    return successResponse({
      listings,
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
    resourceType: 'listing',
    action: 'admin.listing.list',
    auditLog: true,
  }
)
