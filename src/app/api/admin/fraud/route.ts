import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOpenAlerts, getFraudStats } from '@/services/fraud.service'
import { AlertSeverity } from '@prisma/client'

// GET - Get fraud alerts and stats
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity') as AlertSeverity | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const [alertsResult, stats] = await Promise.all([
      getOpenAlerts({
        severity: severity || undefined,
        limit,
        offset: (page - 1) * limit,
      }),
      getFraudStats(),
    ])

    return NextResponse.json({
      alerts: alertsResult.alerts,
      total: alertsResult.total,
      stats,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(alertsResult.total / limit),
      },
    })
  } catch (error) {
    console.error('Get fraud alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to get fraud alerts' },
      { status: 500 }
    )
  }
}
