import { NextResponse } from 'next/server'
import { getStatsService } from '@/services/stats.service'

export async function GET() {
  try {
    const statsService = getStatsService()
    const stats = await statsService.getPublicStats()

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching public stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
