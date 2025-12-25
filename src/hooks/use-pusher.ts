'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Pusher, { Channel } from 'pusher-js'
import { CHANNELS, EVENTS, type NewBidEvent, type AuctionExtendedEvent, type AuctionEndedEvent } from '@/lib/pusher'

// Singleton Pusher instance
let pusherInstance: Pusher | null = null

function getPusherInstance(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })
  }
  return pusherInstance
}

/**
 * Hook for subscribing to auction real-time updates
 */
export function useAuctionUpdates(
  auctionId: string | null,
  callbacks: {
    onNewBid?: (data: NewBidEvent) => void
    onExtended?: (data: AuctionExtendedEvent) => void
    onEnded?: (data: AuctionEndedEvent) => void
  }
) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<Channel | null>(null)

  useEffect(() => {
    if (!auctionId) return

    const pusher = getPusherInstance()
    const channelName = CHANNELS.auction(auctionId)
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true)
    })

    channel.bind('pusher:subscription_error', () => {
      setIsConnected(false)
    })

    // Bind event handlers
    if (callbacks.onNewBid) {
      channel.bind(EVENTS.NEW_BID, callbacks.onNewBid)
    }
    if (callbacks.onExtended) {
      channel.bind(EVENTS.AUCTION_EXTENDED, callbacks.onExtended)
    }
    if (callbacks.onEnded) {
      channel.bind(EVENTS.AUCTION_ENDED, callbacks.onEnded)
    }

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [auctionId, callbacks.onNewBid, callbacks.onExtended, callbacks.onEnded])

  return { isConnected }
}

/**
 * Hook for user-specific bid notifications (requires auth)
 */
export function useUserBidNotifications(
  userId: string | null,
  callbacks: {
    onOutbid?: (data: { auctionId: string; listingTitle: string; newBidAmount: number; yourBidAmount: number }) => void
    onWinning?: (data: { auctionId: string; amount: number }) => void
  }
) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<Channel | null>(null)

  useEffect(() => {
    if (!userId) return

    const pusher = getPusherInstance()
    const channelName = CHANNELS.userBids(userId)
    const channel = pusher.subscribe(channelName)
    channelRef.current = channel

    channel.bind('pusher:subscription_succeeded', () => {
      setIsConnected(true)
    })

    channel.bind('pusher:subscription_error', () => {
      setIsConnected(false)
    })

    if (callbacks.onOutbid) {
      channel.bind(EVENTS.OUTBID, callbacks.onOutbid)
    }
    if (callbacks.onWinning) {
      channel.bind(EVENTS.WINNING, callbacks.onWinning)
    }

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [userId, callbacks.onOutbid, callbacks.onWinning])

  return { isConnected }
}

/**
 * Hook for countdown timer with real-time sync
 */
export function useAuctionTimer(endTime: Date | string | null, onEnd?: () => void) {
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [isEnded, setIsEnded] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const endTimeRef = useRef<Date | null>(null)

  const updateEndTime = useCallback((newEndTime: Date | string) => {
    endTimeRef.current = new Date(newEndTime)
    setIsEnded(false)
  }, [])

  useEffect(() => {
    if (!endTime) return
    endTimeRef.current = new Date(endTime)
  }, [endTime])

  useEffect(() => {
    if (!endTimeRef.current) return

    const updateTimer = () => {
      const now = new Date()
      const diff = endTimeRef.current!.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining('Ended')
        setIsEnded(true)
        setSeconds(0)
        onEnd?.()
        return
      }

      const totalSeconds = Math.floor(diff / 1000)
      setSeconds(totalSeconds)

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${secs}s`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${secs}s`)
      } else {
        setTimeRemaining(`${secs}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [onEnd])

  return { timeRemaining, isEnded, seconds, updateEndTime }
}
