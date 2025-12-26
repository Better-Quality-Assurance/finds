/**
 * Payment Processor Interface
 *
 * Abstracts payment processing to enable:
 * - Dependency Inversion Principle (DIP)
 * - Easy provider swapping (Stripe → Adyen, PayPal, etc.)
 * - Simplified testing with mocks
 * - Multi-provider support
 */

/**
 * Payment intent representing an authorized payment
 */
export interface PaymentIntent {
  id: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded'
  clientSecret: string | null
  metadata?: Record<string, string>
}

/**
 * Setup intent for saving payment methods
 */
export interface SetupIntent {
  id: string
  clientSecret: string | null
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'canceled' | 'succeeded'
}

/**
 * Customer in payment system
 */
export interface Customer {
  id: string
  email: string
  name?: string | null
  metadata?: Record<string, string>
}

/**
 * Payment method (card, bank account, etc.)
 */
export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account' | 'sepa_debit' | 'ideal' | 'other'
  customerId?: string | null
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
}

/**
 * Connect account for sellers/payees
 */
export interface ConnectAccount {
  id: string
  email: string
  country: string
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

/**
 * Account link for onboarding
 */
export interface AccountLink {
  url: string
  expiresAt: number
}

/**
 * Transfer to connected account
 */
export interface Transfer {
  id: string
  amount: number
  currency: string
  destination: string
  status: 'pending' | 'paid' | 'failed' | 'canceled'
}

/**
 * Webhook event from payment provider
 */
export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: unknown
  }
  created: number
}

/**
 * Core payment processor interface
 * All payment providers must implement this interface
 */
export interface IPaymentProcessor {
  // ===== Payment Intents (for charges) =====

  /**
   * Create a payment intent for a future charge
   * @param params - Payment intent parameters
   * @returns Created payment intent
   */
  createPaymentIntent(params: {
    amount: number
    currency: string
    customerId: string
    paymentMethodId?: string
    captureMethod?: 'automatic' | 'manual'
    confirm?: boolean
    offSession?: boolean
    metadata?: Record<string, string>
    returnUrl?: string
  }): Promise<PaymentIntent>

  /**
   * Retrieve a payment intent by ID
   * @param intentId - Payment intent ID
   * @returns Payment intent
   */
  retrievePaymentIntent(intentId: string): Promise<PaymentIntent>

  /**
   * Capture a held payment intent
   * @param intentId - Payment intent ID to capture
   * @returns Captured payment intent
   */
  capturePayment(intentId: string): Promise<PaymentIntent>

  /**
   * Cancel/release a payment intent
   * @param intentId - Payment intent ID to cancel
   * @returns Canceled payment intent
   */
  releasePayment(intentId: string): Promise<PaymentIntent>

  // ===== Setup Intents (for saving payment methods) =====

  /**
   * Create a setup intent for saving a payment method
   * @param customerId - Customer ID
   * @returns Created setup intent
   */
  createSetupIntent(customerId: string): Promise<SetupIntent>

  // ===== Customers =====

  /**
   * Create a new customer
   * @param params - Customer parameters
   * @returns Created customer
   */
  createCustomer(params: {
    email: string
    name?: string | null
    metadata?: Record<string, string>
  }): Promise<Customer>

  /**
   * Retrieve a customer by ID
   * @param customerId - Customer ID
   * @returns Customer
   */
  retrieveCustomer(customerId: string): Promise<Customer | null>

  /**
   * List customers by email
   * @param email - Customer email
   * @returns Array of matching customers
   */
  listCustomersByEmail(email: string): Promise<Customer[]>

  // ===== Payment Methods =====

  /**
   * Attach a payment method to a customer
   * @param paymentMethodId - Payment method ID
   * @param customerId - Customer ID
   * @returns Attached payment method
   */
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethod>

  /**
   * Get customer's default payment method
   * @param customerId - Customer ID
   * @returns Default payment method or null
   */
  getDefaultPaymentMethod(customerId: string): Promise<PaymentMethod | null>

  /**
   * List payment methods for a customer
   * @param customerId - Customer ID
   * @param type - Payment method type filter
   * @returns Array of payment methods
   */
  listPaymentMethods(customerId: string, type?: 'card' | 'bank_account'): Promise<PaymentMethod[]>

  // ===== Connect Accounts (for seller payouts) =====

  /**
   * Create a Connect account for sellers
   * @param params - Account parameters
   * @returns Created connect account
   */
  createConnectAccount(params: {
    email: string
    country: string
    type: 'express' | 'standard'
    metadata?: Record<string, string>
  }): Promise<ConnectAccount>

  /**
   * Create account link for onboarding
   * @param params - Account link parameters
   * @returns Account link URL
   */
  createAccountLink(params: {
    accountId: string
    refreshUrl: string
    returnUrl: string
    type: 'account_onboarding' | 'account_update'
  }): Promise<AccountLink>

  /**
   * Create a transfer to a connected account
   * @param params - Transfer parameters
   * @returns Created transfer
   */
  createTransfer(params: {
    amount: number
    currency: string
    destinationAccountId: string
    metadata?: Record<string, string>
  }): Promise<Transfer>

  // ===== Webhooks =====

  /**
   * Construct and verify webhook event
   * @param payload - Request body
   * @param signature - Webhook signature header
   * @param secret - Webhook secret
   * @returns Verified webhook event
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): WebhookEvent
}
