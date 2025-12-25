import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { routing } from '@/i18n/routing'
import * as Sentry from '@sentry/nextjs'

const intlMiddleware = createMiddleware(routing)

const protectedPaths = ['/account', '/sell', '/admin']
const authPaths = ['/login', '/register']
const adminPaths = ['/admin']
// Paths that require verified email (subset of protected paths)
const emailVerificationRequiredPaths = ['/sell', '/account/listings']

export default async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // Extract locale-agnostic path
    const pathnameWithoutLocale = pathname.replace(/^\/(en|ro)/, '') || '/'

    // Check if path requires authentication
    const isProtectedPath = protectedPaths.some((path) =>
      pathnameWithoutLocale.startsWith(path)
    )
    const isAuthPath = authPaths.some((path) =>
      pathnameWithoutLocale.startsWith(path)
    )
    const isAdminPath = adminPaths.some((path) =>
      pathnameWithoutLocale.startsWith(path)
    )
    const requiresEmailVerification = emailVerificationRequiredPaths.some(
      (path) => pathnameWithoutLocale.startsWith(path)
    )

    // Get session
    const session = await auth()

    // Set Sentry user context if session exists
    if (session?.user) {
      Sentry.setUser({
        id: session.user.id,
        email: session.user.email,
        username: session.user.name || undefined,
        role: session.user.role,
      })
    }

    // Redirect authenticated users away from auth pages
    if (isAuthPath && session?.user) {
      const locale = pathname.match(/^\/(en|ro)/)?.[1] || 'en'
      return NextResponse.redirect(new URL(`/${locale}/account`, request.url))
    }

    // Protect authenticated routes
    if (isProtectedPath && !session?.user) {
      const locale = pathname.match(/^\/(en|ro)/)?.[1] || 'en'
      const callbackUrl = encodeURIComponent(pathname)
      return NextResponse.redirect(
        new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, request.url)
      )
    }

    // Check email verification for specific routes
    if (requiresEmailVerification && session?.user && !session.user.emailVerified) {
      const locale = pathname.match(/^\/(en|ro)/)?.[1] || 'en'
      const callbackUrl = encodeURIComponent(pathname)
      return NextResponse.redirect(
        new URL(
          `/${locale}/verify-email?required=true&callbackUrl=${callbackUrl}`,
          request.url
        )
      )
    }

    // Protect admin routes
    if (isAdminPath && session?.user) {
      const allowedRoles = ['ADMIN', 'MODERATOR', 'REVIEWER']
      if (!allowedRoles.includes(session.user.role)) {
        const locale = pathname.match(/^\/(en|ro)/)?.[1] || 'en'
        return NextResponse.redirect(new URL(`/${locale}`, request.url))
      }
    }

    // Apply i18n middleware
    return intlMiddleware(request)
  } catch (error) {
    // Capture middleware errors in Sentry
    Sentry.captureException(error, {
      tags: {
        middleware: 'auth',
        path: request.nextUrl.pathname,
      },
      contexts: {
        request: {
          url: request.nextUrl.href,
          method: request.method,
          headers: Object.fromEntries(
            Array.from(request.headers.entries()).filter(
              ([key]) => !['authorization', 'cookie'].includes(key.toLowerCase())
            )
          ),
        },
      },
    })

    // Re-throw to let Next.js handle the error
    throw error
  }
}

export const config = {
  matcher: [
    // Match all pathnames except static files and api routes
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
