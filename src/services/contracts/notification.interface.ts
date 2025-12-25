import { NotificationType, NotificationPayload } from '../notification.service'

/**
 * Interface for notification service
 * Handles real-time notifications via Pusher and user notifications
 */
export interface INotificationService {
  /**
   * Send notification to a specific user
   */
  sendUserNotification(userId: string, notification: NotificationPayload): Promise<void>

  /**
   * Broadcast to public channel
   */
  broadcastPublic(event: string, data: Record<string, unknown>): Promise<void>

  /**
   * Notify seller that their listing was approved
   */
  notifyListingApproved(
    sellerId: string,
    listingId: string,
    listingTitle: string,
    auctionId: string,
    auctionEndTime: Date
  ): Promise<void>

  /**
   * Notify seller that their listing was rejected
   */
  notifyListingRejected(
    sellerId: string,
    listingId: string,
    listingTitle: string,
    reason: string
  ): Promise<void>

  /**
   * Notify seller that changes are requested on their listing
   */
  notifyListingChangesRequested(
    sellerId: string,
    listingId: string,
    listingTitle: string,
    changes: string[]
  ): Promise<void>

  /**
   * Broadcast new auction going live to all users
   */
  broadcastAuctionLive(
    auctionId: string,
    listingTitle: string,
    startingPrice: number,
    currency: string,
    endTime: Date,
    imageUrl?: string
  ): Promise<void>

  /**
   * Notify all users watching an auction that it's ending soon
   */
  notifyAuctionEndingSoon(auctionId: string): Promise<void>

  /**
   * Notify winner that they won the auction
   */
  notifyAuctionWon(
    winnerId: string,
    auctionId: string,
    listingTitle: string,
    finalPrice: number,
    currency: string
  ): Promise<void>

  /**
   * Notify bidders who lost the auction
   */
  notifyAuctionLost(
    auctionId: string,
    listingTitle: string,
    excludeWinnerId?: string
  ): Promise<void>

  /**
   * Notify watchers about a new bid on an auction they're watching
   */
  notifyWatchersNewBid(
    auctionId: string,
    bidAmount: number,
    currency: string,
    bidderName: string | null
  ): Promise<void>

  /**
   * Notify watchers about an auction ending
   */
  notifyWatchersAuctionEnded(
    auctionId: string,
    finalPrice: number | null,
    currency: string,
    status: 'SOLD' | 'NO_SALE'
  ): Promise<void>

  /**
   * Notify watchers about an auction ending soon (1 hour warning)
   */
  notifyWatchersAuctionEndingSoon(
    auctionId: string,
    minutesRemaining: number
  ): Promise<void>
}
