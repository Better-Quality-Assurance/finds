// Cron job to end expired auctions
import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'
import { endAuction } from '@/services/auction.service'
import {
  broadcastAuctionEnded,
  notifyWinner,
  notifyWatchlistUsers,
} from '@/lib/pusher-cron'
import { prisma } from '@/lib/db'
import { captureCronError, captureAuctionError } from '@/lib/sentry'

/**
 * Cron job that ends ACTIVE auctions whose currentEndTime has passed
 * Runs every minute
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Get service container
    const container = getContainer()

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('[CRON] Unauthorized end-auctions attempt')
      await container.audit.logAuditEvent({
        action: 'CRON_UNAUTHORIZED',
        resourceType: 'CRON',
        details: { job: 'end-auctions', ip: request.ip || 'unknown' },
        severity: 'HIGH',
        status: 'BLOCKED',
      })

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting end-auctions job')

    const now = new Date()

    // Find auctions ending soon (within 1 hour) for notifications
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const endingSoonAuctions = await prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        currentEndTime: {
          gt: now,
          lte: oneHourFromNow,
        },
      },
      select: {
        id: true,
        currentEndTime: true,
      },
    })

    // Notify watchers about auctions ending soon (non-blocking)
    if (endingSoonAuctions.length > 0) {
      import('@/services/notification.service')
        .then(({ notifyWatchersAuctionEndingSoon }) => {
          const promises = endingSoonAuctions.map(auction => {
            const minutesRemaining = Math.floor(
              (auction.currentEndTime.getTime() - now.getTime()) / (1000 * 60)
            )
            return notifyWatchersAuctionEndingSoon(auction.id, minutesRemaining)
          })
          return Promise.allSettled(promises)
        })
        .then(() => {
          console.log(`[CRON] Notified watchers for ${endingSoonAuctions.length} auctions ending soon`)
        })
        .catch(error => {
          console.error('[CRON] Failed to notify watchers about ending soon auctions:', error)
        })
    }

    // Find expired active auctions
    const expiredAuctions = await prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        currentEndTime: { lte: now },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            sellerId: true,
          },
        },
        bids: {
          where: { isWinning: true },
          take: 1,
          include: {
            bidder: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        watchlist: {
          select: {
            userId: true,
            notifyOnEnd: true,
          },
        },
      },
    })

    console.log(`[CRON] Found ${expiredAuctions.length} auctions to end`)

    const results = []

    // End each auction and broadcast events
    for (const auction of expiredAuctions) {
      try {
        // End the auction (determines SOLD/NO_SALE)
        const endedAuction = await endAuction(auction.id)

        const winningBid = auction.bids[0]
        const winnerId = endedAuction.winnerId
        const finalPrice = endedAuction.finalPrice ? Number(endedAuction.finalPrice) : null

        // Broadcast auction ended event to public channel
        await broadcastAuctionEnded({
          auctionId: auction.id,
          status: endedAuction.status as 'SOLD' | 'NO_SALE' | 'CANCELLED',
          finalPrice,
          winnerId: winnerId || null,
        })

        console.log(`[CRON] Broadcast AUCTION_ENDED for auction ${auction.id} - ${endedAuction.status}`)

        // Notify winner via private channel if sold
        if (winnerId && finalPrice && winningBid) {
          await notifyWinner(winnerId, {
            auctionId: auction.id,
            listingTitle: auction.listing.title,
            finalPrice,
            buyerFee: endedAuction.buyerFeeAmount ? Number(endedAuction.buyerFeeAmount) : 0,
          })

          console.log(`[CRON] Notified winner ${winnerId} for auction ${auction.id}`)
        }

        // Notify watchlist users
        const watchlistUserIds = auction.watchlist
          .filter(w => w.notifyOnEnd && w.userId !== winnerId)
          .map(w => w.userId)

        if (watchlistUserIds.length > 0) {
          await notifyWatchlistUsers(watchlistUserIds, {
            auctionId: auction.id,
            listingTitle: auction.listing.title,
            status: endedAuction.status as 'SOLD' | 'NO_SALE' | 'CANCELLED',
            finalPrice,
          })

          console.log(`[CRON] Notified ${watchlistUserIds.length} watchlist users for auction ${auction.id}`)
        }

        results.push({
          auctionId: auction.id,
          listingTitle: auction.listing.title,
          status: endedAuction.status,
          finalPrice,
          winnerId,
          success: true,
        })

        // Log individual auction end
        await container.audit.logAuditEvent({
          action: 'AUCTION_ENDED',
          resourceType: 'AUCTION',
          resourceId: auction.id,
          details: {
            status: endedAuction.status,
            finalPrice,
            winnerId,
            bidCount: auction.bidCount,
            listingTitle: auction.listing.title,
          },
          severity: 'MEDIUM',
          status: 'SUCCESS',
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[CRON] Failed to end auction ${auction.id}:`, error)

        // Capture auction ending error in Sentry
        captureAuctionError(error as Error, {
          auctionId: auction.id,
          listingId: auction.listing.id,
          sellerId: auction.listing.sellerId,
          currentBid: auction.currentBid ? Number(auction.currentBid) : undefined,
          bidCount: auction.bidCount,
          status: auction.status,
          endTime: auction.currentEndTime,
          operation: 'end',
          metadata: {
            cronJob: 'end-auctions',
            listingTitle: auction.listing.title,
          },
        })

        results.push({
          auctionId: auction.id,
          listingTitle: auction.listing.title,
          success: false,
          error: errorMessage,
        })

        // Log failure for individual auction
        await container.audit.logAuditEvent({
          action: 'AUCTION_ENDED',
          resourceType: 'AUCTION',
          resourceId: auction.id,
          details: { listingTitle: auction.listing.title },
          severity: 'HIGH',
          status: 'FAILURE',
          errorMessage,
        }).catch(auditError => {
          console.error('[CRON] Failed to log audit event:', auditError)
        })
      }
    }

    const executionTime = Date.now() - startTime
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    // Log overall job execution
    await container.audit.logAuditEvent({
      action: 'CRON_JOB_EXECUTED',
      resourceType: 'CRON',
      details: {
        job: 'end-auctions',
        totalAuctions: expiredAuctions.length,
        successCount,
        failureCount,
        results,
        executionTimeMs: executionTime,
      },
      severity: failureCount > 0 ? 'HIGH' : 'MEDIUM',
      status: failureCount === 0 ? 'SUCCESS' : 'FAILURE',
      functionName: 'end-auctions-cron',
    })

    console.log(`[CRON] Ended ${successCount}/${expiredAuctions.length} auctions in ${executionTime}ms`)

    return NextResponse.json({
      success: true,
      totalAuctions: expiredAuctions.length,
      successCount,
      failureCount,
      results,
      executionTimeMs: executionTime,
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('[CRON] Error in end-auctions job:', error)

    // Capture cron job error in Sentry
    captureCronError(error as Error, {
      jobName: 'end-auctions',
      startTime: new Date(startTime),
      metadata: {
        executionTimeMs: executionTime,
        severity: 'CRITICAL',
      },
    })

    // Get container for error logging (in case container wasn't created before error)
    const container = getContainer()

    // Log failure
    await container.audit.logAuditEvent({
      action: 'CRON_JOB_EXECUTED',
      resourceType: 'CRON',
      details: {
        job: 'end-auctions',
        executionTimeMs: executionTime,
      },
      severity: 'CRITICAL',
      status: 'FAILURE',
      errorMessage,
      functionName: 'end-auctions-cron',
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
