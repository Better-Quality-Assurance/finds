import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { logAudit } from '@/services/audit.service'

/**
 * GET /api/seller/stripe-connect/callback
 * Handle return from Stripe Connect onboarding
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || req.url)
      loginUrl.searchParams.set('callbackUrl', '/account/seller')
      return NextResponse.redirect(loginUrl)
    }

    const userId = session.user.id

    // Get user's Connect account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeConnectAccountId: true,
        preferredLanguage: true,
      },
    })

    if (!user || !user.stripeConnectAccountId) {
      // Redirect to seller dashboard with error
      const dashboardUrl = new URL(
        `/${user?.preferredLanguage || 'en'}/account/seller`,
        process.env.NEXT_PUBLIC_APP_URL || req.url
      )
      dashboardUrl.searchParams.set('error', 'no_account')
      return NextResponse.redirect(dashboardUrl)
    }

    try {
      // Verify account setup with Stripe
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)

      // Check if onboarding is complete
      const isComplete = account.details_submitted === true
      const isActive = account.charges_enabled && account.payouts_enabled
      const hasRequirements = account.requirements?.currently_due && account.requirements.currently_due.length > 0

      let status = 'pending'
      let payoutEnabled = false

      if (isComplete && isActive) {
        status = 'active'
        payoutEnabled = true
      } else if (account.requirements?.disabled_reason) {
        status = 'restricted'
      }

      // Update user record
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectStatus: status,
          payoutEnabled,
          stripeConnectOnboardedAt: status === 'active' ? new Date() : undefined,
        },
      })

      await logAudit({
        actorId: userId,
        action: 'stripe_connect.onboarding_completed',
        resourceType: 'user',
        resourceId: userId,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: {
          accountId: user.stripeConnectAccountId,
          status,
          payoutEnabled,
          detailsSubmitted: account.details_submitted,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          hasRequirements,
        },
      })

      // Redirect to seller dashboard with success message
      const dashboardUrl = new URL(
        `/${updatedUser.preferredLanguage || 'en'}/account/seller`,
        process.env.NEXT_PUBLIC_APP_URL || req.url
      )

      if (status === 'active') {
        dashboardUrl.searchParams.set('success', 'onboarding_complete')
      } else if (hasRequirements) {
        dashboardUrl.searchParams.set('warning', 'additional_info_required')
      } else {
        dashboardUrl.searchParams.set('info', 'onboarding_in_progress')
      }

      return NextResponse.redirect(dashboardUrl)
    } catch (error) {
      console.error('Failed to verify Connect account:', error)

      await logAudit({
        actorId: userId,
        action: 'stripe_connect.verification_failed',
        resourceType: 'user',
        resourceId: userId,
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      // Redirect with error
      const dashboardUrl = new URL(
        `/${user.preferredLanguage || 'en'}/account/seller`,
        process.env.NEXT_PUBLIC_APP_URL || req.url
      )
      dashboardUrl.searchParams.set('error', 'verification_failed')
      return NextResponse.redirect(dashboardUrl)
    }
  } catch (error) {
    console.error('Connect callback error:', error)

    // Redirect to account page with generic error
    const accountUrl = new URL('/account', process.env.NEXT_PUBLIC_APP_URL || req.url)
    accountUrl.searchParams.set('error', 'connect_callback_failed')
    return NextResponse.redirect(accountUrl)
  }
}
