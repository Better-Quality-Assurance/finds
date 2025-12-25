import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createAccountLink } from '@/lib/stripe'
import { logAudit } from '@/services/audit.service'

/**
 * GET /api/seller/stripe-connect/refresh
 * Generate new account link when user needs to complete more onboarding steps
 * This is called when the onboarding link expires or user exits the flow
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
      // Generate new account link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.url
      const accountLink = await createAccountLink(
        user.stripeConnectAccountId,
        `${baseUrl}/api/seller/stripe-connect/refresh`, // If they exit again, come back here
        `${baseUrl}/api/seller/stripe-connect/callback` // When complete, go to callback
      )

      await logAudit({
        actorId: userId,
        action: 'stripe_connect.onboarding_refreshed',
        resourceType: 'user',
        resourceId: userId,
        severity: 'LOW',
        status: 'SUCCESS',
        details: {
          accountId: user.stripeConnectAccountId,
        },
      })

      // Redirect to Stripe onboarding
      return NextResponse.redirect(accountLink.url)
    } catch (error) {
      console.error('Failed to create refresh link:', error)

      await logAudit({
        actorId: userId,
        action: 'stripe_connect.refresh_failed',
        resourceType: 'user',
        resourceId: userId,
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      // Redirect to seller dashboard with error
      const dashboardUrl = new URL(
        `/${user.preferredLanguage || 'en'}/account/seller`,
        process.env.NEXT_PUBLIC_APP_URL || req.url
      )
      dashboardUrl.searchParams.set('error', 'refresh_failed')
      return NextResponse.redirect(dashboardUrl)
    }
  } catch (error) {
    console.error('Connect refresh error:', error)

    // Redirect to account page with generic error
    const accountUrl = new URL('/account', process.env.NEXT_PUBLIC_APP_URL || req.url)
    accountUrl.searchParams.set('error', 'connect_refresh_failed')
    return NextResponse.redirect(accountUrl)
  }
}
