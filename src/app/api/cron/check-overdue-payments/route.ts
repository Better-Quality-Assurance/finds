import { NextResponse } from 'next/server'
import { checkOverduePayments } from '@/services/payment.service'
import { headers } from 'next/headers'

/**
 * Cron job to check for overdue payments
 * Should be called daily by a cron service (Vercel Cron, etc.)
 *
 * Authorization: Use cron secret or Vercel cron header
 */
export async function GET(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Check Vercel cron header (for Vercel deployments)
    const vercelCronHeader = headersList.get('x-vercel-cron')

    if (vercelCronHeader !== '1' && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting overdue payment check...')

    // Check for overdue payments
    const overdueAuctionIds = await checkOverduePayments()

    console.log(`[CRON] Found ${overdueAuctionIds.length} overdue payments`)

    if (overdueAuctionIds.length > 0) {
      console.log('[CRON] Overdue auction IDs:', overdueAuctionIds)
    }

    // TODO: Send notifications to winners and sellers about overdue payments
    // TODO: Create fraud alerts for repeated payment failures
    // TODO: Automatically capture deposits for defaulted payments

    return NextResponse.json({
      success: true,
      overdueCount: overdueAuctionIds.length,
      overdueAuctionIds,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Overdue payment check failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to check overdue payments',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
