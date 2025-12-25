import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reviewFraudAlert, getUserFraudHistory } from '@/services/fraud.service'
import { z } from 'zod'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - Get fraud alert details
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params

    const alert = await prisma.fraudAlert.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            biddingEnabled: true,
          },
        },
      },
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Get user's fraud history if there's a user
    let userHistory = null
    if (alert.userId) {
      userHistory = await getUserFraudHistory(alert.userId)
    }

    // Get related bids if this is about an auction
    let relatedBids = null
    if (alert.auctionId) {
      relatedBids = await prisma.bid.findMany({
        where: { auctionId: alert.auctionId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          bidder: {
            select: { id: true, name: true, email: true },
          },
        },
      })
    }

    return NextResponse.json({
      alert,
      userHistory,
      relatedBids,
    })
  } catch (error) {
    console.error('Get fraud alert error:', error)
    return NextResponse.json(
      { error: 'Failed to get fraud alert' },
      { status: 500 }
    )
  }
}

const reviewSchema = z.object({
  status: z.enum(['INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']),
  notes: z.string().optional(),
})

// PUT - Review/update fraud alert
export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status, notes } = reviewSchema.parse(body)

    const alert = await reviewFraudAlert(id, session.user.id, status, notes)

    return NextResponse.json({ alert })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    console.error('Review fraud alert error:', error)
    return NextResponse.json(
      { error: 'Failed to review fraud alert' },
      { status: 500 }
    )
  }
}
