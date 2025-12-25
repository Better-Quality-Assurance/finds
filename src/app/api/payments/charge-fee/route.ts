import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse, actionRequiredResponse } from '@/lib/api-response'
import { UnauthorizedError, ValidationError, PaymentError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

const chargeFeeSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
})

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    // Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    // Parse and validate request body
    const body = await request.json()
    const { auctionId } = chargeFeeSchema.parse(body)
    const userId = session.user.id

    // Get service container
    const container = getContainer()

    // Log payment attempt in audit log
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: session.user.email!,
        action: 'payment.buyer_fee.initiated',
        resourceType: 'auction',
        resourceId: auctionId,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: {
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Charge the buyer fee
    const result = await container.fees.chargeBuyerFee(auctionId, userId)

    if (!result.success) {
      // Log failed payment attempt
      await prisma.auditLog.create({
        data: {
          actorId: userId,
          actorEmail: session.user.email!,
          action: 'payment.buyer_fee.failed',
          resourceType: 'auction',
          resourceId: auctionId,
          severity: 'HIGH',
          status: 'FAILURE',
          errorMessage: result.error,
          details: {
            error: result.error,
            timestamp: new Date().toISOString(),
          },
        },
      })

      if (result.requiresAction) {
        // Return action required response for 3DS authentication
        return actionRequiredResponse(
          result.error || 'Additional authentication required',
          {
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntent?.id,
          }
        )
      }

      throw new PaymentError(
        result.error || 'Payment processing failed',
        ERROR_CODES.PAYMENT_FAILED
      )
    }

    // Log successful payment
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorEmail: session.user.email!,
        action: 'payment.buyer_fee.succeeded',
        resourceType: 'auction',
        resourceId: auctionId,
        severity: 'HIGH',
        status: 'SUCCESS',
        details: {
          paymentIntentId: result.paymentIntent?.id,
          amount: result.paymentIntent?.amount,
          currency: result.paymentIntent?.currency,
          timestamp: new Date().toISOString(),
        },
      },
    })

    return successResponse({
      paymentIntentId: result.paymentIntent?.id,
      message: 'Payment processed successfully',
    })
  },
  {
    requiresAuth: true,
    auditLog: true,
    resourceType: 'auction',
    action: 'payment.buyer_fee.charge',
  }
)
