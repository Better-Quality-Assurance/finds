import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { getContainer } from '@/lib/container'
import { calculateDepositAmount } from '@/lib/stripe'
import { capturePaymentError, captureAPIError } from '@/lib/sentry'

const createDepositSchema = z.object({
  auctionId: z.string().min(1),
  bidAmount: z.number().positive(),
})

const confirmDepositSchema = z.object({
  depositId: z.string().min(1),
})

// GET - Get user's deposits
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const container = getContainer()
    const deposits = await container.deposits.getUserDeposits(session.user.id)

    return NextResponse.json({ deposits })
  } catch (error) {
    console.error('Get deposits error:', error)

    // Capture error in Sentry
    captureAPIError(error as Error, {
      route: '/api/payments/deposit',
      method: 'GET',
      statusCode: 500,
    })

    return NextResponse.json(
      { error: 'Failed to get deposits' },
      { status: 500 }
    )
  }
}

// POST - Create a bid deposit
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { auctionId, bidAmount } = createDepositSchema.parse(body)

    const container = getContainer()

    // Check eligibility first
    const eligibility = await container.deposits.checkBiddingEligibility(session.user.id)
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: eligibility.reason,
          hasPaymentMethod: eligibility.hasPaymentMethod,
          needsSetup: !eligibility.hasPaymentMethod,
        },
        { status: 400 }
      )
    }

    // Create deposit
    const result = await container.deposits.createBidDeposit({
      userId: session.user.id,
      auctionId,
      bidAmount,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          requiresAction: result.requiresAction,
          clientSecret: result.clientSecret,
          depositId: result.deposit?.id,
        },
        { status: result.requiresAction ? 402 : 400 }
      )
    }

    return NextResponse.json({
      success: true,
      deposit: result.deposit,
      depositAmount: calculateDepositAmount(bidAmount) / 100,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    console.error('Create deposit error:', error)

    // Capture payment error in Sentry
    const session = await auth()
    capturePaymentError(error as Error, {
      userId: session?.user?.id || 'unknown',
      amount: 0, // Unknown at this point
      currency: 'RON',
      type: 'deposit',
      metadata: {
        error: 'Unexpected error during deposit creation',
      },
    })

    return NextResponse.json(
      { error: 'Failed to create deposit' },
      { status: 500 }
    )
  }
}

// PUT - Confirm a pending deposit (after 3DS)
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { depositId } = confirmDepositSchema.parse(body)

    const container = getContainer()
    const result = await container.deposits.confirmDeposit(depositId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      deposit: result.deposit,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    console.error('Confirm deposit error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm deposit' },
      { status: 500 }
    )
  }
}
