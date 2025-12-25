import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requestChanges } from '@/services/listing.service'
import { prisma } from '@/lib/db'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
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

    const { id } = await params
    const body = await request.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Changes requested reason must be at least 10 characters' },
        { status: 400 }
      )
    }

    const listing = await requestChanges(id, session.user.id, [reason])

    return NextResponse.json(listing)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('Cannot request')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('Request changes error:', error)
    return NextResponse.json(
      { error: 'Failed to request changes' },
      { status: 500 }
    )
  }
}
