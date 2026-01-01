// Buyer Fee Service - handles buyer fee charging and payment
import { PrismaClient, PaymentStatus, Auction } from '@prisma/client'
import Stripe from 'stripe'
import { getDefaultPaymentMethod } from '@/lib/stripe'
import { calculatePaymentDeadline } from '@/domain/auction/rules'
import {
  IBuyerFeeService,
  PaymentResult,
  PaymentStatusDetails,
} from './contracts/payment.interface'
import { paymentLogger, logError } from '@/lib/logger'

export class BuyerFeeService implements IBuyerFeeService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripe: Stripe
  ) {}

  /**
   * Charge buyer fee after auction win
   */
  async chargeBuyerFee(auctionId: string, userId: string): Promise<PaymentResult> {
    // Get auction with all details
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        listing: true,
      },
    })

    if (!auction) {
      return { success: false, error: 'Auction not found' }
    }

    // Verify auction is sold
    if (auction.status !== 'SOLD') {
      return { success: false, error: 'Auction is not sold' }
    }

    // Verify user is the winner
    if (auction.winnerId !== userId) {
      return { success: false, error: 'User is not the auction winner' }
    }

    // Verify fee hasn't been paid already
    if (auction.paymentStatus === 'PAID') {
      return { success: false, error: 'Buyer fee already paid' }
    }

    // Verify finalPrice and buyerFeeAmount exist
    if (!auction.finalPrice || !auction.buyerFeeAmount) {
      return { success: false, error: 'Auction pricing not finalized' }
    }

    // Check if payment is past deadline
    if (auction.paymentDeadline && new Date() > auction.paymentDeadline) {
      return { success: false, error: 'Payment deadline has passed' }
    }

    // Get user with Stripe customer
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    })

    if (!user || !user.stripeCustomerId) {
      return { success: false, error: 'User not found or no payment method on file' }
    }

    // Get default payment method
    const paymentMethod = await getDefaultPaymentMethod(user.stripeCustomerId)
    if (!paymentMethod) {
      return { success: false, error: 'No valid payment method found' }
    }

    // Calculate total amount (finalPrice + buyer fee)
    const finalPrice = Number(auction.finalPrice)
    const buyerFee = Number(auction.buyerFeeAmount)
    const totalAmount = finalPrice + buyerFee

    // Convert to cents
    const amountInCents = Math.round(totalAmount * 100)

    try {
      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: auction.currency.toLowerCase(),
        customer: user.stripeCustomerId,
        payment_method: paymentMethod.id,
        confirm: true,
        off_session: true,
        description: `Payment for auction ${auctionId}: ${auction.listing.title}`,
        metadata: {
          type: 'buyer_fee',
          auctionId,
          userId,
          finalPrice: finalPrice.toString(),
          buyerFee: buyerFee.toString(),
          listingId: auction.listingId,
        },
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/purchases`,
      })

      // Check payment status
      if (
        paymentIntent.status === 'requires_action' ||
        paymentIntent.status === 'requires_confirmation'
      ) {
        // Update auction with pending payment
        await this.prisma.auction.update({
          where: { id: auctionId },
          data: {
            paymentStatus: 'PENDING',
            paymentIntentId: paymentIntent.id,
          },
        })

        return {
          success: false,
          paymentIntent,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret!,
          error: 'Payment requires additional authentication',
        }
      }

      if (paymentIntent.status === 'succeeded') {
        // Update auction with successful payment
        await this.prisma.auction.update({
          where: { id: auctionId },
          data: {
            paymentStatus: 'PAID',
            paymentIntentId: paymentIntent.id,
            paidAt: new Date(),
          },
        })

        // Send contact exchange notifications to buyer and seller
        // This is the critical point where contact info is unlocked
        try {
          const { notifyPaymentComplete } = await import('./notification.service')
          await notifyPaymentComplete(auctionId)
        } catch (notifyError) {
          // Don't fail the payment if notification fails
          paymentLogger.error({ auctionId, error: notifyError }, 'Failed to send payment complete notification')
        }

        return { success: true, paymentIntent }
      }

      // Update auction with failed payment
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: {
          paymentStatus: 'FAILED',
          paymentIntentId: paymentIntent.id,
        },
      })

      return { success: false, error: `Payment failed: ${paymentIntent.status}` }
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to charge buyer fee',
        error,
        { auctionId, userId }
      )

      // Update auction payment status
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: { paymentStatus: 'FAILED' },
      })

      // Handle specific Stripe errors
      if (error instanceof Error) {
        if (error.message.includes('authentication_required')) {
          return {
            success: false,
            error: 'Card authentication required. Please use a different payment method.',
          }
        }
        if (error.message.includes('card_declined')) {
          return {
            success: false,
            error: 'Card declined. Please try a different payment method.',
          }
        }
        if (error.message.includes('insufficient_funds')) {
          return {
            success: false,
            error: 'Insufficient funds. Please use a different payment method.',
          }
        }
        return { success: false, error: error.message }
      }

      return { success: false, error: 'Failed to process payment' }
    }
  }

  /**
   * Confirm buyer fee payment after 3DS authentication
   */
  async confirmBuyerFeePayment(paymentIntentId: string): Promise<PaymentResult> {
    try {
      // Retrieve payment intent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

      if (
        !paymentIntent.metadata.auctionId ||
        paymentIntent.metadata.type !== 'buyer_fee'
      ) {
        return { success: false, error: 'Invalid payment intent' }
      }

      const auctionId = paymentIntent.metadata.auctionId

      // Check payment status
      if (paymentIntent.status === 'succeeded') {
        // Update auction
        await this.prisma.auction.update({
          where: { id: auctionId },
          data: {
            paymentStatus: 'PAID',
            paidAt: new Date(),
          },
        })

        // Send contact exchange notifications to buyer and seller
        try {
          const { notifyPaymentComplete } = await import('./notification.service')
          await notifyPaymentComplete(auctionId)
        } catch (notifyError) {
          paymentLogger.error({ auctionId, error: notifyError }, 'Failed to send payment complete notification')
        }

        return { success: true, paymentIntent }
      }

      if (paymentIntent.status === 'requires_payment_method') {
        // Payment failed, needs new payment method
        await this.prisma.auction.update({
          where: { id: auctionId },
          data: { paymentStatus: 'FAILED' },
        })

        return {
          success: false,
          error: 'Payment failed. Please try a different payment method.',
        }
      }

      return { success: false, error: `Payment status: ${paymentIntent.status}` }
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to confirm buyer fee payment',
        error,
        { paymentIntentId }
      )
      return { success: false, error: 'Failed to confirm payment' }
    }
  }

  /**
   * Get auction payment status
   */
  async getAuctionPaymentStatus(auctionId: string): Promise<PaymentStatusDetails> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        paymentStatus: true,
        paidAt: true,
        paymentDeadline: true,
        finalPrice: true,
        buyerFeeAmount: true,
      },
    })

    if (!auction) {
      throw new Error('Auction not found')
    }

    const finalPrice = auction.finalPrice ? Number(auction.finalPrice) : null
    const buyerFee = auction.buyerFeeAmount ? Number(auction.buyerFeeAmount) : null
    const totalAmount = finalPrice && buyerFee ? finalPrice + buyerFee : null

    return {
      status: auction.paymentStatus,
      paidAt: auction.paidAt,
      paymentDeadline: auction.paymentDeadline,
      totalAmount,
      breakdown: {
        finalPrice,
        buyerFee,
      },
    }
  }

  /**
   * Set payment deadline when auction ends
   */
  async setPaymentDeadline(auctionId: string): Promise<Auction> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { currentEndTime: true },
    })

    if (!auction) {
      throw new Error('Auction not found')
    }

    const deadline = calculatePaymentDeadline(auction.currentEndTime)

    return this.prisma.auction.update({
      where: { id: auctionId },
      data: { paymentDeadline: deadline },
    })
  }

  /**
   * Check for overdue payments and handle defaults
   */
  async checkOverduePayments(): Promise<string[]> {
    const now = new Date()

    // Find auctions with overdue payments
    const overdueAuctions = await this.prisma.auction.findMany({
      where: {
        status: 'SOLD',
        paymentStatus: { in: ['UNPAID', 'PENDING'] },
        paymentDeadline: { lte: now },
      },
      select: {
        id: true,
        winnerId: true,
        listing: {
          select: { title: true },
        },
      },
    })

    const overdueIds: string[] = []

    for (const auction of overdueAuctions) {
      // Mark payment as failed
      await this.prisma.auction.update({
        where: { id: auction.id },
        data: { paymentStatus: 'FAILED' },
      })

      // TODO: Capture winning bidder's deposit as forfeit
      // TODO: Notify seller of default
      // TODO: Option to re-list or offer to second highest bidder

      overdueIds.push(auction.id)
    }

    return overdueIds
  }
}

// Factory function for creating buyer fee service with default dependencies
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'

export function createBuyerFeeService(): BuyerFeeService {
  return new BuyerFeeService(prisma, getStripe())
}

// Default instance for backward compatibility
const buyerFeeService = createBuyerFeeService()

// Export individual functions for backward compatibility
export const chargeBuyerFee = (auctionId: string, userId: string) =>
  buyerFeeService.chargeBuyerFee(auctionId, userId)

export const confirmBuyerFeePayment = (paymentIntentId: string) =>
  buyerFeeService.confirmBuyerFeePayment(paymentIntentId)

export const getAuctionPaymentStatus = (auctionId: string) =>
  buyerFeeService.getAuctionPaymentStatus(auctionId)

export const getBuyerFeeStatus = (auctionId: string) =>
  buyerFeeService.getAuctionPaymentStatus(auctionId)

export const setPaymentDeadline = (auctionId: string) =>
  buyerFeeService.setPaymentDeadline(auctionId)

export const checkOverduePayments = () =>
  buyerFeeService.checkOverduePayments()
