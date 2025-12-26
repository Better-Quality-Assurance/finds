/**
 * Stripe Payment Processor Implementation
 *
 * Implements IPaymentProcessor for Stripe payment gateway
 * This adapter wraps Stripe SDK to match our payment processor interface
 */

import Stripe from 'stripe'
import {
  IPaymentProcessor,
  PaymentIntent,
  SetupIntent,
  Customer,
  PaymentMethod,
  ConnectAccount,
  AccountLink,
  Transfer,
  WebhookEvent,
} from './contracts/payment-processor.interface'

/**
 * Stripe implementation of payment processor
 */
export class StripePaymentProcessor implements IPaymentProcessor {
  constructor(private readonly stripe: Stripe) {}

  // ===== Payment Intents =====

  async createPaymentIntent(params: {
    amount: number
    currency: string
    customerId: string
    paymentMethodId?: string
    captureMethod?: 'automatic' | 'manual'
    confirm?: boolean
    offSession?: boolean
    metadata?: Record<string, string>
    returnUrl?: string
  }): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      capture_method: params.captureMethod || 'automatic',
      confirm: params.confirm,
      off_session: params.offSession,
      metadata: params.metadata,
      return_url: params.returnUrl,
    })

    return this.mapPaymentIntent(intent)
  }

  async retrievePaymentIntent(intentId: string): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.retrieve(intentId)
    return this.mapPaymentIntent(intent)
  }

  async capturePayment(intentId: string): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.capture(intentId)
    return this.mapPaymentIntent(intent)
  }

  async releasePayment(intentId: string): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.cancel(intentId)
    return this.mapPaymentIntent(intent)
  }

  // ===== Setup Intents =====

  async createSetupIntent(customerId: string): Promise<SetupIntent> {
    const intent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    })

    return this.mapSetupIntent(intent)
  }

  // ===== Customers =====

  async createCustomer(params: {
    email: string
    name?: string | null
    metadata?: Record<string, string>
  }): Promise<Customer> {
    const customer = await this.stripe.customers.create({
      email: params.email,
      name: params.name || undefined,
      metadata: params.metadata,
    })

    return this.mapCustomer(customer)
  }

  async retrieveCustomer(customerId: string): Promise<Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId)

      if (customer.deleted) {
        return null
      }

      return this.mapCustomer(customer as Stripe.Customer)
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
        return null
      }
      throw error
    }
  }

  async listCustomersByEmail(email: string): Promise<Customer[]> {
    const customers = await this.stripe.customers.list({
      email,
      limit: 100,
    })

    return customers.data.map(c => this.mapCustomer(c))
  }

  // ===== Payment Methods =====

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<PaymentMethod> {
    const pm = await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })

    return this.mapPaymentMethod(pm)
  }

  async getDefaultPaymentMethod(customerId: string): Promise<PaymentMethod | null> {
    const customerResponse = await this.stripe.customers.retrieve(customerId)

    if (customerResponse.deleted) {
      return null
    }

    const customer = customerResponse as Stripe.Customer

    // Check for default payment method
    if (customer.invoice_settings?.default_payment_method) {
      const pmId = customer.invoice_settings.default_payment_method
      const pm = typeof pmId === 'string'
        ? await this.stripe.paymentMethods.retrieve(pmId)
        : pmId

      return this.mapPaymentMethod(pm)
    }

    // Fallback to first available payment method
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
      limit: 1,
    })

    if (paymentMethods.data.length === 0) {
      return null
    }

    return this.mapPaymentMethod(paymentMethods.data[0])
  }

  async listPaymentMethods(customerId: string, type: 'card' | 'bank_account' = 'card'): Promise<PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: type === 'bank_account' ? 'us_bank_account' : type,
      limit: 100,
    })

    return paymentMethods.data.map(pm => this.mapPaymentMethod(pm))
  }

  // ===== Connect Accounts =====

  async createConnectAccount(params: {
    email: string
    country: string
    type: 'express' | 'standard'
    metadata?: Record<string, string>
  }): Promise<ConnectAccount> {
    const account = await this.stripe.accounts.create({
      type: params.type,
      country: params.country,
      email: params.email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: params.metadata,
    })

    return this.mapConnectAccount(account)
  }

  async createAccountLink(params: {
    accountId: string
    refreshUrl: string
    returnUrl: string
    type: 'account_onboarding' | 'account_update'
  }): Promise<AccountLink> {
    const link = await this.stripe.accountLinks.create({
      account: params.accountId,
      refresh_url: params.refreshUrl,
      return_url: params.returnUrl,
      type: params.type,
    })

    return {
      url: link.url,
      expiresAt: link.expires_at,
    }
  }

  async createTransfer(params: {
    amount: number
    currency: string
    destinationAccountId: string
    metadata?: Record<string, string>
  }): Promise<Transfer> {
    const transfer = await this.stripe.transfers.create({
      amount: params.amount,
      currency: params.currency,
      destination: params.destinationAccountId,
      metadata: params.metadata,
    })

    return {
      id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination as string,
      status: transfer.reversed ? 'canceled' : 'paid',
    }
  }

  // ===== Webhooks =====

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): WebhookEvent {
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret)

    return {
      id: event.id,
      type: event.type,
      data: event.data,
      created: event.created,
    }
  }

  // ===== Private Mapping Methods =====

  private mapPaymentIntent(intent: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status as PaymentIntent['status'],
      clientSecret: intent.client_secret,
      metadata: intent.metadata as Record<string, string>,
    }
  }

  private mapSetupIntent(intent: Stripe.SetupIntent): SetupIntent {
    return {
      id: intent.id,
      clientSecret: intent.client_secret,
      status: intent.status as SetupIntent['status'],
    }
  }

  private mapCustomer(customer: Stripe.Customer): Customer {
    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name,
      metadata: customer.metadata as Record<string, string>,
    }
  }

  private mapPaymentMethod(pm: Stripe.PaymentMethod): PaymentMethod {
    const method: PaymentMethod = {
      id: pm.id,
      type: this.normalizePaymentMethodType(pm.type),
      customerId: pm.customer as string | null | undefined,
    }

    if (pm.card) {
      method.card = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      }
    }

    return method
  }

  private mapConnectAccount(account: Stripe.Account): ConnectAccount {
    return {
      id: account.id,
      email: account.email || '',
      country: account.country || '',
      detailsSubmitted: account.details_submitted || false,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
    }
  }

  private normalizePaymentMethodType(type: string): PaymentMethod['type'] {
    switch (type) {
      case 'card':
        return 'card'
      case 'us_bank_account':
      case 'sepa_debit':
        return 'bank_account'
      case 'ideal':
        return 'ideal'
      default:
        return 'other'
    }
  }
}

/**
 * Factory function to create Stripe payment processor
 */
export function createStripePaymentProcessor(stripe: Stripe): IPaymentProcessor {
  return new StripePaymentProcessor(stripe)
}
