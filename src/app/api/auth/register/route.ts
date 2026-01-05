import { NextRequest } from 'next/server'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'
import { ActivityType } from '@prisma/client'
import { getContainer } from '@/lib/container'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ConflictError, RateLimitError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { checkRateLimit, ipRateLimitKey } from '@/middleware/rate-limit'
import { REGISTRATION_RATE_LIMIT } from '@/lib/rate-limit-config'
import { registerApiSchema } from '@/lib/validation-schemas'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    // Rate limit based on IP address to prevent spam registrations
    const rateLimitKey = ipRateLimitKey('register', request)
    const rateLimitResult = checkRateLimit(rateLimitKey, REGISTRATION_RATE_LIMIT)

    if (!rateLimitResult.success) {
      throw new RateLimitError(
        'Too many registration attempts. Please try again later.',
        ERROR_CODES.RATE_LIMIT_TOO_MANY_REQUESTS,
        {
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
        }
      )
    }

    const body = await request.json()
    const { name, email, password } = registerApiSchema.parse(body)

    const container = getContainer()

    // Check if user already exists
    const existingUser = await container.prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      throw new ConflictError(
        'An account with this email already exists',
        ERROR_CODES.USER_EMAIL_IN_USE,
        { email }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Generate verification token (cryptographically secure random token)
    const verificationToken = randomBytes(32).toString('hex')

    // Token expires in 24 hours
    const tokenExpiry = new Date()
    tokenExpiry.setHours(tokenExpiry.getHours() + 24)

    // Get IP and user agent for activity tracking
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Create user and verification token in a transaction
    await container.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          termsAcceptedAt: new Date(),
        },
      })

      // Create verification token
      await tx.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: tokenExpiry,
        },
      })

      // Track registration activity
      await tx.userActivity.create({
        data: {
          userId: user.id,
          activityType: ActivityType.REGISTER,
          description: 'User registered',
          ipAddress,
          userAgent,
        },
      })
    })

    // Send verification email
    try {
      await container.email.sendVerificationEmail(email, verificationToken)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Note: We don't fail the registration if email fails to send
      // The user can request a new verification email later
    }

    const response = successResponse(
      {
        message: 'Account created successfully. Please check your email to verify your account.',
        email,
      },
      201
    )

    // Add rate limit headers to successful response
    response.headers.set('X-RateLimit-Limit', rateLimitResult.total.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString())

    return response
  },
  {
    resourceType: 'user',
    action: 'auth.register',
  }
)
