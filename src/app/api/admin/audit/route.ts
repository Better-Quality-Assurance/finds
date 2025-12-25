import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getAuditLogs, getAuditStats } from '@/services/audit.service'
import { AuditSeverity, AuditStatus } from '@prisma/client'

// GET - Get audit logs with filtering
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

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const actorId = searchParams.get('actorId') || undefined
    const resourceType = searchParams.get('resourceType') || undefined
    const resourceId = searchParams.get('resourceId') || undefined
    const action = searchParams.get('action') || undefined
    const severity = (searchParams.get('severity') as AuditSeverity) || undefined
    const status = (searchParams.get('status') as AuditStatus) || undefined
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const [logsResult, stats] = await Promise.all([
      getAuditLogs({
        actorId,
        resourceType,
        resourceId,
        action,
        severity,
        status,
        startDate,
        endDate,
        page,
        limit,
      }),
      getAuditStats(),
    ])

    return NextResponse.json({
      logs: logsResult.logs,
      total: logsResult.total,
      stats,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(logsResult.total / limit),
      },
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Failed to get audit logs' },
      { status: 500 }
    )
  }
}
