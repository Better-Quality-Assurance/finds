'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuctionUpdates, useAuctionTimer } from '@/hooks/use-pusher'
import type { NewBidEvent, AuctionExtendedEvent, AuctionEndedEvent } from '@/lib/pusher'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

/**
 * Auction state managed by the hook
 */
export type AuctionState = {
  id: string
  currentBid: number | null
  bidCount: number
  currentEndTime: string
  reserveMet: boolean
  extensionCount: number
  status: string
  listing: {
    startingPrice: number
    reservePrice: number | null
    currency: string
    sellerId: string
  }
}

/**
 * Bid entry in the history
 */
export type BidEntry = {
  id: string
  amount: number
  createdAt: string
  bidder: { id: string; name: string | null }
}

/**
 * Options for configuring real-time behavior
 */
export type UseAuctionRealtimeOptions = {
  /** Show toast notifications for bid events */
  showToasts?: boolean
  /** Callback when a new bid is received */
  onNewBid?: (data: NewBidEvent) => void
  /** Callback when auction is extended */
  onExtended?: (data: AuctionExtendedEvent) => void
  /** Callback when auction ends */
  onEnded?: (data: AuctionEndedEvent) => void
  /** Callback when timer expires */
  onTimerEnd?: () => void
}

/**
 * Custom hook that manages auction real-time state and Pusher subscriptions
 *
 * Consolidates:
 * - Auction state (current bid, bid count, end time, reserve status, etc.)
 * - Bid history
 * - Pusher channel subscription and event handling
 * - Countdown timer with extension support
 * - Automatic cleanup on unmount
 *
 * @param initialAuction - Initial auction data from server
 * @param initialBids - Initial bid history from server
 * @param options - Configuration options
 * @returns Auction state, bid list, timer info, and state updaters
 */
export function useAuctionRealtime(
  initialAuction: AuctionState,
  initialBids: BidEntry[],
  options: UseAuctionRealtimeOptions = {}
) {
  const { showToasts = true, onNewBid, onExtended, onEnded, onTimerEnd } = options

  // State management
  const [auction, setAuction] = useState<AuctionState>(initialAuction)
  const [bids, setBids] = useState<BidEntry[]>(initialBids)

  const currency = auction.listing.currency

  // Timer hook
  const { timeRemaining, isEnded, seconds, updateEndTime } = useAuctionTimer(
    auction.currentEndTime,
    () => {
      // Timer expired - mark auction as ended
      setAuction((prev) => ({ ...prev, status: 'ENDED' }))
      onTimerEnd?.()
    }
  )

  // Handler for new bid events
  const handleNewBid = useCallback(
    (data: NewBidEvent) => {
      // Update auction state
      setAuction((prev) => ({
        ...prev,
        currentBid: data.amount,
        bidCount: data.bidCount,
        reserveMet: data.isReserveMet,
      }))

      // Add bid to history at the top
      setBids((prev) => [
        {
          id: data.bidId,
          amount: data.amount,
          createdAt: data.timestamp,
          bidder: { id: '', name: data.bidderName },
        },
        ...prev,
      ])

      // Show notification
      if (showToasts) {
        toast.info(`New bid: ${formatCurrency(data.amount, currency)}`)
      }

      // Call custom callback
      onNewBid?.(data)
    },
    [currency, showToasts, onNewBid]
  )

  // Handler for auction extension events
  const handleExtended = useCallback(
    (data: AuctionExtendedEvent) => {
      // Update end time in timer
      updateEndTime(data.newEndTime)

      // Update auction state
      setAuction((prev) => ({
        ...prev,
        currentEndTime: data.newEndTime,
        extensionCount: data.extensionCount,
      }))

      // Show notification
      if (showToasts) {
        toast.info('Auction extended by 2 minutes!')
      }

      // Call custom callback
      onExtended?.(data)
    },
    [updateEndTime, showToasts, onExtended]
  )

  // Handler for auction ended events
  const handleEnded = useCallback(
    (data: AuctionEndedEvent) => {
      // Update auction status
      setAuction((prev) => ({
        ...prev,
        status: data.status,
      }))

      // Call custom callback
      onEnded?.(data)
    },
    [onEnded]
  )

  // Subscribe to Pusher updates
  useAuctionUpdates(auction.id, {
    onNewBid: handleNewBid,
    onExtended: handleExtended,
    onEnded: handleEnded,
  })

  // Manual state updater for optimistic updates (e.g., after placing bid)
  const updateAuctionState = useCallback(
    (updates: Partial<AuctionState>) => {
      setAuction((prev) => ({ ...prev, ...updates }))

      // If end time changed, sync timer
      if (updates.currentEndTime) {
        updateEndTime(updates.currentEndTime)
      }
    },
    [updateEndTime]
  )

  // Clear bid input helper (used by parent component)
  const clearBidInput = useCallback(() => {
    // This is handled by the parent component state
    // Included here for API completeness
  }, [])

  return {
    // Current state
    auction,
    bids,

    // Timer state
    timeRemaining,
    isEnded,
    seconds,

    // Computed values
    isEndingSoon: seconds > 0 && seconds < 120, // Last 2 minutes
    isActive: auction.status === 'ACTIVE' && !isEnded,

    // State updaters
    updateAuctionState,
    updateEndTime,
    clearBidInput,

    // Direct state setters (for advanced use cases)
    setAuction,
    setBids,
  }
}
