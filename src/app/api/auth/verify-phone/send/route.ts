import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendVerificationCode } from '@/services/phone-verification.service'
import { z } from 'zod'

const sendCodeSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phoneNumber } = sendCodeSchema.parse(body)

    const result = await sendVerificationCode(session.user.id, phoneNumber)

    if (!result.success) {
      return NextResponse.json(
        {
          message: result.message,
          cooldownSeconds: result.cooldownSeconds,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.message,
      expiresAt: result.expiresAt?.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    console.error('Error sending phone verification:', error)
    return NextResponse.json(
      { message: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}
