import { NextRequest, NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

/**
 * POST /api/auth/verify
 * Verify user email using token from verification email
 *
 * Expected body: { token: string }
 *
 * Process:
 * 1. Look up the verification token in the database
 * 2. Check if token exists and is not expired (24 hour validity)
 * 3. Update user's emailVerified field
 * 4. Delete the used token
 * 5. Return success or error response
 */
export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      throw new ValidationError(
        'Invalid token provided',
        ERROR_CODES.AUTH_INVALID_TOKEN
      )
    }

    const container = getContainer()

    // Find the verification token in the database
    const verificationToken = await container.prisma.verificationToken.findFirst({
      where: {
        token,
      },
    })

    if (!verificationToken) {
      throw new ValidationError(
        'Invalid or expired verification token',
        ERROR_CODES.AUTH_INVALID_TOKEN
      )
    }

    // Check if token is expired (24 hours)
    const now = new Date()
    if (verificationToken.expires < now) {
      // Delete expired token
      await container.prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      })

      throw new ValidationError(
        'Verification token has expired. Please register again.',
        ERROR_CODES.AUTH_TOKEN_EXPIRED
      )
    }

    // Token is valid - update user's emailVerified field
    const user = await container.prisma.user.update({
      where: {
        email: verificationToken.identifier,
      },
      data: {
        emailVerified: new Date(),
      },
    })

    if (!user) {
      throw new NotFoundError(
        'User not found',
        ERROR_CODES.USER_NOT_FOUND
      )
    }

    // Delete the used verification token
    await container.prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    })

    return successResponse({
      message: 'Email verified successfully. You can now log in.',
      email: user.email,
    })
  },
  {
    resourceType: 'user',
    action: 'auth.verify-email',
  }
)

/**
 * GET /api/auth/verify?token=xxx
 * Alternative endpoint for GET requests (for email link clicks)
 * Redirects to the verify-email page with the token
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=no-token', request.url))
  }

  // Redirect to the verify-email page which will handle the verification
  return NextResponse.redirect(
    new URL(`/verify-email?token=${token}`, request.url)
  )
}
