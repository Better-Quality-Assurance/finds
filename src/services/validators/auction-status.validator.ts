import type { AuctionStatus } from '@prisma/client'

/**
 * AuctionStatusValidator
 *
 * Centralizes all auction status validation logic.
 * This ensures consistency across the application and makes
 * it easier to add new statuses or modify status rules.
 */
export class AuctionStatusValidator {
  /**
   * Check if an auction is currently active and accepting bids.
   * Both ACTIVE and EXTENDED statuses allow bidding.
   */
  isActive(status: AuctionStatus): boolean {
    return status === 'ACTIVE' || status === 'EXTENDED'
  }

  /**
   * Check if bids can be placed on this auction.
   * Same as isActive - bids are only allowed on ACTIVE or EXTENDED auctions.
   */
  canPlaceBid(status: AuctionStatus): boolean {
    return this.isActive(status)
  }

  /**
   * Check if an auction has ended (completed or terminated).
   */
  isEnded(status: AuctionStatus): boolean {
    return (
      status === 'ENDED' ||
      status === 'SOLD' ||
      status === 'NO_SALE' ||
      status === 'CANCELLED'
    )
  }

  /**
   * Check if an auction is scheduled but hasn't started yet.
   */
  isScheduled(status: AuctionStatus): boolean {
    return status === 'SCHEDULED'
  }

  /**
   * Check if an auction is in extended time due to anti-sniping.
   */
  isExtended(status: AuctionStatus): boolean {
    return status === 'EXTENDED'
  }

  /**
   * Check if an auction was successfully sold.
   */
  isSold(status: AuctionStatus): boolean {
    return status === 'SOLD'
  }

  /**
   * Check if an auction ended without a sale.
   */
  isNoSale(status: AuctionStatus): boolean {
    return status === 'NO_SALE'
  }

  /**
   * Check if an auction was cancelled.
   */
  isCancelled(status: AuctionStatus): boolean {
    return status === 'CANCELLED'
  }

  /**
   * Check if an auction is in a terminal state (cannot be changed).
   */
  isTerminal(status: AuctionStatus): boolean {
    return (
      status === 'SOLD' || status === 'NO_SALE' || status === 'CANCELLED'
    )
  }

  /**
   * Check if an auction can be cancelled.
   * Only SCHEDULED and ACTIVE auctions can be cancelled.
   */
  canCancel(status: AuctionStatus): boolean {
    return status === 'SCHEDULED' || status === 'ACTIVE'
  }

  /**
   * Check if an auction can be extended (anti-sniping).
   * Only ACTIVE or EXTENDED auctions can be extended further.
   */
  canExtend(status: AuctionStatus): boolean {
    return status === 'ACTIVE' || status === 'EXTENDED'
  }

  /**
   * Check if an auction can be started.
   * Only SCHEDULED auctions can be started.
   */
  canStart(status: AuctionStatus): boolean {
    return status === 'SCHEDULED'
  }

  /**
   * Check if an auction can transition to ENDED status.
   * ACTIVE and EXTENDED auctions can end.
   */
  canEnd(status: AuctionStatus): boolean {
    return status === 'ACTIVE' || status === 'EXTENDED'
  }

  /**
   * Check if payment can be processed for this auction.
   * Payment is only processed for ENDED or SOLD auctions.
   */
  canProcessPayment(status: AuctionStatus): boolean {
    return status === 'ENDED' || status === 'SOLD'
  }

  /**
   * Check if the auction is awaiting payment.
   * ENDED status means auction completed but payment not yet confirmed.
   */
  isAwaitingPayment(status: AuctionStatus): boolean {
    return status === 'ENDED'
  }

  /**
   * Get a human-readable description of what actions are allowed for a status.
   */
  getStatusDescription(status: AuctionStatus): string {
    switch (status) {
      case 'SCHEDULED':
        return 'Scheduled - auction will start at scheduled time'
      case 'ACTIVE':
        return 'Active - auction is live and accepting bids'
      case 'EXTENDED':
        return 'Extended - auction time extended due to late bid (anti-sniping)'
      case 'ENDED':
        return 'Ended - auction completed, awaiting payment confirmation'
      case 'SOLD':
        return 'Sold - auction completed and payment confirmed'
      case 'NO_SALE':
        return 'No sale - auction ended without meeting reserve or no bids'
      case 'CANCELLED':
        return 'Cancelled - auction was terminated before completion'
      default:
        return 'Unknown status'
    }
  }

  /**
   * Get the next possible statuses from the current status.
   */
  getPossibleTransitions(status: AuctionStatus): AuctionStatus[] {
    switch (status) {
      case 'SCHEDULED':
        return ['ACTIVE', 'CANCELLED']
      case 'ACTIVE':
        return ['EXTENDED', 'ENDED', 'CANCELLED']
      case 'EXTENDED':
        return ['ENDED', 'CANCELLED']
      case 'ENDED':
        return ['SOLD', 'NO_SALE']
      case 'SOLD':
      case 'NO_SALE':
      case 'CANCELLED':
        return [] // Terminal states
      default:
        return []
    }
  }

  /**
   * Validate if a status transition is allowed.
   */
  canTransitionTo(
    currentStatus: AuctionStatus,
    targetStatus: AuctionStatus
  ): boolean {
    const possibleTransitions = this.getPossibleTransitions(currentStatus)
    return possibleTransitions.includes(targetStatus)
  }

  /**
   * Get the reason why a status transition is not allowed.
   */
  getTransitionError(
    currentStatus: AuctionStatus,
    targetStatus: AuctionStatus
  ): string | null {
    if (this.canTransitionTo(currentStatus, targetStatus)) {
      return null
    }

    if (this.isTerminal(currentStatus)) {
      return `Cannot transition from ${currentStatus} - auction has ended`
    }

    return `Invalid transition from ${currentStatus} to ${targetStatus}`
  }
}

// Export a singleton instance for convenience
export const auctionStatusValidator = new AuctionStatusValidator()
