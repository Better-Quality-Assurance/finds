// Cron job to activate scheduled auctions
import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'
import { AUDIT_ACTIONS } from '@/services/audit.service'
import { broadcastAuctionStarting } from '@/services/notification.service'

/**
 * Cron job that activates SCHEDULED auctions whose startTime has passed
 * Runs every minute
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const container = getContainer()

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('[CRON] Unauthorized activate-auctions attempt')
      await container.audit.logAuditEvent({
        action: 'CRON_UNAUTHORIZED',
        resourceType: 'CRON',
        details: { job: 'activate-auctions', ip: request.ip || 'unknown' },
        severity: 'HIGH',
        status: 'BLOCKED',
      })

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting activate-auctions job')

    // Find scheduled auctions that should be activated
    const now = new Date()
    const scheduledAuctions = await container.prisma.auction.findMany({
      where: {
        status: 'SCHEDULED',
        startTime: { lte: now },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            sellerId: true,
          },
        },
      },
    })

    console.log(`[CRON] Found ${scheduledAuctions.length} auctions to activate`)

    // Activate auctions (bulk update)
    const activatedCount = await container.auctions.activateScheduledAuctions()

    // Broadcast events for each activated auction
    const broadcastResults = []
    for (const auction of scheduledAuctions) {
      try {
        await broadcastAuctionStarting({
          auctionId: auction.id,
          listingId: auction.listingId,
          listingTitle: auction.listing.title,
          startingPrice: Number(auction.startingPrice),
          currentEndTime: auction.currentEndTime.toISOString(),
        })

        console.log(`[CRON] Broadcast AUCTION_STARTING for auction ${auction.id}`)
        broadcastResults.push({ auctionId: auction.id, success: true })
      } catch (error) {
        console.error(`[CRON] Failed to broadcast for auction ${auction.id}:`, error)
        broadcastResults.push({
          auctionId: auction.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const executionTime = Date.now() - startTime

    // Log audit event
    await container.audit.logAuditEvent({
      action: AUDIT_ACTIONS.AUCTION_STARTED,
      resourceType: 'CRON',
      details: {
        job: 'activate-auctions',
        activatedCount,
        auctionIds: scheduledAuctions.map(a => a.id),
        broadcastResults,
        executionTimeMs: executionTime,
      },
      severity: activatedCount > 0 ? 'MEDIUM' : 'LOW',
      status: 'SUCCESS',
      functionName: 'activate-auctions-cron',
    })

    console.log(`[CRON] Activated ${activatedCount} auctions in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      activatedCount,
      auctions: scheduledAuctions.map(a => ({
        id: a.id,
        listingTitle: a.listing.title,
        startTime: a.startTime,
      })),
      executionTimeMs: executionTime,
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('[CRON] Error in activate-auctions job:', error)

    // Log failure
    const container = getContainer()
    await container.audit.logAuditEvent({
      action: AUDIT_ACTIONS.AUCTION_STARTED,
      resourceType: 'CRON',
      details: {
        job: 'activate-auctions',
        executionTimeMs: executionTime,
      },
      severity: 'HIGH',
      status: 'FAILURE',
      errorMessage,
      functionName: 'activate-auctions-cron',
    }).catch(auditError => {
      console.error('[CRON] Failed to log audit event:', auditError)
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        executionTimeMs: executionTime,
      },
      { status: 500 }
    )
  }
}
