import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { getContainer } from '@/lib/container'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { resetPasswordSchema } from '@/lib/validation-schemas'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const body = await request.json()
    const { token, newPassword } = resetPasswordSchema.parse(body)

    const container = getContainer()

    // Look up the token in the database
    const tokenRecord = await container.prisma.verificationToken.findFirst({
      where: {
        token: token,
      },
    })

    if (!tokenRecord) {
      throw new ValidationError(
        'Invalid or expired reset token',
        ERROR_CODES.AUTH_INVALID_TOKEN
      )
    }

    // Check if token has expired
    if (tokenRecord.expires < new Date()) {
      // Delete the expired token
      await container.prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: tokenRecord.identifier,
            token: tokenRecord.token,
          },
        },
      })

      throw new ValidationError(
        'Reset token has expired. Please request a new one.',
        ERROR_CODES.AUTH_TOKEN_EXPIRED
      )
    }

    // Get the user by email (stored in identifier field)
    const user = await container.prisma.user.findUnique({
      where: { email: tokenRecord.identifier },
    })

    if (!user) {
      throw new NotFoundError(
        'User not found',
        ERROR_CODES.USER_NOT_FOUND
      )
    }

    // Hash the new password
    const passwordHash = await hash(newPassword, 12)

    // Update the user's password
    await container.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Delete the used token
    await container.prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: tokenRecord.identifier,
          token: tokenRecord.token,
        },
      },
    })

    return successResponse({
      message: 'Password reset successfully',
    })
  },
  {
    resourceType: 'user',
    action: 'auth.reset-password',
  }
)
