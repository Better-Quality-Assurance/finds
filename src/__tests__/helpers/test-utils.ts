import { vi } from 'vitest'
import { PrismaClient, Prisma, DepositStatus, PaymentStatus, AlertSeverity } from '@prisma/client'
import Stripe from 'stripe'
import { createTestContainer, ServiceContainer } from '@/lib/container'
import { IPaymentProcessor } from '@/services/contracts/payment-processor.interface'

/**
 * Create a mock Prisma client for testing
 */
export function createMockPrisma(): PrismaClient {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    auction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    bid: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    bidDeposit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    listing: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    fraudAlert: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: PrismaClient) => Promise<unknown>) => {
      // Execute the callback with the same mock prisma instance
      return callback(this as unknown as PrismaClient)
    }),
  } as unknown as PrismaClient
}

/**
 * Create a mock Stripe client for testing
 */
export function createMockStripe(): Stripe {
  return {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    },
    paymentMethods: {
      list: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
      retrieve: vi.fn(),
    },
    setupIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
      capture: vi.fn(),
    },
  } as unknown as Stripe
}

/**
 * Create a mock payment processor for testing
 */
export function createMockPaymentProcessor(): IPaymentProcessor {
  return {
    createPaymentIntent: vi.fn(),
    retrievePaymentIntent: vi.fn(),
    capturePayment: vi.fn(),
    releasePayment: vi.fn(),
    createSetupIntent: vi.fn(),
    createCustomer: vi.fn(),
    retrieveCustomer: vi.fn(),
    listCustomersByEmail: vi.fn(),
    attachPaymentMethod: vi.fn(),
    getDefaultPaymentMethod: vi.fn(),
    listPaymentMethods: vi.fn(),
    createConnectAccount: vi.fn(),
    createAccountLink: vi.fn(),
    createTransfer: vi.fn(),
    constructWebhookEvent: vi.fn(),
  } as unknown as IPaymentProcessor
}

/**
 * Create a test container with mocked services
 */
export function createMockContainer(overrides?: Partial<ServiceContainer>): ServiceContainer {
  const baseContainer = createTestContainer()
  return {
    ...baseContainer,
    ...overrides,
  }
}

/**
 * Test data factories
 */
export const factories = {
  user: (overrides?: Partial<{
    id: string
    email: string
    name: string | null
    emailVerified: Date | null
    biddingEnabled: boolean
    stripeCustomerId: string | null
    createdAt: Date
  }>) => ({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: new Date(),
    biddingEnabled: true,
    stripeCustomerId: 'cus_123',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }),

  auction: (overrides?: Partial<{
    id: string
    listingId: string
    startingPrice: number
    currentBid: Prisma.Decimal | null
    bidCount: number
    currency: string
    startTime: Date
    currentEndTime: Date
    originalEndTime: Date
    status: string
    reservePrice: Prisma.Decimal | null
    reserveMet: boolean
    winnerId: string | null
    finalPrice: Prisma.Decimal | null
    buyerFeeAmount: Prisma.Decimal | null
    paymentStatus: PaymentStatus
    paymentDeadline: Date | null
    extensionCount: number
    antiSnipingEnabled: boolean
  }>) => ({
    id: 'auction-123',
    listingId: 'listing-123',
    startingPrice: 1000,
    currentBid: null,
    bidCount: 0,
    currency: 'EUR',
    startTime: new Date('2024-01-01T10:00:00Z'),
    currentEndTime: new Date('2024-01-08T10:00:00Z'),
    originalEndTime: new Date('2024-01-08T10:00:00Z'),
    status: 'ACTIVE',
    reservePrice: null,
    reserveMet: true,
    winnerId: null,
    finalPrice: null,
    buyerFeeAmount: null,
    paymentStatus: 'UNPAID' as PaymentStatus,
    paymentDeadline: null,
    paidAt: null,
    paymentIntentId: null,
    sellerPayoutStatus: null,
    sellerPayoutId: null,
    sellerPaidAt: null,
    extensionCount: 0,
    antiSnipingEnabled: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  listing: (overrides?: Partial<{
    id: string
    sellerId: string
    title: string
    startingPrice: number
    reservePrice: Prisma.Decimal | null
    currency: string
    status: string
  }>) => ({
    id: 'listing-123',
    sellerId: 'seller-123',
    title: 'Vintage Car',
    description: 'A beautiful vintage car',
    category: 'VEHICLES',
    condition: 'EXCELLENT',
    startingPrice: 1000,
    reservePrice: null,
    currency: 'EUR',
    year: 1965,
    make: 'Ford',
    model: 'Mustang',
    locationCountry: 'DE',
    locationCity: 'Berlin',
    locationPostalCode: '10115',
    shippingAvailable: true,
    shippingCost: new Prisma.Decimal(100),
    status: 'APPROVED',
    submittedAt: new Date('2024-01-01'),
    reviewedAt: new Date('2024-01-01'),
    reviewedById: 'admin-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }),

  bid: (overrides?: Partial<{
    id: string
    auctionId: string
    bidderId: string
    amount: number
    isWinning: boolean
    triggeredExtension: boolean
    ipAddress: string | null
    userAgent: string | null
    createdAt: Date
  }>) => ({
    id: 'bid-123',
    auctionId: 'auction-123',
    bidderId: 'user-123',
    amount: new Prisma.Decimal(1100),
    isWinning: true,
    triggeredExtension: false,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    createdAt: new Date('2024-01-02T10:00:00Z'),
    ...overrides,
  }),

  bidDeposit: (overrides?: Partial<{
    id: string
    userId: string
    auctionId: string
    amount: number
    currency: string
    status: DepositStatus
    stripePaymentIntentId: string
    stripePaymentMethodId: string | null
    heldAt: Date | null
    releasedAt: Date | null
    capturedAt: Date | null
    createdAt: Date
  }>) => ({
    id: 'deposit-123',
    userId: 'user-123',
    auctionId: 'auction-123',
    amount: new Prisma.Decimal(100),
    currency: 'EUR',
    status: DepositStatus.HELD,
    stripePaymentIntentId: 'pi_123',
    stripePaymentMethodId: 'pm_123',
    heldAt: new Date('2024-01-02T10:00:00Z'),
    releasedAt: null,
    capturedAt: null,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
    ...overrides,
  }),

  fraudAlert: (overrides?: Partial<{
    id: string
    userId: string | null
    auctionId: string | null
    bidId: string | null
    alertType: string
    severity: AlertSeverity
    details: object
    status: string
    reviewedById: string | null
    reviewedAt: Date | null
    resolutionNotes: string | null
    createdAt: Date
  }>) => ({
    id: 'alert-123',
    userId: 'user-123',
    auctionId: 'auction-123',
    bidId: 'bid-123',
    alertType: 'SHILL_BIDDING',
    severity: AlertSeverity.HIGH,
    details: {},
    status: 'OPEN',
    reviewedById: null,
    reviewedAt: null,
    resolutionNotes: null,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
    ...overrides,
  }),

  stripeCustomer: (overrides?: Partial<Stripe.Customer>) => ({
    id: 'cus_123',
    object: 'customer',
    email: 'test@example.com',
    name: 'Test User',
    metadata: {},
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  } as Stripe.Customer),

  stripePaymentMethod: (overrides?: Partial<Stripe.PaymentMethod>) => ({
    id: 'pm_123',
    object: 'payment_method',
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  } as Stripe.PaymentMethod),

  stripePaymentIntent: (overrides?: Partial<Stripe.PaymentIntent>) => ({
    id: 'pi_123',
    object: 'payment_intent',
    amount: 10000,
    currency: 'eur',
    status: 'requires_capture',
    client_secret: 'pi_123_secret_abc',
    metadata: {},
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  } as Stripe.PaymentIntent),

  stripeSetupIntent: (overrides?: Partial<Stripe.SetupIntent>) => ({
    id: 'seti_123',
    object: 'setup_intent',
    client_secret: 'seti_123_secret_abc',
    status: 'requires_payment_method',
    usage: 'off_session',
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  } as Stripe.SetupIntent),
}

/**
 * Time utilities for testing
 */
export const timeUtils = {
  now: () => new Date('2024-01-05T12:00:00Z'),

  addMinutes: (date: Date, minutes: number) => {
    const result = new Date(date)
    result.setMinutes(result.getMinutes() + minutes)
    return result
  },

  addDays: (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  addHours: (date: Date, hours: number) => {
    const result = new Date(date)
    result.setHours(result.getHours() + hours)
    return result
  },
}
