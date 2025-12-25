import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/seller/stripe-connect/dashboard
 * Generate Stripe Express Dashboard login link
 */
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user's Connect account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        payoutEnabled: true,
      },
    })

    if (!user || !user.stripeConnectAccountId) {
      return NextResponse.json(
        { error: 'No Connect account found' },
        { status: 404 }
      )
    }

    if (!user.payoutEnabled) {
      return NextResponse.json(
        { error: 'Payouts not enabled yet' },
        { status: 403 }
      )
    }

    // Create login link for Stripe Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId)

    return NextResponse.json({
      url: loginLink.url,
    })
  } catch (error) {
    console.error('Failed to create dashboard login link:', error)

    return NextResponse.json(
      {
        error: 'Failed to open dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
