// Seller Payout Service - handles seller payouts via Stripe Connect
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import {
  ISellerPayoutService,
  PayoutResult,
  SellerPayoutStatus,
} from './contracts/payment.interface'
import { paymentLogger, logError } from '@/lib/logger'

export class SellerPayoutService implements ISellerPayoutService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly stripe: Stripe
  ) {}

  /**
   * Create seller payout after buyer payment is confirmed
   * Calculates seller proceeds (hammer price - platform fees if any)
   * and transfers to seller's Stripe Connect account
   */
  async createSellerPayout(auctionId: string): Promise<PayoutResult> {
    try {
      // Get auction with all details
      const auction = await this.prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  stripeConnectAccountId: true,
                  payoutEnabled: true,
                },
              },
            },
          },
        },
      })

      if (!auction) {
        return { success: false, error: 'Auction not found' }
      }

      // Verify auction is sold and paid
      if (auction.status !== 'SOLD') {
        return { success: false, error: 'Auction is not sold' }
      }

      if (auction.paymentStatus !== 'PAID') {
        return { success: false, error: 'Buyer payment not confirmed' }
      }

      // Check if payout already exists
      if (
        auction.sellerPayoutStatus === 'completed' ||
        auction.sellerPayoutStatus === 'processing'
      ) {
        return {
          success: false,
          error: `Payout already ${auction.sellerPayoutStatus}`,
          payoutId: auction.sellerPayoutId || undefined,
        }
      }

      // Verify seller has Connect account
      if (!auction.listing.seller.stripeConnectAccountId) {
        return { success: false, error: 'Seller has no Connect account' }
      }

      if (!auction.listing.seller.payoutEnabled) {
        return { success: false, error: 'Seller payouts not enabled' }
      }

      // Verify final price exists
      if (!auction.finalPrice) {
        return { success: false, error: 'Auction has no final price' }
      }

      // Calculate seller payout amount
      // For now, seller receives the full hammer price (finalPrice)
      // In the future, you might deduct platform commission here
      const hammerPrice = Number(auction.finalPrice)
      const platformFeeRate = 0.0 // 0% for now - adjust as needed
      const platformFee = hammerPrice * platformFeeRate
      const sellerPayout = hammerPrice - platformFee

      // Convert to cents
      const payoutAmountCents = Math.round(sellerPayout * 100)

      if (payoutAmountCents <= 0) {
        return { success: false, error: 'Invalid payout amount' }
      }

      // Mark payout as processing
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: {
          sellerPayoutStatus: 'processing',
          sellerPayoutAmount: sellerPayout,
        },
      })

      try {
        // Create transfer to seller's Connect account
        const transfer = await this.stripe.transfers.create({
          amount: payoutAmountCents,
          currency: auction.currency.toLowerCase(),
          destination: auction.listing.seller.stripeConnectAccountId,
          description: `Payout for auction ${auctionId}: ${auction.listing.title}`,
          metadata: {
            auctionId,
            sellerId: auction.listing.seller.id,
            listingId: auction.listingId,
            hammerPrice: hammerPrice.toString(),
            platformFee: platformFee.toString(),
            sellerPayout: sellerPayout.toString(),
          },
        })

        // Update auction with successful payout
        await this.prisma.auction.update({
          where: { id: auctionId },
          data: {
            sellerPayoutStatus: 'completed',
            sellerPayoutId: transfer.id,
            sellerPayoutAmount: sellerPayout,
            sellerPaidAt: new Date(),
          },
        })

        // Log audit trail
        await this.prisma.auditLog.create({
          data: {
            actorId: 'system',
            action: 'seller_payout.created',
            resourceType: 'auction',
            resourceId: auctionId,
            severity: 'MEDIUM',
            status: 'SUCCESS',
            details: {
              transferId: transfer.id,
              sellerId: auction.listing.seller.id,
              amount: sellerPayout,
              currency: auction.currency,
              hammerPrice,
              platformFee,
            },
          },
        })

        return {
          success: true,
          payoutId: transfer.id,
          amount: sellerPayout,
        }
      } catch (transferError) {
        logError(
          paymentLogger,
          'Failed to create transfer',
          transferError,
          { auctionId, sellerId: auction.listing.seller.id, sellerPayout }
        )

        // Mark payout as failed
        await this.prisma.auction.update({
          where: { id: auctionId },
          data: {
            sellerPayoutStatus: 'failed',
          },
        })

        // Log failure
        await this.prisma.auditLog.create({
          data: {
            actorId: 'system',
            action: 'seller_payout.failed',
            resourceType: 'auction',
            resourceId: auctionId,
            severity: 'HIGH',
            status: 'FAILURE',
            errorMessage:
              transferError instanceof Error ? transferError.message : 'Transfer failed',
            details: {
              sellerId: auction.listing.seller.id,
              amount: sellerPayout,
              currency: auction.currency,
            },
          },
        })

        return {
          success: false,
          error:
            transferError instanceof Error
              ? transferError.message
              : 'Failed to create transfer',
        }
      }
    } catch (error) {
      logError(
        paymentLogger,
        'Failed to create seller payout',
        error,
        { auctionId }
      )

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get seller payout status for an auction
   */
  async getSellerPayoutStatus(auctionId: string): Promise<SellerPayoutStatus> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: {
        sellerPayoutStatus: true,
        sellerPayoutId: true,
        sellerPayoutAmount: true,
        sellerPaidAt: true,
      },
    })

    if (!auction) {
      throw new Error('Auction not found')
    }

    return {
      status: auction.sellerPayoutStatus,
      payoutId: auction.sellerPayoutId,
      amount: auction.sellerPayoutAmount ? Number(auction.sellerPayoutAmount) : null,
      paidAt: auction.sellerPaidAt,
    }
  }

  /**
   * Retry failed seller payout
   */
  async retrySellerPayout(auctionId: string): Promise<PayoutResult> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { sellerPayoutStatus: true },
    })

    if (!auction) {
      return { success: false, error: 'Auction not found' }
    }

    if (auction.sellerPayoutStatus !== 'failed') {
      return { success: false, error: 'Can only retry failed payouts' }
    }

    // Reset status and retry
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        sellerPayoutStatus: 'pending',
        sellerPayoutId: null,
      },
    })

    return this.createSellerPayout(auctionId)
  }
}

// Factory function for creating seller payout service with default dependencies
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'

export function createSellerPayoutService(): SellerPayoutService {
  return new SellerPayoutService(prisma, getStripe())
}

// Default instance for backward compatibility
const sellerPayoutService = createSellerPayoutService()

// Export individual functions for backward compatibility
export const createSellerPayout = (auctionId: string) =>
  sellerPayoutService.createSellerPayout(auctionId)

export const getSellerPayoutStatus = (auctionId: string) =>
  sellerPayoutService.getSellerPayoutStatus(auctionId)

export const retrySellerPayout = (auctionId: string) =>
  sellerPayoutService.retrySellerPayout(auctionId)
