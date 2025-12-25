import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { constructWebhookEvent } from '@/lib/stripe'
import { getContainer } from '@/lib/container'
import Stripe from 'stripe'
import { paymentLogger, logError } from '@/lib/logger'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    paymentLogger.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature, webhookSecret)
  } catch (error) {
    logError(
      paymentLogger,
      'Webhook signature verification failed',
      error
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentSucceeded(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentFailed(paymentIntent)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentCanceled(paymentIntent)
        break
      }

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent
        await handleSetupIntentSucceeded(setupIntent)
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await handleAccountUpdated(account)
        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        await handleTransferCreated(transfer)
        break
      }

      case 'transfer.updated': {
        const transfer = event.data.object as Stripe.Transfer
        // Check if transfer failed or was reversed
        if (transfer.reversed) {
          await handleTransferReversed(transfer)
        }
        // Note: Stripe doesn't provide a specific failed status for transfers
        // Failures are typically handled through the transfer.created event
        break
      }

      case 'transfer.reversed': {
        const transfer = event.data.object as Stripe.Transfer
        await handleTransferReversed(transfer)
        break
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated':
        // Handle subscription events if needed
        break

      default:
        paymentLogger.debug({ eventType: event.type }, 'Unhandled webhook event type')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logError(
      paymentLogger,
      'Webhook handler error',
      error,
      { eventType: event.type }
    )
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { type, auctionId, userId } = paymentIntent.metadata
  const container = getContainer()

  if (type === 'bid_deposit') {
    // Update deposit status if it was pending authentication
    await container.prisma.bidDeposit.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
      data: {
        status: 'HELD',
        heldAt: new Date(),
      },
    })

    paymentLogger.info({ auctionId, userId }, 'Deposit confirmed via webhook')

    // Log to audit log
    await container.audit.logAuditEvent({
      actorId: userId,
      action: 'payment.deposit.webhook_confirmed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        timestamp: new Date().toISOString(),
      },
    })
  }

  if (type === 'buyer_fee') {
    // Update auction payment status
    await container.prisma.auction.updateMany({
      where: {
        id: auctionId,
        paymentStatus: { in: ['UNPAID', 'PENDING'] },
      },
      data: {
        paymentStatus: 'PAID',
        paymentIntentId: paymentIntent.id,
        paidAt: new Date(),
      },
    })

    paymentLogger.info({ auctionId, userId }, 'Buyer fee payment confirmed via webhook')

    // Log to audit log
    await container.audit.logAuditEvent({
      actorId: userId,
      action: 'payment.buyer_fee.webhook_confirmed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        finalPrice: paymentIntent.metadata.finalPrice,
        buyerFee: paymentIntent.metadata.buyerFee,
        timestamp: new Date().toISOString(),
      },
    })

    // Trigger seller payout process after buyer payment is confirmed
    try {
      // Queue payout creation (in production, use a job queue like BullMQ)
      // For now, execute directly but don't await to avoid blocking webhook response
      container.payouts.createSellerPayout(auctionId).catch(error => {
        logError(paymentLogger, 'Failed to create seller payout', error, { auctionId })
      })
    } catch (error) {
      logError(paymentLogger, 'Failed to trigger seller payout', error, { auctionId })
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { type, auctionId, userId } = paymentIntent.metadata
  const container = getContainer()

  if (type === 'bid_deposit') {
    // Update deposit status to failed
    await container.prisma.bidDeposit.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
      data: {
        status: 'FAILED',
      },
    })

    paymentLogger.warn({ auctionId, userId }, 'Deposit payment failed via webhook')

    // Log to audit log
    await container.audit.logAuditEvent({
      actorId: userId,
      action: 'payment.deposit.webhook_failed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'FAILURE',
      errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
      details: {
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error ? {
          type: paymentIntent.last_payment_error.type,
          code: paymentIntent.last_payment_error.code,
          message: paymentIntent.last_payment_error.message,
          decline_code: paymentIntent.last_payment_error.decline_code,
        } : null,
        timestamp: new Date().toISOString(),
      },
    })

    // TODO: Notify user about failed deposit
    // TODO: Create fraud alert if repeated failures
  }

  if (type === 'buyer_fee') {
    // Update auction payment status to failed
    await container.prisma.auction.updateMany({
      where: {
        id: auctionId,
        paymentIntentId: paymentIntent.id,
      },
      data: {
        paymentStatus: 'FAILED',
      },
    })

    paymentLogger.error({ auctionId, userId }, 'Buyer fee payment failed via webhook')

    // Log to audit log
    await container.audit.logAuditEvent({
      actorId: userId,
      action: 'payment.buyer_fee.webhook_failed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'CRITICAL',
      status: 'FAILURE',
      errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
      details: {
        paymentIntentId: paymentIntent.id,
        error: paymentIntent.last_payment_error ? {
          type: paymentIntent.last_payment_error.type,
          code: paymentIntent.last_payment_error.code,
          message: paymentIntent.last_payment_error.message,
          decline_code: paymentIntent.last_payment_error.decline_code,
        } : null,
        timestamp: new Date().toISOString(),
      },
    })

    // TODO: Notify user and seller about failed payment
    // TODO: Consider offering second-chance to next highest bidder
  }
}

async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const { type } = paymentIntent.metadata
  const container = getContainer()

  if (type === 'bid_deposit') {
    // Update deposit status to released
    await container.prisma.bidDeposit.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'HELD',
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    })
  }
}

async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  const customerId = setupIntent.customer as string
  const paymentMethodId = setupIntent.payment_method as string
  const container = getContainer()

  if (customerId && paymentMethodId) {
    // Find user by Stripe customer ID and enable bidding
    const user = await container.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    })

    if (user) {
      await container.prisma.user.update({
        where: { id: user.id },
        data: { biddingEnabled: true },
      })

      paymentLogger.info({ userId: user.id }, 'Bidding enabled via webhook')
    }
  }
}

// ============================================================================
// STRIPE CONNECT WEBHOOK HANDLERS
// ============================================================================

async function handleAccountUpdated(account: Stripe.Account) {
  const container = getContainer()

  // Find user by Connect account ID
  const user = await container.prisma.user.findFirst({
    where: { stripeConnectAccountId: account.id },
  })

  if (!user) {
    paymentLogger.warn({ accountId: account.id }, 'No user found for Connect account')
    return
  }

  // Determine account status
  let status = 'pending'
  let payoutEnabled = false

  if (account.details_submitted) {
    if (account.charges_enabled && account.payouts_enabled) {
      status = 'active'
      payoutEnabled = true
    } else if (account.requirements?.disabled_reason) {
      status = 'restricted'
    }
  }

  // Update user record
  const wasNotActive = user.stripeConnectStatus !== 'active'
  const isNowActive = status === 'active'

  await container.prisma.user.update({
    where: { id: user.id },
    data: {
      stripeConnectStatus: status,
      payoutEnabled,
      stripeConnectOnboardedAt: isNowActive && wasNotActive ? new Date() : user.stripeConnectOnboardedAt,
    },
  })

  // Log audit event
  await container.audit.logAuditEvent({
    actorId: user.id,
    action: 'stripe_connect.account_updated',
    resourceType: 'user',
    resourceId: user.id,
    severity: 'MEDIUM',
    status: 'SUCCESS',
    details: {
      accountId: account.id,
      status,
      payoutEnabled,
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements ? {
        currently_due: account.requirements.currently_due,
        eventually_due: account.requirements.eventually_due,
        past_due: account.requirements.past_due,
        disabled_reason: account.requirements.disabled_reason,
      } : null,
      timestamp: new Date().toISOString(),
    },
  })

  paymentLogger.info({ userId: user.id, status, payoutEnabled }, 'Connect account updated')
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const { auctionId, sellerId } = transfer.metadata
  const container = getContainer()

  if (!auctionId) {
    paymentLogger.warn('Transfer created without auction ID')
    return
  }

  // Update auction with transfer confirmation
  await container.prisma.auction.updateMany({
    where: {
      id: auctionId,
      sellerPayoutStatus: 'processing',
    },
    data: {
      sellerPayoutStatus: 'completed',
      sellerPayoutId: transfer.id,
      sellerPaidAt: new Date(),
    },
  })

  // Log audit event
  await container.audit.logAuditEvent({
    actorId: sellerId || 'system',
    action: 'seller_payout.transfer_created',
    resourceType: 'auction',
    resourceId: auctionId,
    severity: 'MEDIUM',
    status: 'SUCCESS',
    details: {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id || null,
      auctionId: transfer.metadata.auctionId,
      sellerId: transfer.metadata.sellerId,
      timestamp: new Date().toISOString(),
    },
  })

  paymentLogger.info({ auctionId, transferId: transfer.id }, 'Transfer created')
}

// Note: This function is kept for future use but transfer.failed is not a valid Stripe event
// Transfer failures are typically detected through payout.failed or other events
async function handleTransferFailed(transfer: Stripe.Transfer) {
  const { auctionId, sellerId } = transfer.metadata
  const container = getContainer()

  if (!auctionId) {
    paymentLogger.warn('Transfer failed without auction ID')
    return
  }

  // Update auction payout status to failed
  await container.prisma.auction.updateMany({
    where: {
      id: auctionId,
      sellerPayoutId: transfer.id,
    },
    data: {
      sellerPayoutStatus: 'failed',
    },
  })

  // Log audit event with high severity
  await container.audit.logAuditEvent({
    actorId: sellerId || 'system',
    action: 'seller_payout.transfer_failed',
    resourceType: 'auction',
    resourceId: auctionId,
    severity: 'CRITICAL',
    status: 'FAILURE',
    errorMessage: 'Transfer failed',
    details: {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id || null,
      auctionId: transfer.metadata.auctionId,
      sellerId: transfer.metadata.sellerId,
      timestamp: new Date().toISOString(),
    },
  })

  paymentLogger.error({ auctionId }, 'Transfer failed')

  // TODO: Send notification to seller and admin
  // TODO: Create fraud alert if suspicious
}

async function handleTransferReversed(transfer: Stripe.Transfer) {
  const { auctionId, sellerId } = transfer.metadata
  const container = getContainer()

  if (!auctionId) {
    paymentLogger.warn('Transfer reversed without auction ID')
    return
  }

  // Update auction payout status to failed
  await container.prisma.auction.updateMany({
    where: {
      id: auctionId,
      sellerPayoutId: transfer.id,
    },
    data: {
      sellerPayoutStatus: 'failed',
    },
  })

  // Log audit event with critical severity
  await container.audit.logAuditEvent({
    actorId: sellerId || 'system',
    action: 'seller_payout.transfer_reversed',
    resourceType: 'auction',
    resourceId: auctionId,
    severity: 'CRITICAL',
    status: 'FAILURE',
    errorMessage: 'Transfer was reversed',
    details: {
      transferId: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id || null,
      reversed: transfer.reversed,
      auctionId: transfer.metadata.auctionId,
      sellerId: transfer.metadata.sellerId,
      timestamp: new Date().toISOString(),
    },
  })

  paymentLogger.error({ auctionId, transferId: transfer.id }, 'Transfer reversed')

  // TODO: Send urgent notification to seller and admin
  // TODO: Investigate reason for reversal
  // TODO: Create fraud alert
}
