// Payment Service - Backward compatibility layer
// This file re-exports from the new focused services for backward compatibility
// All new code should import from the specific service files instead

// ============================================================================
// BID DEPOSIT MANAGEMENT
// ============================================================================
export {
  // Service class
  DepositService,
  createDepositService,
  // Functions
  enableBidding,
  setupBiddingPayment,
  checkBiddingEligibility,
  createBidDeposit,
  confirmDeposit,
  releaseBidDeposit,
  captureBidDeposit,
  releaseNonWinningDeposits,
  getUserDeposits,
  getAuctionDeposit,
  hasValidDeposit,
} from './deposit.service'

// ============================================================================
// BUYER FEE PAYMENT
// ============================================================================
export {
  // Service class
  BuyerFeeService,
  createBuyerFeeService,
  // Functions
  chargeBuyerFee,
  confirmBuyerFeePayment,
  getAuctionPaymentStatus,
  getBuyerFeeStatus,
  setPaymentDeadline,
  checkOverduePayments,
} from './buyer-fee.service'

// ============================================================================
// SELLER PAYOUT
// ============================================================================
export {
  // Service class
  SellerPayoutService,
  createSellerPayoutService,
  // Functions
  createSellerPayout,
  getSellerPayoutStatus,
  retrySellerPayout,
} from './seller-payout.service'

// ============================================================================
// TYPE RE-EXPORTS
// ============================================================================
export type {
  DepositResult,
  PaymentResult,
  PayoutResult,
  BiddingEligibility,
  SetupIntent,
  PaymentStatusDetails,
  SellerPayoutStatus,
} from './contracts/payment.interface'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
import { prisma } from '@/lib/db'

/**
 * Release expired deposits (helper function)
 * This is a batch operation to clean up old deposits
 */
export async function releaseExpiredDeposits(): Promise<number> {
  const expiredDeposits = await prisma.bidDeposit.findMany({
    where: {
      status: 'HELD',
      createdAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
    },
  })

  const { releaseBidDeposit } = await import('./deposit.service')
  let releasedCount = 0
  for (const deposit of expiredDeposits) {
    const released = await releaseBidDeposit(deposit.id)
    if (released) {releasedCount++}
  }

  return releasedCount
}
