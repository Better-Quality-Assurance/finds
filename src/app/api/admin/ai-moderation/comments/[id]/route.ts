import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getCommentModeration,
  overrideCommentModeration,
} from '@/services/ai-moderation.service'
import type { ModerationDecision } from '@prisma/client'

// GET - Get moderation for a specific comment
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

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: commentId } = await params
    const moderation = await getCommentModeration(commentId)

    if (!moderation) {
      return NextResponse.json(
        { error: 'Moderation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ moderation })
  } catch (error) {
    console.error('Get comment moderation error:', error)
    return NextResponse.json(
      { error: 'Failed to get comment moderation' },
      { status: 500 }
    )
  }
}

// PATCH - Override moderation decision
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

    const { id: commentId } = await params
    const body = await request.json()
    const { decision } = body

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json(
        { error: 'Valid decision (APPROVE or REJECT) is required' },
        { status: 400 }
      )
    }

    const moderation = await overrideCommentModeration(
      commentId,
      decision as ModerationDecision,
      session.user.id
    )

    return NextResponse.json({ moderation })
  } catch (error) {
    console.error('Override comment moderation error:', error)
    return NextResponse.json(
      { error: 'Failed to override moderation' },
      { status: 500 }
    )
  }
}
