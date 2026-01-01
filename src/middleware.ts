import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { routing } from '@/i18n/routing'

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
    // Fetch fresh status from API to handle case where user verified but session isn't updated
    if (requiresEmailVerification && session?.user) {
      try {
        const verificationResponse = await fetch(
          new URL('/api/user/verification-status', request.url),
          {
            headers: {
              cookie: request.headers.get('cookie') || '',
            },
          }
        )
        if (verificationResponse.ok) {
          const data = await verificationResponse.json()
          if (!data.emailVerified) {
            const locale = pathname.match(/^\/(en|ro)/)?.[1] || 'en'
            const callbackUrl = encodeURIComponent(pathname)
            return NextResponse.redirect(
              new URL(
                `/${locale}/verify-email?required=true&callbackUrl=${callbackUrl}`,
                request.url
              )
            )
          }
        }
      } catch {
        // If verification check fails, fall back to session check
        if (!session.user.emailVerified) {
          const locale = pathname.match(/^\/(en|ro)/)?.[1] || 'en'
          const callbackUrl = encodeURIComponent(pathname)
          return NextResponse.redirect(
            new URL(
              `/${locale}/verify-email?required=true&callbackUrl=${callbackUrl}`,
              request.url
            )
          )
        }
      }
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
    // Log middleware errors
    console.error('[Middleware] Error:', error, {
      path: request.nextUrl.pathname,
      url: request.nextUrl.href,
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
