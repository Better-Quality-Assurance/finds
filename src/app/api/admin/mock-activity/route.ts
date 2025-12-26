/**
 * Mock Activity API Endpoint
 *
 * Admin-only endpoint for triggering mock auction activity.
 * Used for demos and development to simulate real bidding/comment activity.
 *
 * POST /api/admin/mock-activity - Run mock activity
 * GET /api/admin/mock-activity - Get status
 * DELETE /api/admin/mock-activity - Stop running activity
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import {
  getMockActivityOrchestrator,
  runMockActivityOnce,
} from '@/services/mock-activity-orchestrator.service'
import {
  DEFAULT_MOCK_ACTIVITY_CONFIG,
  DEMO_MOCK_ACTIVITY_CONFIG,
} from '@/services/contracts/mock-activity.interface'

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const runMockActivitySchema = z.object({
  mode: z.enum(['once', 'continuous', 'demo']).default('once'),
  targetAuctionIds: z.array(z.string()).optional(),
  durationMinutes: z.number().int().min(1).max(60).optional(),
  enableBids: z.boolean().optional(),
  enableComments: z.boolean().optional(),
})

// =============================================================================
// HELPERS
// =============================================================================

async function checkAdminAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === 'ADMIN' || user?.role === 'MODERATOR'
}

// =============================================================================
// POST - Run mock activity
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    const isAdmin = await checkAdminAccess(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const validatedInput = runMockActivitySchema.parse(body)

    // Check if already running
    const orchestrator = getMockActivityOrchestrator()
    if (orchestrator.isRunning()) {
      return NextResponse.json(
        { error: 'Mock activity is already running' },
        { status: 409 }
      )
    }

    // Build config based on mode
    let config = { ...DEFAULT_MOCK_ACTIVITY_CONFIG }

    if (validatedInput.mode === 'demo') {
      config = { ...DEMO_MOCK_ACTIVITY_CONFIG }
    }

    if (validatedInput.targetAuctionIds) {
      config.targetAuctionIds = validatedInput.targetAuctionIds
    }

    if (validatedInput.durationMinutes) {
      config.runDurationMs = validatedInput.durationMinutes * 60 * 1000
    }

    if (validatedInput.enableBids !== undefined) {
      config.enableBids = validatedInput.enableBids
    }

    if (validatedInput.enableComments !== undefined) {
      config.enableComments = validatedInput.enableComments
    }

    // Run based on mode
    if (validatedInput.mode === 'continuous' || validatedInput.mode === 'demo') {
      // Run in background (non-blocking)
      orchestrator.runContinuous(config).then((summary) => {
        console.log('[MockActivity] Continuous run completed:', {
          bidsGenerated: summary.bidsGenerated,
          commentsGenerated: summary.commentsGenerated,
          durationMs: summary.durationMs,
        })
      })

      return NextResponse.json({
        success: true,
        message: 'Mock activity started in background',
        mode: validatedInput.mode,
        config: {
          enableBids: config.enableBids,
          enableComments: config.enableComments,
          durationMs: config.runDurationMs,
          targetAuctions: config.targetAuctionIds?.length ?? 'all',
        },
      })
    } else {
      // Run once (blocking)
      const summary = await runMockActivityOnce(config)

      return NextResponse.json({
        success: true,
        message: 'Mock activity completed',
        summary: {
          bidsGenerated: summary.bidsGenerated,
          commentsGenerated: summary.commentsGenerated,
          auctionsAffected: summary.auctionsAffected.length,
          durationMs: summary.durationMs,
          errors: summary.errors.length > 0 ? summary.errors : undefined,
        },
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[MockActivity] Error:', error)
    return NextResponse.json(
      { error: 'Failed to run mock activity' },
      { status: 500 }
    )
  }
}

// =============================================================================
// GET - Get status
// =============================================================================

export async function GET() {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    const isAdmin = await checkAdminAccess(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orchestrator = getMockActivityOrchestrator()
    const auctions = await orchestrator.getEligibleAuctions()

    return NextResponse.json({
      isRunning: orchestrator.isRunning(),
      eligibleAuctions: auctions.length,
      auctionIds: auctions.map((a) => ({
        id: a.id,
        title: a.listing.title,
        endsAt: a.currentEndTime,
      })),
    })
  } catch (error) {
    console.error('[MockActivity] Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE - Stop running activity
// =============================================================================

export async function DELETE() {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check
    const isAdmin = await checkAdminAccess(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orchestrator = getMockActivityOrchestrator()

    if (!orchestrator.isRunning()) {
      return NextResponse.json(
        { message: 'No mock activity is currently running' },
        { status: 200 }
      )
    }

    orchestrator.stop()

    return NextResponse.json({
      success: true,
      message: 'Mock activity stopped',
    })
  } catch (error) {
    console.error('[MockActivity] Stop error:', error)
    return NextResponse.json(
      { error: 'Failed to stop mock activity' },
      { status: 500 }
    )
  }
}
