import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { requireAdminOrModerator } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { AlertSeverity } from '@prisma/client'

/**
 * GET /api/admin/fraud
 *
 * Get fraud alerts and statistics with optional filtering.
 * Admin/Moderator only.
 */
export const GET = withErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()

    // Require admin or moderator role
    await requireAdminOrModerator(session)

    const container = getContainer()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity') as AlertSeverity | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Fetch alerts and stats in parallel
    const [alertsResult, stats] = await Promise.all([
      container.fraud.getOpenAlerts({
        severity: severity || undefined,
        limit,
        offset: (page - 1) * limit,
      }),
      container.fraud.getFraudStats(),
    ])

    return successResponse({
      alerts: alertsResult.alerts,
      total: alertsResult.total,
      stats,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(alertsResult.total / limit),
      },
    })
  },
  {
    requiresAuth: true,
    resourceType: 'fraud_alert',
    action: 'admin.fraud.list',
    auditLog: false,
  }
)
