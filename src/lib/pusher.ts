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
  NEW_COMMENT: 'new-comment',
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

export type NewCommentEvent = {
  commentId: string
  auctionId: string
  listingId: string
  content: string
  authorName: string | null
  authorImage: string | null
  timestamp: string
  parentId: string | null
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
 * Channel authorization result
 */
export type ChannelAuthResult =
  | { authorized: true; response: Pusher.AuthResponse }
  | { authorized: false; reason: string }

/**
 * Authenticate a user for private channels
 * Returns null if not authorized
 *
 * Security: Verifies user has legitimate access to channel
 */
export function authenticateChannel(
  socketId: string,
  channelName: string,
  userId: string
): Pusher.AuthResponse | null {
  // Verify user has access to this channel
  if (channelName.startsWith('private-user-')) {
    // User notification channels: private-user-{userId}-notifications
    const channelUserId = channelName.split('-')[2]
    if (channelUserId !== userId) {
      return null
    }
  }

  // Conversation channels require async DB check - done separately
  // See authenticateConversationChannel for conversation access
  if (channelName.startsWith('private-conversation-')) {
    // Conversation channel authorization is handled by authenticateConversationChannel
    // which must be called before this function
    // If we get here without prior verification, deny access
    return null
  }

  return pusher.authorizeChannel(socketId, channelName)
}

/**
 * Verify user can access a conversation channel
 * Must be called before authenticateChannel for conversation channels
 */
export async function verifyConversationAccess(
  conversationId: string,
  userId: string
): Promise<boolean> {
  // Import prisma dynamically to avoid circular dependency
  const { prisma } = await import('@/lib/db')

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      buyerId: true,
      sellerId: true,
      listingId: true,
    },
  })

  if (!conversation) {
    return false
  }

  // User must be participant in conversation
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return false
  }

  // Additional check: payment must be complete for messaging
  const { canSeeContactDetails } = await import('@/services/contact-authorization.service')
  const paymentComplete = await canSeeContactDetails(conversation.buyerId, conversation.listingId)

  return paymentComplete
}

/**
 * Authenticate user for conversation channel (async version)
 */
export async function authenticateConversationChannel(
  socketId: string,
  channelName: string,
  userId: string
): Promise<Pusher.AuthResponse | null> {
  if (!channelName.startsWith('private-conversation-')) {
    return null
  }

  const conversationId = channelName.replace('private-conversation-', '')
  const hasAccess = await verifyConversationAccess(conversationId, userId)

  if (!hasAccess) {
    return null
  }

  return pusher.authorizeChannel(socketId, channelName)
}
