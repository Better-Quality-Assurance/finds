import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getCarReview,
  publishCarReview,
  unpublishCarReview,
  generateCarReview,
} from '@/services/ai-moderation.service'

// GET - Get car review for a listing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: listingId } = await params
    const review = await getCarReview(listingId)

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Get car review error:', error)
    return NextResponse.json(
      { error: 'Failed to get car review' },
      { status: 500 }
    )
  }
}

// POST - Generate or regenerate review
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: listingId } = await params
    const review = await generateCarReview(listingId)

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Generate car review error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate review' },
      { status: 500 }
    )
  }
}

// PATCH - Publish or unpublish review
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: listingId } = await params
    const body = await request.json()
    const { published } = body

    if (typeof published !== 'boolean') {
      return NextResponse.json(
        { error: 'published must be a boolean' },
        { status: 400 }
      )
    }

    const review = published
      ? await publishCarReview(listingId)
      : await unpublishCarReview(listingId)

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Update car review error:', error)
    return NextResponse.json(
      { error: 'Failed to update car review' },
      { status: 500 }
    )
  }
}
