import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'

// GET - List user's payment methods
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        stripeCustomerId: true,
        biddingEnabled: true,
      },
    })

    if (!user?.stripeCustomerId) {
      return NextResponse.json({
        paymentMethods: [],
        biddingEnabled: false,
        hasCustomer: false,
      })
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    })

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
      biddingEnabled: user.biddingEnabled,
      hasCustomer: true,
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a payment method
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentMethodId = searchParams.get('id')

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: 'No payment methods found' }, { status: 404 })
    }

    // Verify the payment method belongs to this customer
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId)
    if (pm.customer !== user.stripeCustomerId) {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Detach the payment method
    await stripe.paymentMethods.detach(paymentMethodId)

    // Check if user has any remaining payment methods
    const remainingMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    })

    // If no payment methods remain, disable bidding
    if (remainingMethods.data.length === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { biddingEnabled: false },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing payment method:', error)
    return NextResponse.json(
      { error: 'Failed to remove payment method' },
      { status: 500 }
    )
  }
}
