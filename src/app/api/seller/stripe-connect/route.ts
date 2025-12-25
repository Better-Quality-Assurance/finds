import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createConnectAccount, createAccountLink, stripe } from '@/lib/stripe'
import { logAudit } from '@/services/audit.service'

/**
 * POST /api/seller/stripe-connect
 * Create Stripe Connect account and return onboarding URL
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is at least a seller
    if (user.role === 'USER') {
      return NextResponse.json(
        { error: 'User must have seller role to set up payouts' },
        { status: 403 }
      )
    }

    // If user already has a Connect account, generate new onboarding link
    if (user.stripeConnectAccountId) {
      try {
        // Verify account still exists
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)

        // Check if account is already fully onboarded
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          await logAudit({
            actorId: userId,
            action: 'stripe_connect.already_onboarded',
            resourceType: 'user',
            resourceId: userId,
            severity: 'LOW',
            status: 'SUCCESS',
            details: { accountId: user.stripeConnectAccountId },
          })

          return NextResponse.json({
            accountId: user.stripeConnectAccountId,
            alreadyOnboarded: true,
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          })
        }

        // Generate new account link for existing account
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const accountLink = await createAccountLink(
          user.stripeConnectAccountId,
          `${baseUrl}/api/seller/stripe-connect/refresh`,
          `${baseUrl}/api/seller/stripe-connect/callback`
        )

        await logAudit({
          actorId: userId,
          action: 'stripe_connect.link_created',
          resourceType: 'user',
          resourceId: userId,
          severity: 'LOW',
          status: 'SUCCESS',
          details: { accountId: user.stripeConnectAccountId },
        })

        return NextResponse.json({
          accountId: user.stripeConnectAccountId,
          onboardingUrl: accountLink.url,
          expiresAt: accountLink.expires_at,
        })
      } catch (error) {
        // Account doesn't exist anymore, create new one
        console.error('Failed to retrieve Connect account:', error)
      }
    }

    // Create new Stripe Connect account
    // Default to Romania - in production, you might want to get this from user profile
    const country = 'RO'
    const account = await createConnectAccount({
      email: user.email,
      country,
      userId: user.id,
    })

    // Update user with Connect account ID
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeConnectAccountId: account.id,
        stripeConnectStatus: 'pending',
      },
    })

    // Create account onboarding link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const accountLink = await createAccountLink(
      account.id,
      `${baseUrl}/api/seller/stripe-connect/refresh`,
      `${baseUrl}/api/seller/stripe-connect/callback`
    )

    await logAudit({
      actorId: userId,
      action: 'stripe_connect.account_created',
      resourceType: 'user',
      resourceId: userId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        accountId: account.id,
        country,
      },
    })

    return NextResponse.json({
      accountId: account.id,
      onboardingUrl: accountLink.url,
      expiresAt: accountLink.expires_at,
    })
  } catch (error) {
    console.error('Failed to create Stripe Connect account:', error)

    const session = await auth()
    if (session?.user?.id) {
      await logAudit({
        actorId: session.user.id,
        action: 'stripe_connect.account_creation_failed',
        resourceType: 'user',
        resourceId: session.user.id,
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return NextResponse.json(
      {
        error: 'Failed to create Connect account',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seller/stripe-connect
 * Get current Connect account status
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user's Connect account info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        stripeConnectStatus: true,
        payoutEnabled: true,
        stripeConnectOnboardedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.stripeConnectAccountId) {
      return NextResponse.json({
        connected: false,
        accountId: null,
        status: null,
        payoutEnabled: false,
        onboardedAt: null,
      })
    }

    try {
      // Fetch latest account details from Stripe
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)

      // Determine current status
      let status = 'pending'
      let payoutEnabled = false

      if (account.details_submitted) {
        if (account.charges_enabled && account.payouts_enabled) {
          status = 'active'
          payoutEnabled = true
        } else if (account.requirements?.disabled_reason) {
          status = 'restricted'
        }
      }

      // Update user if status has changed
      if (status !== user.stripeConnectStatus || payoutEnabled !== user.payoutEnabled) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeConnectStatus: status,
            payoutEnabled,
            stripeConnectOnboardedAt: status === 'active' && !user.stripeConnectOnboardedAt
              ? new Date()
              : user.stripeConnectOnboardedAt,
          },
        })
      }

      return NextResponse.json({
        connected: true,
        accountId: user.stripeConnectAccountId,
        status,
        payoutEnabled,
        onboardedAt: status === 'active' && !user.stripeConnectOnboardedAt
          ? new Date()
          : user.stripeConnectOnboardedAt,
        requirements: account.requirements,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      })
    } catch (error) {
      console.error('Failed to retrieve Connect account:', error)

      // Account doesn't exist, clear from user
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectAccountId: null,
          stripeConnectStatus: null,
          payoutEnabled: false,
        },
      })

      return NextResponse.json({
        connected: false,
        accountId: null,
        status: null,
        payoutEnabled: false,
        onboardedAt: null,
      })
    }
  } catch (error) {
    console.error('Failed to get Connect account status:', error)

    return NextResponse.json(
      {
        error: 'Failed to get account status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
