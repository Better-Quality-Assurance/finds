import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { auth } from '@/lib/auth'

/**
 * POST /api/auth/resend-verification
 * Resend verification email to the authenticated user
 *
 * Process:
 * 1. Check if user is authenticated
 * 2. Check if email is already verified
 * 3. Delete any existing verification tokens for this user
 * 4. Generate a new verification token
 * 5. Send verification email
 * 6. Return success response
 */
export async function POST() {
  try {
    // Get authenticated user
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { message: 'You must be logged in to resend verification email' },
        { status: 401 }
      )
    }

    const { email, emailVerified } = session.user

    // Check if email is already verified
    if (emailVerified) {
      return NextResponse.json(
        { message: 'Your email is already verified' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex')

    // Token expires in 24 hours
    const tokenExpiry = new Date()
    tokenExpiry.setHours(tokenExpiry.getHours() + 24)

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
      },
    })

    // Create new verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: tokenExpiry,
      },
    })

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      return NextResponse.json(
        { message: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Verification email sent successfully. Please check your inbox.',
        email,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)

    return NextResponse.json(
      { message: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
