'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { CHANNELS, EVENTS, type NewBidEvent, type NewCommentEvent } from '@/lib/pusher'
import { usePusherClient } from './use-pusher'

export interface Comment {
  id: string
  content: string
  createdAt: string
  isHidden: boolean
  isPinned: boolean
  author: {
    id: string
    name: string | null
    image: string | null
    createdAt: string
  }
  replies?: Comment[]
}

export interface BidEntry {
  id: string
  amount: number
  createdAt: string
  bidderNumber: number
  bidderCountry: string | null
}

export type ActivityEntry =
  | { type: 'comment'; data: Comment; timestamp: Date }
  | { type: 'bid'; data: BidEntry; timestamp: Date }

type ActivityTimelineState = {
  comments: Comment[]
  bids: BidEntry[]
  isLoading: boolean
  error: string | null
}

/**
 * Hook for fetching and managing the activity timeline (comments + bids)
 * Handles real-time updates via Pusher
 */
export function useActivityTimeline(auctionId: string, listingId: string) {
  const [state, setState] = useState<ActivityTimelineState>({
    comments: [],
    bids: [],
    isLoading: true,
    error: null,
  })

  const pusher = usePusherClient()

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}/comments`)
      if (!response.ok) {
        throw new Error('Failed to load comments')
      }
      const data = await response.json()
      setState((prev) => ({ ...prev, comments: data.comments || [] }))
    } catch (err) {
      console.error('Error fetching comments:', err)
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load comments',
      }))
    }
  }, [listingId])

  // Fetch bids
  const fetchBids = useCallback(async () => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids?limit=50`)
      if (!response.ok) {
        throw new Error('Failed to load bids')
      }
      const data = await response.json()
      setState((prev) => ({ ...prev, bids: data.bids || [] }))
    } catch (err) {
      console.error('Error fetching bids:', err)
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load bids',
      }))
    }
  }, [auctionId])

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      await Promise.all([fetchComments(), fetchBids()])
      setState((prev) => ({ ...prev, isLoading: false }))
    }

    fetchData()
  }, [fetchComments, fetchBids])

  // Real-time updates
  useEffect(() => {
    if (!pusher || !auctionId) {return}

    const channel = pusher.subscribe(CHANNELS.auction(auctionId))

    // Handle new bid events
    const handleNewBid = (data: NewBidEvent) => {
      const newBid: BidEntry = {
        id: data.bidId,
        amount: data.amount,
        createdAt: data.timestamp,
        bidderNumber: data.bidderNumber,
        bidderCountry: data.bidderCountry,
      }
      setState((prev) => ({ ...prev, bids: [newBid, ...prev.bids] }))
    }

    // Handle new comment events
    const handleNewComment = (data: NewCommentEvent) => {
      if (!data.parentId) {
        // Top-level comment
        const newComment: Comment = {
          id: data.commentId,
          content: data.content,
          createdAt: data.timestamp,
          isHidden: false,
          isPinned: false,
          author: {
            id: '',
            name: data.authorName,
            image: data.authorImage,
            createdAt: data.timestamp,
          },
          replies: [],
        }
        setState((prev) => ({ ...prev, comments: [newComment, ...prev.comments] }))
      } else {
        // Reply - refresh to get nested structure
        fetchComments()
      }
    }

    channel.bind(EVENTS.NEW_BID, handleNewBid)
    channel.bind(EVENTS.NEW_COMMENT, handleNewComment)

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(CHANNELS.auction(auctionId))
    }
  }, [pusher, auctionId, fetchComments])

  // Merge and sort activities
  const activities: ActivityEntry[] = useMemo(() => {
    const commentActivities: ActivityEntry[] = state.comments.map((comment) => ({
      type: 'comment' as const,
      data: comment,
      timestamp: new Date(comment.createdAt),
    }))

    const bidActivities: ActivityEntry[] = state.bids.map((bid) => ({
      type: 'bid' as const,
      data: bid,
      timestamp: new Date(bid.createdAt),
    }))

    return [...commentActivities, ...bidActivities].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
  }, [state.comments, state.bids])

  return {
    activities,
    comments: state.comments,
    bids: state.bids,
    isLoading: state.isLoading,
    error: state.error,
    refetchComments: fetchComments,
    refetchBids: fetchBids,
  }
}
