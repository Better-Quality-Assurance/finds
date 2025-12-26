import type { ListingStatus } from '@prisma/client'

/**
 * ListingStatusValidator
 *
 * Centralizes all listing status validation logic.
 * This ensures consistency across the application and makes
 * it easier to add new statuses or modify status rules.
 */
export class ListingStatusValidator {
  /**
   * Check if a listing can be edited in its current status.
   * Only DRAFT and CHANGES_REQUESTED listings can be modified.
   */
  isEditable(status: ListingStatus): boolean {
    return status === 'DRAFT' || status === 'CHANGES_REQUESTED'
  }

  /**
   * Check if a listing is currently under review by moderators.
   */
  isUnderReview(status: ListingStatus): boolean {
    return status === 'PENDING_REVIEW'
  }

  /**
   * Check if a listing has been approved by moderators.
   */
  isApproved(status: ListingStatus): boolean {
    return status === 'APPROVED'
  }

  /**
   * Check if a listing has been rejected by moderators.
   */
  isRejected(status: ListingStatus): boolean {
    return status === 'REJECTED'
  }

  /**
   * Check if a listing can be submitted for review.
   * Only DRAFT and CHANGES_REQUESTED listings can be submitted.
   */
  canSubmitForReview(status: ListingStatus): boolean {
    return status === 'DRAFT' || status === 'CHANGES_REQUESTED'
  }

  /**
   * Check if a listing is in a terminal state (cannot be changed).
   * Terminal states: REJECTED, SOLD, WITHDRAWN, EXPIRED
   */
  isTerminal(status: ListingStatus): boolean {
    return (
      status === 'REJECTED' ||
      status === 'SOLD' ||
      status === 'WITHDRAWN' ||
      status === 'EXPIRED'
    )
  }

  /**
   * Check if a listing is active (currently available for auction).
   */
  isActive(status: ListingStatus): boolean {
    return status === 'ACTIVE'
  }

  /**
   * Check if changes can be requested for this listing.
   * Only PENDING_REVIEW listings can have changes requested.
   */
  canRequestChanges(status: ListingStatus): boolean {
    return status === 'PENDING_REVIEW'
  }

  /**
   * Check if a listing can be approved.
   * Only PENDING_REVIEW listings can be approved.
   */
  canApprove(status: ListingStatus): boolean {
    return status === 'PENDING_REVIEW'
  }

  /**
   * Check if a listing can be rejected.
   * Only PENDING_REVIEW listings can be rejected.
   */
  canReject(status: ListingStatus): boolean {
    return status === 'PENDING_REVIEW'
  }

  /**
   * Check if a listing can be withdrawn by the seller.
   * Listings can be withdrawn if they're DRAFT, APPROVED, or ACTIVE.
   */
  canWithdraw(status: ListingStatus): boolean {
    return (
      status === 'DRAFT' || status === 'APPROVED' || status === 'ACTIVE'
    )
  }

  /**
   * Get a human-readable description of what actions are allowed for a status.
   */
  getStatusDescription(status: ListingStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'Draft - can be edited and submitted for review'
      case 'PENDING_REVIEW':
        return 'Pending review - waiting for moderator approval'
      case 'CHANGES_REQUESTED':
        return 'Changes requested - can be edited and resubmitted'
      case 'APPROVED':
        return 'Approved - ready to be scheduled for auction'
      case 'REJECTED':
        return 'Rejected - cannot be resubmitted'
      case 'ACTIVE':
        return 'Active - currently in auction'
      case 'SOLD':
        return 'Sold - auction completed successfully'
      case 'WITHDRAWN':
        return 'Withdrawn - removed by seller'
      case 'EXPIRED':
        return 'Expired - auction ended without sale'
      default:
        return 'Unknown status'
    }
  }

  /**
   * Get the next possible statuses from the current status.
   */
  getPossibleTransitions(status: ListingStatus): ListingStatus[] {
    switch (status) {
      case 'DRAFT':
        return ['PENDING_REVIEW', 'WITHDRAWN']
      case 'PENDING_REVIEW':
        return ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']
      case 'CHANGES_REQUESTED':
        return ['PENDING_REVIEW', 'WITHDRAWN']
      case 'APPROVED':
        return ['ACTIVE', 'WITHDRAWN']
      case 'ACTIVE':
        return ['SOLD', 'EXPIRED', 'WITHDRAWN']
      case 'REJECTED':
      case 'SOLD':
      case 'WITHDRAWN':
      case 'EXPIRED':
        return [] // Terminal states
      default:
        return []
    }
  }

  /**
   * Validate if a status transition is allowed.
   */
  canTransitionTo(
    currentStatus: ListingStatus,
    targetStatus: ListingStatus
  ): boolean {
    const possibleTransitions = this.getPossibleTransitions(currentStatus)
    return possibleTransitions.includes(targetStatus)
  }
}

// Export a singleton instance for convenience
export const listingStatusValidator = new ListingStatusValidator()
