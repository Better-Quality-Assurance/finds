import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStatsService } from '@/services/stats.service'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const statsService = getStatsService()
    const stats = await statsService.getUserStats(session.user.id)

    return NextResponse.json({
      ...stats,
      memberSince: stats.memberSince.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}
