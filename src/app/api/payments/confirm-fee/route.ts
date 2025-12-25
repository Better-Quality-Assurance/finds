import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { z } from 'zod'

const confirmFeeSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
})

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = confirmFeeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { paymentIntentId } = validation.data
    const userId = session.user.id

    const container = getContainer()

    // Confirm the payment
    const result = await container.fees.confirmBuyerFeePayment(paymentIntentId)

    if (!result.success) {
      // Log failed confirmation
      await container.audit.logAuditEvent({
        actorId: userId,
        actorEmail: session.user.email!,
        action: 'payment.buyer_fee.confirmation_failed',
        resourceType: 'payment_intent',
        resourceId: paymentIntentId,
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage: result.error,
        details: {
          error: result.error,
          timestamp: new Date().toISOString(),
        },
      })

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Get auction details for logging
    const auctionId = result.paymentIntent?.metadata?.auctionId

    // Log successful confirmation
    await container.audit.logAuditEvent({
      actorId: userId,
      actorEmail: session.user.email!,
      action: 'payment.buyer_fee.confirmed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        paymentIntentId,
        amount: result.paymentIntent?.amount,
        currency: result.paymentIntent?.currency,
        timestamp: new Date().toISOString(),
      },
    })

    // TODO: Trigger seller payout process or queue it
    // This could be done via a background job or webhook handler

    return NextResponse.json({
      success: true,
      paymentIntentId,
      auctionId,
      message: 'Payment confirmed successfully',
    })
  } catch (error) {
    console.error('Confirm fee API error:', error)

    // Log system error
    try {
      const session = await auth()
      if (session?.user?.id) {
        const container = getContainer()
        await container.audit.logAuditEvent({
          actorId: session.user.id,
          actorEmail: session.user.email!,
          action: 'payment.buyer_fee.confirmation_error',
          resourceType: 'payment_intent',
          severity: 'CRITICAL',
          status: 'FAILURE',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          details: {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
