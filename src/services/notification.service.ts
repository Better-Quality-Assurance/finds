// Notification Service - handles sending notifications to users
import { INotificationTransport } from './contracts/notification-transport.interface'
import { createNotificationTransport } from './pusher-notification-transport'
import { EVENTS } from '@/lib/pusher'
import { prisma } from '@/lib/db'

export type NotificationType =
  | 'AUCTION_STARTED'
  | 'AUCTION_ENDING_SOON'
  | 'OUTBID'
  | 'AUCTION_WON'
  | 'AUCTION_LOST'
  | 'LISTING_APPROVED'
  | 'LISTING_REJECTED'
  | 'LISTING_CHANGES_REQUESTED'
  | 'WATCHLIST_NEW_BID'
  | 'WATCHLIST_AUCTION_ENDED'

export type NotificationPayload = {
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  link?: string
}

/**
 * Notification transport instance
 * Uses dependency inversion - service depends on interface, not concrete implementation
 */
let transport: INotificationTransport = createNotificationTransport()

/**
 * Set custom notification transport (for testing or alternative implementations)
 * @param customTransport - Transport implementation
 */
export function setNotificationTransport(customTransport: INotificationTransport): void {
  transport = customTransport
}

/**
 * Send notification to a specific user via configured transport
 */
export async function sendUserNotification(
  userId: string,
  notification: NotificationPayload
): Promise<void> {
  try {
    await transport.sendToUser(
      userId,
      'notification',
      {
        ...notification,
        timestamp: new Date().toISOString(),
      }
    )
    console.log(`Notification sent to user ${userId}: ${notification.type}`)
  } catch (error) {
    console.error(`Failed to send notification to user ${userId}:`, error)
  }
}

/**
 * Broadcast to public channel (for new auctions, etc.)
 */
export async function broadcastPublic(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    await transport.send('public', event, data)
    console.log(`Public broadcast: ${event}`)
  } catch (error) {
    console.error(`Failed to broadcast public event ${event}:`, error)
  }
}

/**
 * Notify seller that their listing was approved and auction is live
 */
export async function notifyListingApproved(
  sellerId: string,
  listingId: string,
  listingTitle: string,
  auctionId: string,
  auctionEndTime: Date
): Promise<void> {
  await sendUserNotification(sellerId, {
    type: 'LISTING_APPROVED',
    title: 'Listing Approved!',
    message: `Your listing "${listingTitle}" has been approved and the auction is now live. Ends ${formatDate(auctionEndTime)}`,
    data: {
      listingId,
      auctionId,
      auctionEndTime: auctionEndTime.toISOString(),
    },
    link: `/auctions/${auctionId}`,
  })
}

/**
 * Notify seller that their listing was rejected
 */
export async function notifyListingRejected(
  sellerId: string,
  listingId: string,
  listingTitle: string,
  reason: string
): Promise<void> {
  await sendUserNotification(sellerId, {
    type: 'LISTING_REJECTED',
    title: 'Listing Rejected',
    message: `Your listing "${listingTitle}" was not approved. Reason: ${reason}`,
    data: {
      listingId,
      reason,
    },
    link: `/seller/listings/${listingId}`,
  })
}

/**
 * Notify seller that changes are requested on their listing
 */
export async function notifyListingChangesRequested(
  sellerId: string,
  listingId: string,
  listingTitle: string,
  changes: string[]
): Promise<void> {
  await sendUserNotification(sellerId, {
    type: 'LISTING_CHANGES_REQUESTED',
    title: 'Changes Requested',
    message: `Please make the following changes to "${listingTitle}": ${changes.join(', ')}`,
    data: {
      listingId,
      changes,
    },
    link: `/seller/listings/${listingId}`,
  })
}

/**
 * Broadcast new auction going live to all users
 */
export async function broadcastAuctionLive(
  auctionId: string,
  listingTitle: string,
  startingPrice: number,
  currency: string,
  endTime: Date,
  imageUrl?: string
): Promise<void> {
  await broadcastPublic(EVENTS.AUCTION_STARTING, {
    auctionId,
    listingTitle,
    startingPrice,
    currency,
    endTime: endTime.toISOString(),
    imageUrl,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Notify all users watching an auction that it's ending soon
 */
export async function notifyAuctionEndingSoon(auctionId: string): Promise<void> {
  try {
    // Get all users watching this auction
    const watchers = await prisma.watchlist.findMany({
      where: {
        auctionId,
        notifyOnEnd: true,
      },
      include: {
        auction: {
          include: {
            listing: true,
          },
        },
      },
    })

    // Send notification to each watcher
    for (const watch of watchers) {
      await sendUserNotification(watch.userId, {
        type: 'AUCTION_ENDING_SOON',
        title: 'Auction Ending Soon',
        message: `"${watch.auction.listing.title}" is ending soon!`,
        data: {
          auctionId,
          endTime: watch.auction.currentEndTime.toISOString(),
        },
        link: `/auctions/${auctionId}`,
      })
    }

    console.log(`Notified ${watchers.length} watchers about auction ${auctionId} ending soon`)
  } catch (error) {
    console.error(`Failed to notify watchers for auction ${auctionId}:`, error)
  }
}

/**
 * Notify winner that they won the auction
 */
export async function notifyAuctionWon(
  winnerId: string,
  auctionId: string,
  listingTitle: string,
  finalPrice: number,
  currency: string
): Promise<void> {
  await sendUserNotification(winnerId, {
    type: 'AUCTION_WON',
    title: 'Congratulations! You Won!',
    message: `You won "${listingTitle}" for ${currency} ${finalPrice.toLocaleString()}. Please complete payment within 5 business days.`,
    data: {
      auctionId,
      finalPrice,
      currency,
    },
    link: `/auctions/${auctionId}/checkout`,
  })
}

/**
 * Notify bidders who lost the auction
 */
export async function notifyAuctionLost(
  auctionId: string,
  listingTitle: string,
  excludeWinnerId?: string
): Promise<void> {
  try {
    // Get all bidders except the winner
    const bids = await prisma.bid.findMany({
      where: {
        auctionId,
        ...(excludeWinnerId && { bidderId: { not: excludeWinnerId } }),
      },
      distinct: ['bidderId'],
      select: { bidderId: true },
    })

    // Send notification to each losing bidder
    for (const bid of bids) {
      await sendUserNotification(bid.bidderId, {
        type: 'AUCTION_LOST',
        title: 'Auction Ended',
        message: `The auction for "${listingTitle}" has ended. Better luck next time!`,
        data: {
          auctionId,
        },
        link: `/auctions/${auctionId}`,
      })
    }

    console.log(`Notified ${bids.length} losing bidders for auction ${auctionId}`)
  } catch (error) {
    console.error(`Failed to notify losing bidders for auction ${auctionId}:`, error)
  }
}

/**
 * Notify watchers about a new bid on an auction they're watching
 */
export async function notifyWatchersNewBid(
  auctionId: string,
  bidAmount: number,
  currency: string,
  bidderName: string | null
): Promise<void> {
  try {
    // Get all users watching this auction with notifyOnBid enabled
    const watchers = await prisma.watchlist.findMany({
      where: {
        auctionId,
        notifyOnBid: true,
      },
      select: {
        userId: true,
        auction: {
          select: {
            listing: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (watchers.length === 0) {
      return
    }

    const listingTitle = watchers[0]?.auction.listing.title || 'Auction'

    // Send notification to each watcher in parallel for better performance
    const notificationPromises = watchers.map(watcher =>
      sendUserNotification(watcher.userId, {
        type: 'WATCHLIST_NEW_BID',
        title: 'New Bid on Watched Auction',
        message: `${bidderName || 'Someone'} placed a bid of ${currency} ${bidAmount.toLocaleString()} on "${listingTitle}"`,
        data: {
          auctionId,
          bidAmount,
          currency,
          bidderName,
        },
        link: `/auctions/${auctionId}`,
      }).catch(error => {
        // Log error but don't throw - we don't want one failed notification to stop others
        console.error(`Failed to notify watcher ${watcher.userId}:`, error)
      })
    )

    await Promise.allSettled(notificationPromises)
    console.log(`Notified ${watchers.length} watchers about new bid on auction ${auctionId}`)
  } catch (error) {
    // Don't throw - this shouldn't block bid placement
    console.error(`Failed to notify watchers for new bid on auction ${auctionId}:`, error)
  }
}

/**
 * Notify watchers about an auction ending (called from endAuction)
 */
export async function notifyWatchersAuctionEnded(
  auctionId: string,
  finalPrice: number | null,
  currency: string,
  status: 'SOLD' | 'NO_SALE'
): Promise<void> {
  try {
    // Get all users watching this auction with notifyOnEnd enabled
    const watchers = await prisma.watchlist.findMany({
      where: {
        auctionId,
        notifyOnEnd: true,
      },
      select: {
        userId: true,
        auction: {
          select: {
            listing: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (watchers.length === 0) {
      return
    }

    const listingTitle = watchers[0]?.auction.listing.title || 'Auction'

    // Determine message based on status
    const message = status === 'SOLD' && finalPrice
      ? `"${listingTitle}" sold for ${currency} ${finalPrice.toLocaleString()}`
      : `"${listingTitle}" ended with no sale`

    // Send notification to each watcher in parallel
    const notificationPromises = watchers.map(watcher =>
      sendUserNotification(watcher.userId, {
        type: 'WATCHLIST_AUCTION_ENDED',
        title: 'Watched Auction Ended',
        message,
        data: {
          auctionId,
          finalPrice,
          currency,
          status,
        },
        link: `/auctions/${auctionId}`,
      }).catch(error => {
        console.error(`Failed to notify watcher ${watcher.userId}:`, error)
      })
    )

    await Promise.allSettled(notificationPromises)
    console.log(`Notified ${watchers.length} watchers about auction ${auctionId} ending`)
  } catch (error) {
    // Don't throw - this shouldn't block auction ending
    console.error(`Failed to notify watchers for auction ${auctionId} ending:`, error)
  }
}

/**
 * Notify watchers about an auction ending soon (1 hour warning)
 */
export async function notifyWatchersAuctionEndingSoon(
  auctionId: string,
  minutesRemaining: number
): Promise<void> {
  try {
    // Get all users watching this auction with notifyOnEnd enabled
    const watchers = await prisma.watchlist.findMany({
      where: {
        auctionId,
        notifyOnEnd: true,
      },
      select: {
        userId: true,
        auction: {
          select: {
            currentBid: true,
            currency: true,
            listing: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    if (watchers.length === 0) {
      return
    }

    const auction = watchers[0]?.auction
    const listingTitle = auction?.listing.title || 'Auction'
    const currentBid = auction?.currentBid ? Number(auction.currentBid) : null
    const currency = auction?.currency || 'EUR'

    const bidInfo = currentBid
      ? ` Current bid: ${currency} ${currentBid.toLocaleString()}`
      : ''

    // Send notification to each watcher in parallel
    const notificationPromises = watchers.map(watcher =>
      sendUserNotification(watcher.userId, {
        type: 'AUCTION_ENDING_SOON',
        title: 'Watched Auction Ending Soon',
        message: `"${listingTitle}" is ending in ${minutesRemaining} minutes!${bidInfo}`,
        data: {
          auctionId,
          minutesRemaining,
          currentBid,
          currency,
        },
        link: `/auctions/${auctionId}`,
      }).catch(error => {
        console.error(`Failed to notify watcher ${watcher.userId}:`, error)
      })
    )

    await Promise.allSettled(notificationPromises)
    console.log(`Notified ${watchers.length} watchers about auction ${auctionId} ending soon`)
  } catch (error) {
    console.error(`Failed to notify watchers for auction ${auctionId} ending soon:`, error)
  }
}

/**
 * Helper function to format date in human-readable format
 */
function formatDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `in ${days}d ${hours}h`
  }
  if (hours > 0) {
    return `in ${hours}h`
  }
  return 'soon'
}
