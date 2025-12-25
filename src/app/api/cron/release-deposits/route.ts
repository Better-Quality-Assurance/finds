// Cron job to release old bid deposits
import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'
import { AUDIT_ACTIONS } from '@/services/audit.service'
import { releaseDeposit, DEPOSIT_CONFIG } from '@/lib/stripe'
import { DepositStatus } from '@prisma/client'

/**
 * Cron job that releases deposits older than 30 days that are still HELD
 * Runs every hour
 *
 * Security: Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const container = getContainer()

    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== process.env.CRON_SECRET) {
      console.error('[CRON] Unauthorized release-deposits attempt')
      await container.audit.logAuditEvent({
        action: 'CRON_UNAUTHORIZED',
        resourceType: 'CRON',
        details: { job: 'release-deposits', ip: request.ip || 'unknown' },
        severity: 'HIGH',
        status: 'BLOCKED',
      })

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting release-deposits job')

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - DEPOSIT_CONFIG.HOLD_DURATION_DAYS)

    // Find old held deposits
    const oldDeposits = await container.prisma.bidDeposit.findMany({
      where: {
        status: DepositStatus.HELD,
        heldAt: {
          lte: cutoffDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      take: 100, // Process in batches to avoid timeout
    })

    console.log(`[CRON] Found ${oldDeposits.length} deposits to release`)

    const results = []

    // Release each deposit via Stripe
    for (const deposit of oldDeposits) {
      try {
        // Cancel the Stripe payment intent
        await releaseDeposit(deposit.stripePaymentIntentId)

        // Update deposit status in database
        await container.prisma.bidDeposit.update({
          where: { id: deposit.id },
          data: {
            status: DepositStatus.RELEASED,
            releasedAt: new Date(),
          },
        })

        console.log(`[CRON] Released deposit ${deposit.id} for user ${deposit.userId}`)

        results.push({
          depositId: deposit.id,
          userId: deposit.userId,
          userEmail: deposit.user.email,
          amount: Number(deposit.amount),
          heldAt: deposit.heldAt,
          success: true,
        })

        // Log individual deposit release
        await container.audit.logAuditEvent({
          action: AUDIT_ACTIONS.DEPOSIT_RELEASED,
          resourceType: 'BID_DEPOSIT',
          resourceId: deposit.id,
          actorEmail: 'system@cron',
          details: {
            userId: deposit.userId,
            userEmail: deposit.user.email,
            amount: Number(deposit.amount),
            currency: deposit.currency,
            heldAt: deposit.heldAt,
            daysHeld: deposit.heldAt
              ? Math.floor((Date.now() - deposit.heldAt.getTime()) / (1000 * 60 * 60 * 24))
              : null,
            stripePaymentIntentId: deposit.stripePaymentIntentId,
            reason: 'automatic_release_after_30_days',
          },
          severity: 'LOW',
          status: 'SUCCESS',
        })

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[CRON] Failed to release deposit ${deposit.id}:`, error)

        results.push({
          depositId: deposit.id,
          userId: deposit.userId,
          userEmail: deposit.user.email,
          amount: Number(deposit.amount),
          heldAt: deposit.heldAt,
          success: false,
          error: errorMessage,
        })

        // Log failure for individual deposit
        await container.audit.logAuditEvent({
          action: AUDIT_ACTIONS.DEPOSIT_RELEASED,
          resourceType: 'BID_DEPOSIT',
          resourceId: deposit.id,
          actorEmail: 'system@cron',
          details: {
            userId: deposit.userId,
            userEmail: deposit.user.email,
            amount: Number(deposit.amount),
            stripePaymentIntentId: deposit.stripePaymentIntentId,
          },
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
    const totalAmountReleased = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.amount, 0)

    // Log overall job execution
    await container.audit.logAuditEvent({
      action: 'CRON_JOB_EXECUTED',
      resourceType: 'CRON',
      details: {
        job: 'release-deposits',
        totalDeposits: oldDeposits.length,
        successCount,
        failureCount,
        totalAmountReleased,
        currency: 'EUR',
        cutoffDate,
        results,
        executionTimeMs: executionTime,
      },
      severity: failureCount > 0 ? 'HIGH' : 'LOW',
      status: failureCount === 0 ? 'SUCCESS' : 'FAILURE',
      functionName: 'release-deposits-cron',
    })

    console.log(
      `[CRON] Released ${successCount}/${oldDeposits.length} deposits ` +
      `(€${totalAmountReleased.toFixed(2)}) in ${executionTime}ms`
    )

    return NextResponse.json({
      success: true,
      totalDeposits: oldDeposits.length,
      successCount,
      failureCount,
      totalAmountReleased,
      currency: 'EUR',
      results,
      executionTimeMs: executionTime,
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('[CRON] Error in release-deposits job:', error)

    // Log failure
    const container = getContainer()
    await container.audit.logAuditEvent({
      action: 'CRON_JOB_EXECUTED',
      resourceType: 'CRON',
      details: {
        job: 'release-deposits',
        executionTimeMs: executionTime,
      },
      severity: 'CRITICAL',
      status: 'FAILURE',
      errorMessage,
      functionName: 'release-deposits-cron',
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
