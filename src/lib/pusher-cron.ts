// Pusher broadcast functions for cron jobs
// These are separated from the main pusher.ts to include event types specific to cron operations

import { pusher, CHANNELS, EVENTS } from '@/lib/pusher'
import type { AuctionEndedEvent } from '@/lib/pusher'

/**
 * Event payload for auction starting
 */
export type AuctionStartingEvent = {
  auctionId: string
  listingId: string
  listingTitle: string
  startingPrice: number
  currentEndTime: string
}

/**
 * Event payload for winner notification
 */
export type WinnerNotificationEvent = {
  auctionId: string
  listingTitle: string
  finalPrice: number
  buyerFee: number
}

/**
 * Event payload for watchlist notifications
 */
export type WatchlistNotificationEvent = {
  auctionId: string
  listingTitle: string
  status: 'SOLD' | 'NO_SALE' | 'CANCELLED'
  finalPrice: number | null
}

/**
 * Broadcast auction starting event to the public auction channel
 * Called when a scheduled auction becomes active
 */
export async function broadcastAuctionStarting(data: AuctionStartingEvent) {
  await pusher.trigger(
    CHANNELS.auction(data.auctionId),
    EVENTS.AUCTION_STARTING,
    data
  )
}

/**
 * Broadcast auction ended event to the public auction channel
 * Called when an active auction expires
 */
export async function broadcastAuctionEnded(data: AuctionEndedEvent) {
  await pusher.trigger(
    CHANNELS.auction(data.auctionId),
    EVENTS.AUCTION_ENDED,
    data
  )
}

/**
 * Notify winner via private channel
 * Called when an auction ends with a winning bid
 */
export async function notifyWinner(userId: string, data: WinnerNotificationEvent) {
  await pusher.trigger(
    CHANNELS.userNotifications(userId),
    'auction-won',
    data
  )
}

/**
 * Notify multiple watchlist users about auction ending
 * Called when an auction ends to notify all users watching it
 */
export async function notifyWatchlistUsers(
  userIds: string[],
  data: WatchlistNotificationEvent
) {
  // Batch notify all watchlist users
  // Pusher supports batching up to 10 channels, so we'll send individually for simplicity
  const promises = userIds.map(userId =>
    pusher.trigger(
      CHANNELS.userNotifications(userId),
      'watchlist-ended',
      data
    )
  )

  await Promise.allSettled(promises)
}
