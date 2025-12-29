// Bid Deposit Service - handles bid deposit management
import { PrismaClient, BidDeposit } from '@prisma/client'
import { calculateDepositAmount, DEPOSIT_CONFIG } from '@/lib/stripe'
import {
  IBidDepositService,
  DepositResult,
  BiddingEligibility,
  SetupIntent,
} from './contracts/payment.interface'
import { IPaymentProcessor } from './contracts/payment-processor.interface'
import { paymentLogger, logError } from '@/lib/logger'

export class DepositService implements IBidDepositService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paymentProcessor: IPaymentProcessor
  ) {}

  /**
   * Enable bidding for a user (after they add a payment method)
   */
  async enableBidding(userId: string): Promise<{ id: string; biddingEnabled: boolean }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { biddingEnabled: true },
      select: { id: true, biddingEnabled: true },
    })
    return user
  }

  /**
   * Set up Stripe customer and return SetupIntent for adding card
   */
  async setupBiddingPayment(user: {
    id: string
    email: string
    name: string | null
  }): Promise<SetupIntent> {
    // Get or create customer
    const existingCustomers = await this.paymentProcessor.listCustomersByEmail(user.email)
    let customer = existingCustomers.length > 0 ? existingCustomers[0] : null

    if (!customer) {
      customer = await this.paymentProcessor.createCustomer({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      })
    }

    // Update user with customer ID if needed
    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    })

    // Create SetupIntent for saving card
    const setupIntent = await this.paymentProcessor.createSetupIntent(customer.id)

    return {
      customerId: customer.id,
      clientSecret: setupIntent.clientSecret!,
    }
  }

  /**
   * Check if user has valid bidding eligibility
   */
  async checkBiddingEligibility(userId: string): Promise<BiddingEligibility> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        biddingEnabled: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return {
        eligible: false,
        reason: 'User not found',
        hasPaymentMethod: false,
        stripeCustomerId: null,
      }
    }

    if (!user.emailVerified) {
      return {
        eligible: false,
        reason: 'Email not verified',
        hasPaymentMethod: false,
        stripeCustomerId: user.stripeCustomerId,
      }
    }

    if (!user.stripeCustomerId) {
      return {
        eligible: false,
        reason: 'No payment method on file',
        hasPaymentMethod: false,
        stripeCustomerId: null,
      }
    }

    // Check for valid payment method
    const paymentMethod = await this.paymentProcessor.getDefaultPaymentMethod(user.stripeCustomerId)
    if (!paymentMethod) {
      return {
        eligible: false,
        reason: 'No valid payment method',
        hasPaymentMethod: false,
        stripeCustomerId: user.stripeCustomerId,
      }
    }

    return {
      eligible: true,
      hasPaymentMethod: true,
      stripeCustomerId: user.stripeCustomerId,
    }
  }

  /**
   * Create or update a bid deposit for an auction
   */
  async createBidDeposit(params: {
    userId: string
    auctionId: string
    bidAmount: number
  }): Promise<DepositResult> {
    const { userId, auctionId, bidAmount } = params

    // Check eligibility
    const eligibility = await this.checkBiddingEligibility(userId)
    if (!eligibility.eligible) {
      return { success: false, error: eligibility.reason }
    }

    // Check for existing held deposit for this auction
    const existingDeposit = await this.prisma.bidDeposit.findFirst({
      where: {
        userId,
        auctionId,
        status: 'HELD',
      },
    })

    if (existingDeposit) {
      // Already have a valid deposit for this auction
      return { success: true, deposit: existingDeposit }
    }

    // Calculate deposit amount
    const depositAmount = calculateDepositAmount(bidAmount)

    // Get payment method
    const paymentMethod = await this.paymentProcessor.getDefaultPaymentMethod(eligibility.stripeCustomerId!)
    if (!paymentMethod) {
      return { success: false, error: 'No valid payment method' }
    }

    try {
      // Create payment intent with hold
      const paymentIntent = await this.paymentProcessor.createPaymentIntent({
        amount: depositAmount,
        currency: DEPOSIT_CONFIG.CURRENCY,
        customerId: eligibility.stripeCustomerId!,
        paymentMethodId: paymentMethod.id,
        captureMethod: 'manual',
        confirm: true,
        offSession: true,
        metadata: {
          type: 'bid_deposit',
          auctionId,
          userId,
        },
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/account/bids`,
      })

      // Check if action is required (3D Secure, etc.)
      if (
        paymentIntent.status === 'requires_action' ||
        paymentIntent.status === 'requires_confirmation'
      ) {
        // Create pending deposit record
        const deposit = await this.prisma.bidDeposit.create({
          data: {
            userId,
            auctionId,
            amount: depositAmount / 100, // Convert cents to currency
            currency: DEPOSIT_CONFIG.CURRENCY.toUpperCase(),
            stripePaymentIntentId: paymentIntent.id,
            stripePaymentMethodId: paymentMethod.id,
            status: 'PENDING',
          },
        })

        return {
          success: false,
          deposit,
          requiresAction: true,
          clientSecret: paymentIntent.clientSecret!,
        }
      }

      // Payment hold successful
      if (paymentIntent.status === 'requires_capture') {
        const deposit = await this.prisma.bidDeposit.create({
          data: {
            userId,
            auctionId,
            amount: depositAmount / 100,
            currency: DEPOSIT_CONFIG.CURRENCY.toUpperCase(),
            stripePaymentIntentId: paymentIntent.id,
            stripePaymentMethodId: paymentMethod.id,
            status: 'HELD',
            heldAt: new Date(),
          },
        })

        return { success: true, deposit }
      }

      return {
        success: false,
        error: `Unexpected payment status: ${paymentIntent.status}`,
      }
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to create bid deposit',
        error,
        { userId, auctionId, depositAmount }
      )

      // Record failed deposit attempt
      await this.prisma.bidDeposit.create({
        data: {
          userId,
          auctionId,
          amount: depositAmount / 100,
          currency: DEPOSIT_CONFIG.CURRENCY.toUpperCase(),
          stripePaymentIntentId: 'failed',
          status: 'FAILED',
        },
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process deposit',
      }
    }
  }

  /**
   * Confirm a pending deposit after 3D Secure authentication
   */
  async confirmDeposit(depositId: string): Promise<DepositResult> {
    const deposit = await this.prisma.bidDeposit.findUnique({
      where: { id: depositId },
    })

    if (!deposit) {
      return { success: false, error: 'Deposit not found' }
    }

    if (deposit.status !== 'PENDING') {
      return { success: false, error: 'Deposit is not pending' }
    }

    try {
      // Check payment intent status
      const paymentIntent = await this.paymentProcessor.retrievePaymentIntent(
        deposit.stripePaymentIntentId
      )

      if (paymentIntent.status === 'requires_capture') {
        // Update deposit status
        const updatedDeposit = await this.prisma.bidDeposit.update({
          where: { id: depositId },
          data: {
            status: 'HELD',
            heldAt: new Date(),
          },
        })

        return { success: true, deposit: updatedDeposit }
      }

      return {
        success: false,
        error: `Payment not ready: ${paymentIntent.status}`,
      }
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to confirm deposit',
        error,
        { depositId }
      )
      return { success: false, error: 'Failed to confirm deposit' }
    }
  }

  /**
   * Release a deposit when user is outbid or auction ends without winning
   */
  async releaseBidDeposit(depositId: string): Promise<boolean> {
    const deposit = await this.prisma.bidDeposit.findUnique({
      where: { id: depositId },
    })

    if (!deposit || deposit.status !== 'HELD') {
      return false
    }

    try {
      // Cancel the payment intent to release the hold
      await this.paymentProcessor.releasePayment(deposit.stripePaymentIntentId)

      // Update deposit status
      await this.prisma.bidDeposit.update({
        where: { id: depositId },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      })

      paymentLogger.info({ depositId }, 'Deposit released successfully')
      return true
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to release deposit',
        error,
        { depositId }
      )
      return false
    }
  }

  /**
   * Capture a deposit when auction is won (for forfeiture on default)
   */
  async captureBidDeposit(depositId: string): Promise<boolean> {
    const deposit = await this.prisma.bidDeposit.findUnique({
      where: { id: depositId },
    })

    if (!deposit || deposit.status !== 'HELD') {
      return false
    }

    try {
      // Capture the held funds
      await this.paymentProcessor.capturePayment(deposit.stripePaymentIntentId)

      // Update deposit status
      await this.prisma.bidDeposit.update({
        where: { id: depositId },
        data: {
          status: 'CAPTURED',
          capturedAt: new Date(),
        },
      })

      paymentLogger.info({ depositId }, 'Deposit captured successfully')
      return true
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to capture deposit',
        error,
        { depositId }
      )
      return false
    }
  }

  /**
   * Release all deposits for an auction except the winner's
   */
  async releaseNonWinningDeposits(
    auctionId: string,
    winnerId?: string
  ): Promise<number> {
    const deposits = await this.prisma.bidDeposit.findMany({
      where: {
        auctionId,
        status: 'HELD',
        userId: winnerId ? { not: winnerId } : undefined,
      },
    })

    let releasedCount = 0
    for (const deposit of deposits) {
      const released = await this.releaseBidDeposit(deposit.id)
      if (released) {releasedCount++}
    }

    return releasedCount
  }

  /**
   * Get user's active deposits
   */
  async getUserDeposits(userId: string): Promise<BidDeposit[]> {
    return this.prisma.bidDeposit.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'HELD'] },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get deposit for a specific auction
   */
  async getAuctionDeposit(
    userId: string,
    auctionId: string
  ): Promise<BidDeposit | null> {
    return this.prisma.bidDeposit.findFirst({
      where: {
        userId,
        auctionId,
        status: { in: ['PENDING', 'HELD'] },
      },
    })
  }

  /**
   * Check if user has sufficient deposit for auction
   */
  async hasValidDeposit(userId: string, auctionId: string): Promise<boolean> {
    const deposit = await this.getAuctionDeposit(userId, auctionId)
    return deposit?.status === 'HELD'
  }
}

// Factory function for creating deposit service with default dependencies
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { createStripePaymentProcessor } from './stripe-payment-processor'

export function createDepositService(paymentProcessor?: IPaymentProcessor): DepositService {
  const processor = paymentProcessor || createStripePaymentProcessor(getStripe())
  return new DepositService(prisma, processor)
}

// Default instance for backward compatibility
const depositService = createDepositService()

// Export individual functions for backward compatibility
export const enableBidding = (userId: string) =>
  depositService.enableBidding(userId)

export const setupBiddingPayment = (user: {
  id: string
  email: string
  name: string | null
}) => depositService.setupBiddingPayment(user)

export const checkBiddingEligibility = (userId: string) =>
  depositService.checkBiddingEligibility(userId)

export const createBidDeposit = (params: {
  userId: string
  auctionId: string
  bidAmount: number
}) => depositService.createBidDeposit(params)

export const confirmDeposit = (depositId: string) =>
  depositService.confirmDeposit(depositId)

export const releaseBidDeposit = (depositId: string) =>
  depositService.releaseBidDeposit(depositId)

export const captureBidDeposit = (depositId: string) =>
  depositService.captureBidDeposit(depositId)

export const releaseNonWinningDeposits = (auctionId: string, winnerId?: string) =>
  depositService.releaseNonWinningDeposits(auctionId, winnerId)

export const getUserDeposits = (userId: string) =>
  depositService.getUserDeposits(userId)

export const getAuctionDeposit = (userId: string, auctionId: string) =>
  depositService.getAuctionDeposit(userId, auctionId)

export const hasValidDeposit = (userId: string, auctionId: string) =>
  depositService.hasValidDeposit(userId, auctionId)
