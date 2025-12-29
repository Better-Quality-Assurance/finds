// Pusher server-side client for real-time updates
import Pusher from 'pusher'

// Server-side Pusher instance
export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

// Channel naming conventions
export const CHANNELS = {
  public: 'public',
  auction: (auctionId: string) => `auction-${auctionId}`,
  userBids: (userId: string) => `private-user-${userId}-bids`,
  userNotifications: (userId: string) => `private-user-${userId}-notifications`,
}

// Event types
export const EVENTS = {
  NEW_BID: 'new-bid',
  AUCTION_EXTENDED: 'auction-extended',
  AUCTION_ENDED: 'auction-ended',
  AUCTION_STARTED: 'auction-started',
  OUTBID: 'outbid',
  WINNING: 'winning',
  AUCTION_STARTING: 'auction-starting',
  RESERVE_MET: 'reserve-met',
  WATCHLIST_COUNT_UPDATED: 'watchlist-count-updated',
}

// Event payload types
export type NewBidEvent = {
  bidId: string
  auctionId: string
  amount: number
  bidderNumber: number
  bidderCountry: string | null
  bidCount: number
  timestamp: string
  isReserveMet: boolean
}

export type AuctionExtendedEvent = {
  auctionId: string
  newEndTime: string
  extensionCount: number
  triggeredByBidId: string
}

export type AuctionEndedEvent = {
  auctionId: string
  status: 'SOLD' | 'NO_SALE' | 'CANCELLED'
  finalPrice: number | null
  winnerId: string | null
}

export type OutbidEvent = {
  auctionId: string
  listingTitle: string
  newBidAmount: number
  yourBidAmount: number
}

export type WatchlistCountUpdatedEvent = {
  auctionId: string
  watchlistCount: number
}

/**
 * Get Pusher server instance
 * Use this for low-level Pusher operations if needed
 * For business logic, use notification.service.ts instead
 */
export function getPusherServer() {
  return pusher
}

/**
 * Authenticate a user for private channels
 */
export function authenticateChannel(
  socketId: string,
  channelName: string,
  userId: string
): Pusher.AuthResponse | null {
  // Verify user has access to this channel
  if (channelName.startsWith('private-user-')) {
    const channelUserId = channelName.split('-')[2]
    if (channelUserId !== userId) {
      return null
    }
  }

  return pusher.authorizeChannel(socketId, channelName)
}
