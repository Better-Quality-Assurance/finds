import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyCode } from '@/services/phone-verification.service'
import { z } from 'zod'

const verifyCodeSchema = z.object({
  code: z.string().length(6),
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
    const { code } = verifyCodeSchema.parse(body)

    const result = await verifyCode(session.user.id, code)

    if (!result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: result.message,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid verification code format' },
        { status: 400 }
      )
    }

    console.error('Error verifying phone code:', error)
    return NextResponse.json(
      { message: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
