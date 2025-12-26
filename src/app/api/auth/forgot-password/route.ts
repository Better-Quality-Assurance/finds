import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContainer } from '@/lib/container'
import { randomUUID } from 'crypto'
import { checkRateLimit, emailRateLimitKey, createRateLimitHeaders, createRateLimitResponse } from '@/middleware/rate-limit'
import { PASSWORD_RESET_RATE_LIMIT } from '@/lib/rate-limit-config'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { forgotPasswordSchema } from '@/lib/validation-schemas'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Rate limit based on email address to prevent abuse
    const rateLimitKey = emailRateLimitKey('reset-password', email)
    const rateLimitResult = checkRateLimit(rateLimitKey, PASSWORD_RESET_RATE_LIMIT)

    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult,
        'Too many password reset requests. Please try again later.'
      )
    }

    const container = getContainer()

    // Look up user by email
    const user = await container.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Always return success to prevent email enumeration attacks
    // Even if the user doesn't exist, we pretend we sent the email
    if (!user) {
      // Add a small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 200))
      const response = NextResponse.json({
        message: 'If an account with that email exists, we sent a password reset link.',
      })

      // Add rate limit headers even when user doesn't exist
      const headers = createRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    }

    // Generate a secure random token
    const token = randomUUID()

    // Calculate expiration time (1 hour from now)
    const expires = new Date()
    expires.setHours(expires.getHours() + 1)

    // Delete any existing password reset tokens for this user
    await container.prisma.verificationToken.deleteMany({
      where: {
        identifier: email.toLowerCase(),
      },
    })

    // Store the new token in the database
    await container.prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    })

    // Send the password reset email
    try {
      await container.email.sendPasswordResetEmail(email, token)
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Don't reveal to the user that email sending failed
      // Just log it and continue
    }

    // Always return the same success message with rate limit headers
    const response = NextResponse.json({
      message: 'If an account with that email exists, we sent a password reset link.',
    })

    // Add rate limit headers
    const headers = createRateLimitHeaders(rateLimitResult)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  },
  {
    resourceType: 'user',
    action: 'auth.forgot-password',
  }
)
