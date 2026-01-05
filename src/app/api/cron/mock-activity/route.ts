/**
 * Mock Activity Cron Endpoint
 *
 * Scheduled endpoint for generating mock auction activity.
 * Call this endpoint periodically (e.g., every 1-5 minutes) to simulate
 * ongoing bidding and comment activity until auctions end.
 *
 * GET /api/cron/mock-activity
 *
 * Authentication: Requires CRON_SECRET token in Authorization header
 *
 * This can be triggered by:
 * - Vercel Cron (vercel.json)
 * - Railway Cron
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Manual curl calls for testing
 *
 * Example:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://finds.ro/api/cron/mock-activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runMockActivityOnce } from '@/services/mock-activity-orchestrator.service'
import type { MockActivityConfig } from '@/services/contracts/mock-activity.interface'

// =============================================================================
// CRON CONFIGURATION
// =============================================================================

/**
 * Configuration optimized for cron execution
 * More aggressive than default since cron runs periodically
 */
const CRON_MOCK_ACTIVITY_CONFIG: MockActivityConfig = {
  enableBids: true,
  enableComments: true,
  bids: {
    minIntervalMs: 1000, // 1 second (fast since single pass)
    maxIntervalMs: 3000, // 3 seconds
    bidProbability: 0.4, // 40% chance per auction
    maxBidsPerAuction: 100,
    allowAntiSnipe: true,
  },
  comments: {
    minIntervalMs: 1000,
    maxIntervalMs: 3000,
    commentProbability: 0.25, // 25% chance per listing
    maxCommentsPerAuction: 50,
    includeSellResponses: true,
  },
  runDurationMs: 0, // Single pass
  checkIntervalMs: 1000,
}

// =============================================================================
// HANDLER
// =============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Allow in development without secret, require in production
    const isDev = process.env.NODE_ENV === 'development'
    const cronSecret = process.env.CRON_SECRET

    if (!isDev && cronSecret && token !== cronSecret) {
      console.warn('[MockActivity Cron] Unauthorized attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there are any active auctions
    let activeAuctionCount = await prisma.auction.count({
      where: {
        status: { in: ['ACTIVE', 'EXTENDED'] },
        currentEndTime: { gt: new Date() },
      },
    })

    // Auto-extend expired mock auctions (those with ACTIVE status but past end time)
    if (activeAuctionCount === 0) {
      const expiredMockAuctions = await prisma.auction.count({
        where: {
          status: 'ACTIVE',
          currentEndTime: { lte: new Date() },
        },
      })

      if (expiredMockAuctions > 0) {
        // Extend all expired ACTIVE auctions by 7 days
        const extendBy = 7 * 24 * 60 * 60 * 1000 // 7 days in ms
        await prisma.auction.updateMany({
          where: {
            status: 'ACTIVE',
            currentEndTime: { lte: new Date() },
          },
          data: {
            currentEndTime: new Date(Date.now() + extendBy),
            originalEndTime: new Date(Date.now() + extendBy),
          },
        })

        console.log(`[MockActivity Cron] Auto-extended ${expiredMockAuctions} expired mock auctions`)
        activeAuctionCount = expiredMockAuctions
      }
    }

    if (activeAuctionCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active auctions - skipping mock activity',
        activeAuctions: 0,
        executionTimeMs: Date.now() - startTime,
      })
    }

    // Run mock activity
    const summary = await runMockActivityOnce(CRON_MOCK_ACTIVITY_CONFIG)

    // Log results
    console.log('[MockActivity Cron] Completed:', {
      bidsGenerated: summary.bidsGenerated,
      commentsGenerated: summary.commentsGenerated,
      auctionsAffected: summary.auctionsAffected.length,
      executionTimeMs: Date.now() - startTime,
    })

    return NextResponse.json({
      success: true,
      message: 'Mock activity generated',
      activeAuctions: activeAuctionCount,
      bidsGenerated: summary.bidsGenerated,
      commentsGenerated: summary.commentsGenerated,
      auctionsAffected: summary.auctionsAffected.length,
      executionTimeMs: Date.now() - startTime,
      errors: summary.errors.length > 0 ? summary.errors.slice(0, 5) : undefined,
    })
  } catch (error) {
    console.error('[MockActivity Cron] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}
