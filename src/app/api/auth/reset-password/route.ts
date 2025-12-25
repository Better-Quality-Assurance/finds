import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import { getContainer } from '@/lib/container'

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, newPassword } = resetPasswordSchema.parse(body)

    const container = getContainer()

    // Look up the token in the database
    const verificationToken = await container.prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: token,
          token: token,
        },
      },
    })

    // If token doesn't exist, try to find by token only
    // (since identifier is email, we need to find it differently)
    const tokenRecord = await container.prisma.verificationToken.findFirst({
      where: {
        token: token,
      },
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 400 }
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

      return NextResponse.json(
        { message: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Get the user by email (stored in identifier field)
    const user = await container.prisma.user.findUnique({
      where: { email: tokenRecord.identifier },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
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

    return NextResponse.json({
      message: 'Password reset successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        if (err.path[0] === 'newPassword') {
          return 'Password must be at least 8 characters'
        }
        return err.message
      })

      return NextResponse.json(
        { message: errors[0] || 'Invalid input' },
        { status: 400 }
      )
    }

    console.error('Reset password error:', error)

    return NextResponse.json(
      { message: 'Something went wrong. Please try again later.' },
      { status: 500 }
    )
  }
}
