import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        emailVerified: true,
        phoneVerified: true,
        biddingEnabled: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      emailVerified: !!user.emailVerified,
      phoneVerified: !!user.phoneVerified,
      paymentMethodAdded: !!user.stripeCustomerId,
      biddingEnabled: user.biddingEnabled,
    })
  } catch (error) {
    console.error('Error fetching verification status:', error)
    return NextResponse.json(
      { message: 'Failed to fetch verification status' },
      { status: 500 }
    )
  }
}
