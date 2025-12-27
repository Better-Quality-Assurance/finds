/**
 * Auction Business Configuration
 *
 * Centralized configuration for auction-related business rules.
 * All values can be overridden via environment variables.
 *
 * Note: This complements domain/auction/rules.ts which contains
 * the core business logic. This file is for values that may need
 * to be adjusted per deployment environment.
 */

const AUCTION_CONFIG_VALUES = {
  // Buyer fee configuration
  buyerFeePercent: parseFloat(process.env.BUYER_FEE_PERCENT || '5'),
  minBuyerFee: parseInt(process.env.MIN_BUYER_FEE || '0', 10),
  maxBuyerFee: parseInt(process.env.MAX_BUYER_FEE || '999999', 10),

  // Anti-sniping configuration
  antiSnipingWindowMinutes: parseInt(
    process.env.ANTI_SNIPING_WINDOW || '2',
    10
  ),
  antiSnipingExtensionMinutes: parseInt(
    process.env.ANTI_SNIPING_EXTENSION || '2',
    10
  ),
  maxExtensions: parseInt(process.env.ANTI_SNIPING_MAX_EXTENSIONS || '10', 10),

  // Auction duration
  defaultDurationDays: parseInt(process.env.AUCTION_DEFAULT_DURATION || '7', 10),
  minDurationDays: parseInt(process.env.AUCTION_MIN_DURATION || '3', 10),
  maxDurationDays: parseInt(process.env.AUCTION_MAX_DURATION || '14', 10),

  // Bidding increments
  minBidIncrementPercent: parseFloat(
    process.env.MIN_BID_INCREMENT_PERCENT || '1'
  ),
  minBidIncrementAmount: parseInt(
    process.env.MIN_BID_INCREMENT_AMOUNT || '10',
    10
  ),

  // Payment deadlines
  paymentDeadlineDays: parseInt(process.env.PAYMENT_DEADLINE_DAYS || '5', 10),
} as const

/**
 * Calculate buyer fee with configured limits
 */
function calculateBuyerFee(hammerPrice: number): number {
  const feeAmount =
    Math.round(hammerPrice * (AUCTION_CONFIG_VALUES.buyerFeePercent / 100) * 100) / 100

  // Apply min/max limits if configured
  if (AUCTION_CONFIG_VALUES.minBuyerFee > 0 && feeAmount < AUCTION_CONFIG_VALUES.minBuyerFee) {
    return AUCTION_CONFIG_VALUES.minBuyerFee
  }

  if (
    AUCTION_CONFIG_VALUES.maxBuyerFee < 999999 &&
    feeAmount > AUCTION_CONFIG_VALUES.maxBuyerFee
  ) {
    return AUCTION_CONFIG_VALUES.maxBuyerFee
  }

  return feeAmount
}

/**
 * Calculate total buyer pays (hammer price + fee)
 */
function calculateTotalWithFee(hammerPrice: number): number {
  return hammerPrice + calculateBuyerFee(hammerPrice)
}

// Export as a single object with both values and functions
export const AUCTION_CONFIG = {
  ...AUCTION_CONFIG_VALUES,
  calculateBuyerFee,
  calculateTotalWithFee,
}

// Type-safe config export
export type AuctionConfig = typeof AUCTION_CONFIG
