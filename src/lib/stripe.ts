import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return _stripe
}

// For backward compatibility
export const stripe = {
  get paymentIntents() { return getStripe().paymentIntents },
  get customers() { return getStripe().customers },
  get paymentMethods() { return getStripe().paymentMethods },
  get setupIntents() { return getStripe().setupIntents },
  get accounts() { return getStripe().accounts },
  get accountLinks() { return getStripe().accountLinks },
  get transfers() { return getStripe().transfers },
  get webhooks() { return getStripe().webhooks },
}

// Bid deposit configuration
export const DEPOSIT_CONFIG = {
  // Minimum deposit amount in cents
  MIN_DEPOSIT_CENTS: 50000, // €500
  // Maximum deposit as percentage of bid
  MAX_DEPOSIT_PERCENT: 5,
  // Maximum deposit amount in cents
  MAX_DEPOSIT_CENTS: 500000, // €5,000
  // Currency for deposits
  CURRENCY: 'eur',
  // Hold duration in days
  HOLD_DURATION_DAYS: 30,
} as const

/**
 * Calculate deposit amount for a bid
 * @param bidAmount - The bid amount in the auction currency (e.g., euros)
 * @returns Deposit amount in cents
 */
export function calculateDepositAmount(bidAmount: number): number {
  const percentageDeposit = Math.round(bidAmount * (DEPOSIT_CONFIG.MAX_DEPOSIT_PERCENT / 100) * 100)

  // Use the higher of minimum deposit or percentage, capped at maximum
  const deposit = Math.max(
    DEPOSIT_CONFIG.MIN_DEPOSIT_CENTS,
    Math.min(percentageDeposit, DEPOSIT_CONFIG.MAX_DEPOSIT_CENTS)
  )

  return deposit
}

/**
 * Create a payment intent for bid deposit (card hold)
 */
export async function createDepositHold(params: {
  customerId: string
  paymentMethodId: string
  amount: number
  auctionId: string
  userId: string
  metadata?: Record<string, string>
}): Promise<Stripe.PaymentIntent> {
  const { customerId, paymentMethodId, amount, auctionId, userId, metadata = {} } = params

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: DEPOSIT_CONFIG.CURRENCY,
    customer: customerId,
    payment_method: paymentMethodId,
    capture_method: 'manual', // Hold funds without capturing
    confirm: true,
    metadata: {
      type: 'bid_deposit',
      auctionId,
      userId,
      ...metadata,
    },
    // Require card authentication if needed
    off_session: true,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/bids`,
  })

  return paymentIntent
}

/**
 * Capture a held deposit (when auction is won)
 */
export async function captureDeposit(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.capture(paymentIntentId)
}

/**
 * Cancel a held deposit (when outbid or auction ends)
 */
export async function releaseDeposit(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.cancel(paymentIntentId)
}

/**
 * Create or retrieve Stripe customer for a user
 */
export async function getOrCreateCustomer(params: {
  userId: string
  email: string
  name?: string | null
}): Promise<Stripe.Customer> {
  const { userId, email, name } = params

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // Create new customer
  return stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  })
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  })
}

/**
 * Create a SetupIntent for saving a card
 */
export async function createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
  return stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  })
}

/**
 * Get customer's default payment method
 */
export async function getDefaultPaymentMethod(customerId: string): Promise<Stripe.PaymentMethod | null> {
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer

  if (customer.deleted) {
    return null
  }

  if (!customer.invoice_settings?.default_payment_method) {
    // Get any attached payment method
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1,
    })
    return paymentMethods.data[0] || null
  }

  const pmId = customer.invoice_settings.default_payment_method
  if (typeof pmId === 'string') {
    return stripe.paymentMethods.retrieve(pmId)
  }
  return pmId
}

/**
 * Create a Stripe Connect account for sellers (for future payouts)
 */
export async function createConnectAccount(params: {
  email: string
  country: string
  userId: string
}): Promise<Stripe.Account> {
  const { email, country, userId } = params

  return stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      userId,
    },
  })
}

/**
 * Create account link for Stripe Connect onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
}

/**
 * Create a transfer to a connected account (seller payout)
 */
export async function createTransfer(params: {
  amount: number
  destinationAccountId: string
  auctionId: string
}): Promise<Stripe.Transfer> {
  const { amount, destinationAccountId, auctionId } = params

  return stripe.transfers.create({
    amount,
    currency: DEPOSIT_CONFIG.CURRENCY,
    destination: destinationAccountId,
    metadata: {
      auctionId,
    },
  })
}

/**
 * Construct and verify Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
