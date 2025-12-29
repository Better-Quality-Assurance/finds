'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { AuctionState } from '@/hooks/useAuctionRealtime'

/**
 * Result of a bid submission
 */
export type BidResult = {
  success: boolean
  auction?: {
    currentBid: number
    bidCount: number
    reserveMet: boolean
    currentEndTime: string
  }
  error?: string
}

/**
 * Validation result for bid amount
 */
export type BidValidation = {
  valid: boolean
  error?: string
}

/**
 * Options for configuring bidding behavior
 */
export type UseBiddingOptions = {
  /** Callback when bid is successfully submitted */
  onBidSuccess?: (result: BidResult) => void
  /** Callback when bid submission fails */
  onBidError?: (error: string) => void
  /** Whether to show toast notifications */
  showToasts?: boolean
}

/**
 * Custom hook for managing bidding logic and verification
 *
 * Handles:
 * - Bid amount state and validation
 * - User verification status checking
 * - Bid submission with optimistic updates
 * - Quick bid helpers
 *
 * @param auctionId - The auction ID to bid on
 * @param minimumBid - The minimum valid bid amount
 * @param currency - The currency code (EUR, RON, etc.)
 * @param options - Configuration options
 * @returns Bidding state, handlers, and validators
 */
export function useBidding(
  auctionId: string,
  minimumBid: number,
  currency: string,
  options: UseBiddingOptions = {}
) {
  const { onBidSuccess, onBidError, showToasts = true } = options
  const { data: session } = useSession()

  // Bidding state
  const [bidAmount, setBidAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Verification state
  const [isVerified, setIsVerified] = useState<boolean | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  /**
   * Check user's verification status
   * User must have email verified, phone verified, and bidding enabled
   */
  const checkVerificationStatus = useCallback(async () => {
    if (!session?.user?.id) {
      setIsVerified(null)
      return
    }

    try {
      const res = await fetch('/api/user/verification-status')
      if (res.ok) {
        const data = await res.json()
        // User is verified if all checks pass
        const verified =
          data.emailVerified && data.phoneVerified && data.biddingEnabled
        setIsVerified(verified)
      } else {
        setIsVerified(false)
      }
    } catch (error) {
      console.error('Failed to check verification status:', error)
      setIsVerified(false)
    }
  }, [session?.user?.id])

  /**
   * Check verification status when user logs in
   */
  useEffect(() => {
    checkVerificationStatus()
  }, [checkVerificationStatus])

  /**
   * Validate a bid amount against minimum bid
   */
  const validateBid = useCallback(
    (amount: number): BidValidation => {
      if (isNaN(amount)) {
        return { valid: false, error: 'Invalid bid amount' }
      }

      if (amount < minimumBid) {
        return {
          valid: false,
          error: `Minimum bid is ${formatCurrency(minimumBid, currency)}`,
        }
      }

      return { valid: true }
    },
    [minimumBid, currency]
  )

  /**
   * Submit a bid to the auction
   * Handles authentication, verification, validation, and API submission
   */
  const submitBid = useCallback(
    async (amount: number): Promise<BidResult> => {
      // Check authentication
      if (!session) {
        const error = 'Please log in to place a bid'
        if (showToasts) {toast.error(error)}
        onBidError?.(error)
        return { success: false, error }
      }

      // Check verification status
      if (isVerified === false) {
        setShowVerificationModal(true)
        const error = 'Verification required to place bids'
        return { success: false, error }
      }

      // Validate bid amount
      const validation = validateBid(amount)
      if (!validation.valid) {
        if (showToasts && validation.error) {toast.error(validation.error)}
        onBidError?.(validation.error || 'Invalid bid')
        return { success: false, error: validation.error }
      }

      // Submit bid
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/auctions/${auctionId}/bids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to place bid')
        }

        const result = await response.json()

        if (showToasts) {
          toast.success('Bid placed successfully!')
        }

        onBidSuccess?.(result)

        return {
          success: true,
          auction: result.auction,
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to place bid'

        if (showToasts) {
          toast.error(errorMessage)
        }

        onBidError?.(errorMessage)

        return { success: false, error: errorMessage }
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      session,
      isVerified,
      auctionId,
      validateBid,
      showToasts,
      onBidSuccess,
      onBidError,
    ]
  )

  /**
   * Handle quick bid button click
   * Sets the bid amount input to the specified value
   */
  const handleQuickBid = useCallback((amount: number) => {
    setBidAmount(amount.toString())
  }, [])

  /**
   * Clear the bid amount input
   */
  const clearBidAmount = useCallback(() => {
    setBidAmount('')
  }, [])

  /**
   * Set verification complete (called from verification modal)
   */
  const setVerificationComplete = useCallback(() => {
    setIsVerified(true)
    setShowVerificationModal(false)
    if (showToasts) {
      toast.success('Verification complete! You can now place bids.')
    }
  }, [showToasts])

  return {
    // Bid amount state
    bidAmount,
    setBidAmount,
    clearBidAmount,

    // Submission state
    isSubmitting,

    // Verification state
    isVerified,
    showVerificationModal,
    setShowVerificationModal,
    setVerificationComplete,

    // Actions
    validateBid,
    submitBid,
    handleQuickBid,
    checkVerificationStatus,
  }
}
