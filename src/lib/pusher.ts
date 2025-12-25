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
}

// Event payload types
export type NewBidEvent = {
  bidId: string
  auctionId: string
  amount: number
  bidderName: string | null
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

// Broadcast functions

/**
 * Broadcast a new bid to all viewers of an auction
 */
export async function broadcastNewBid(data: NewBidEvent) {
  await pusher.trigger(CHANNELS.auction(data.auctionId), EVENTS.NEW_BID, data)
}

/**
 * Broadcast auction time extension
 */
export async function broadcastAuctionExtended(data: AuctionExtendedEvent) {
  await pusher.trigger(CHANNELS.auction(data.auctionId), EVENTS.AUCTION_EXTENDED, data)
}

/**
 * Broadcast auction ended
 */
export async function broadcastAuctionEnded(data: AuctionEndedEvent) {
  await pusher.trigger(CHANNELS.auction(data.auctionId), EVENTS.AUCTION_ENDED, data)
}

/**
 * Notify a user they've been outbid (private channel)
 */
export async function notifyOutbid(userId: string, data: OutbidEvent) {
  await pusher.trigger(CHANNELS.userBids(userId), EVENTS.OUTBID, data)
}

/**
 * Notify a user they're winning (private channel)
 */
export async function notifyWinning(userId: string, data: { auctionId: string; amount: number }) {
  await pusher.trigger(CHANNELS.userBids(userId), EVENTS.WINNING, data)
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
