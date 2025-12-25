import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'

// POST - Create SetupIntent for adding payment method
export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const container = getContainer()
    const user = await container.prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, emailVerified: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before setting up payments' },
        { status: 400 }
      )
    }

    const result = await container.deposits.setupBiddingPayment({
      id: user.id,
      email: user.email,
      name: user.name,
    })

    return NextResponse.json({
      customerId: result.customerId,
      clientSecret: result.clientSecret,
    })
  } catch (error) {
    console.error('Setup payment error:', error)
    return NextResponse.json(
      { error: 'Failed to setup payment method' },
      { status: 500 }
    )
  }
}

// PUT - Confirm payment method setup and enable bidding
export async function PUT() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const container = getContainer()
    const user = await container.deposits.enableBidding(session.user.id)

    return NextResponse.json({
      success: true,
      biddingEnabled: user.biddingEnabled,
    })
  } catch (error) {
    console.error('Enable bidding error:', error)
    return NextResponse.json(
      { error: 'Failed to enable bidding' },
      { status: 500 }
    )
  }
}
