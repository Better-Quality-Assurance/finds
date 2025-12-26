import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getModerationStats,
  getRecentModerationActivity,
} from '@/services/ai-moderation.service'

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
    const activityLimit = parseInt(searchParams.get('activityLimit') || '20')

    const [stats, recentActivity] = await Promise.all([
      getModerationStats(),
      getRecentModerationActivity(activityLimit),
    ])

    return NextResponse.json({
      stats,
      recentActivity,
    })
  } catch (error) {
    console.error('Get AI moderation stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI moderation stats' },
      { status: 500 }
    )
  }
}
