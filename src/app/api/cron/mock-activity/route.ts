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
import { runMockActivityOnce } from '@/services/mock-activity-orchestrator.service'
import type { MockActivityConfig } from '@/services/contracts/mock-activity.interface'
import {
  autoExtendExpiredMockAuctions,
  getActiveMockAuctionCount,
} from '@/services/mock-auction.service'

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

    // Check if there are any active mock auctions
    let activeAuctionCount = await getActiveMockAuctionCount()

    // Auto-extend expired mock auctions (isMock=true, status=ACTIVE, past end time)
    if (activeAuctionCount === 0) {
      const extendResult = await autoExtendExpiredMockAuctions()

      if (extendResult.extendedCount > 0) {
        console.log(
          `[MockActivity Cron] Auto-extended ${extendResult.extendedCount} expired mock auctions`
        )
        activeAuctionCount = extendResult.extendedCount
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
