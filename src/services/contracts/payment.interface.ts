import { BidDeposit, PaymentStatus, Auction } from '@prisma/client'
import Stripe from 'stripe'

/**
 * Result of deposit operation
 */
export type DepositResult = {
  success: boolean
  deposit?: BidDeposit
  error?: string
  requiresAction?: boolean
  clientSecret?: string
}

/**
 * Result of payment operation
 */
export type PaymentResult = {
  success: boolean
  paymentIntent?: Stripe.PaymentIntent
  error?: string
  requiresAction?: boolean
  clientSecret?: string
}

/**
 * Result of payout operation
 */
export type PayoutResult = {
  success: boolean
  payoutId?: string
  amount?: number
  error?: string
}

/**
 * Bidding eligibility check result
 */
export type BiddingEligibility = {
  eligible: boolean
  reason?: string
  hasPaymentMethod: boolean
  stripeCustomerId: string | null
}

/**
 * Setup intent for adding payment method
 */
export type SetupIntent = {
  customerId: string
  clientSecret: string
}

/**
 * Payment status details
 */
export type PaymentStatusDetails = {
  status: PaymentStatus
  paidAt: Date | null
  paymentDeadline: Date | null
  totalAmount: number | null
  breakdown: {
    finalPrice: number | null
    buyerFee: number | null
  }
}

/**
 * Seller payout status
 */
export type SellerPayoutStatus = {
  status: string | null
  payoutId: string | null
  amount: number | null
  paidAt: Date | null
}

/**
 * Interface for bid deposit service
 * Handles the deposit lifecycle for bidders
 */
export interface IBidDepositService {
  /**
   * Check if user has valid bidding eligibility
   */
  checkBiddingEligibility(userId: string): Promise<BiddingEligibility>

  /**
   * Enable bidding for a user (after they add a payment method)
   */
  enableBidding(userId: string): Promise<{ id: string; biddingEnabled: boolean }>

  /**
   * Set up Stripe customer and return SetupIntent for adding card
   */
  setupBiddingPayment(user: {
    id: string
    email: string
    name: string | null
  }): Promise<SetupIntent>

  /**
   * Create or update a bid deposit for an auction
   */
  createBidDeposit(params: {
    userId: string
    auctionId: string
    bidAmount: number
  }): Promise<DepositResult>

  /**
   * Confirm a pending deposit after 3D Secure authentication
   */
  confirmDeposit(depositId: string): Promise<DepositResult>

  /**
   * Release a deposit when user is outbid or auction ends without winning
   */
  releaseBidDeposit(depositId: string): Promise<boolean>

  /**
   * Capture a deposit when auction is won (for forfeiture on default)
   */
  captureBidDeposit(depositId: string): Promise<boolean>

  /**
   * Release all deposits for an auction except the winner's
   */
  releaseNonWinningDeposits(auctionId: string, winnerId?: string): Promise<number>

  /**
   * Get user's active deposits
   */
  getUserDeposits(userId: string): Promise<BidDeposit[]>

  /**
   * Get deposit for a specific auction
   */
  getAuctionDeposit(userId: string, auctionId: string): Promise<BidDeposit | null>

  /**
   * Check if user has sufficient deposit for auction
   */
  hasValidDeposit(userId: string, auctionId: string): Promise<boolean>
}

/**
 * Interface for buyer fee service
 * Handles charging buyer fees after auction win
 */
export interface IBuyerFeeService {
  /**
   * Charge buyer fee after auction win
   */
  chargeBuyerFee(auctionId: string, userId: string): Promise<PaymentResult>

  /**
   * Confirm buyer fee payment after 3DS authentication
   */
  confirmBuyerFeePayment(paymentIntentId: string): Promise<PaymentResult>

  /**
   * Get auction payment status
   */
  getAuctionPaymentStatus(auctionId: string): Promise<PaymentStatusDetails>

  /**
   * Set payment deadline when auction ends
   */
  setPaymentDeadline(auctionId: string): Promise<Auction>

  /**
   * Check for overdue payments and handle defaults
   */
  checkOverduePayments(): Promise<string[]>
}

/**
 * Interface for seller payout service
 * Handles transferring funds to sellers via Stripe Connect
 */
export interface ISellerPayoutService {
  /**
   * Create seller payout after buyer payment is confirmed
   */
  createSellerPayout(auctionId: string): Promise<PayoutResult>

  /**
   * Get seller payout status for an auction
   */
  getSellerPayoutStatus(auctionId: string): Promise<SellerPayoutStatus>

  /**
   * Retry failed seller payout
   */
  retrySellerPayout(auctionId: string): Promise<PayoutResult>
}
