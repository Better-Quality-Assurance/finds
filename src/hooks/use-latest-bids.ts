'use client'

import { useEffect, useState, useCallback } from 'react'
import { CHANNELS, EVENTS, type NewBidEvent } from '@/lib/pusher'
import { usePusherClient } from './use-pusher'

export type LatestBid = {
  id: string
  amount: number
  currency: string
  createdAt: string
  bidderNumber: number
  bidderCountry: string | null
  auction: {
    id: string
    currentEndTime: string
    reserveMet: boolean
  }
  listing: {
    id: string
    title: string
    year: number
    make: string
    model: string
    currency: string
    imageUrl: string | null
  }
}

type LatestBidsState = {
  bids: LatestBid[]
  liveAuctionCount: number
  isLoading: boolean
  error: string | null
}

/**
 * Hook for fetching and subscribing to latest bids across all active auctions
 * Uses singleton Pusher instance and subscribes to public channel
 */
export function useLatestBids() {
  const [state, setState] = useState<LatestBidsState>({
    bids: [],
    liveAuctionCount: 0,
    isLoading: true,
    error: null,
  })

  const pusher = usePusherClient()

  const fetchLatestBids = useCallback(async () => {
    try {
      const response = await fetch('/api/home/latest-bids')
      if (!response.ok) {
        throw new Error('Failed to fetch latest bids')
      }
      const data = await response.json()
      setState((prev) => ({
        ...prev,
        bids: data.bids,
        liveAuctionCount: data.liveAuctionCount,
        error: null,
      }))
    } catch (err) {
      console.error('Error fetching latest bids:', err)
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to fetch latest bids',
      }))
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    const load = async () => {
      setState((prev) => ({ ...prev, isLoading: true }))
      await fetchLatestBids()
      setState((prev) => ({ ...prev, isLoading: false }))
    }
    load()
  }, [fetchLatestBids])

  // Subscribe to public channel for real-time updates
  useEffect(() => {
    if (!pusher) {return}

    const channel = pusher.subscribe(CHANNELS.public)

    const handleNewBid = (_data: NewBidEvent) => {
      // Refetch to get full bid details with listing info
      fetchLatestBids()
    }

    channel.bind(EVENTS.NEW_BID, handleNewBid)

    return () => {
      channel.unbind(EVENTS.NEW_BID, handleNewBid)
      pusher.unsubscribe(CHANNELS.public)
    }
  }, [pusher, fetchLatestBids])

  return {
    bids: state.bids,
    liveAuctionCount: state.liveAuctionCount,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchLatestBids,
  }
}
