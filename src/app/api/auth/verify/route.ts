import { NextResponse } from 'next/server'
import { getContainer } from '@/lib/container'

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
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { message: 'Invalid token provided' },
        { status: 400 }
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
      return NextResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 400 }
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

      return NextResponse.json(
        { message: 'Verification token has expired. Please register again.' },
        { status: 400 }
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
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
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

    return NextResponse.json(
      {
        message: 'Email verified successfully. You can now log in.',
        email: user.email,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Email verification error:', error)

    return NextResponse.json(
      { message: 'An error occurred during verification. Please try again.' },
      { status: 500 }
    )
  }
}

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
