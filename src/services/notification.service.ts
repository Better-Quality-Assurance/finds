// Notification Service - handles sending notifications to users
import { INotificationTransport } from './contracts/notification-transport.interface'
import { createNotificationTransport } from './pusher-notification-transport'
import { EVENTS } from '@/lib/pusher'
import { prisma } from '@/lib/db'
import { formatBidderDisplay } from './bidder-number.service'
import * as emailService from '@/lib/email'
import { notificationLogger, logError } from '@/lib/logger'

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
  | 'LICENSE_PLATE_DETECTED'

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
  // Send in-app notification
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

  // Send email notification
  try {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { email: true, name: true },
    })

    if (seller?.email) {
      const auctionUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auctions/${auctionId}`
      await emailService.sendListingApprovedEmail(
        seller.email,
        seller.name || 'Seller',
        listingTitle,
        auctionUrl
      )
    }
  } catch (emailError) {
    console.error('Failed to send listing approved email:', emailError)
    // Don't throw - email failure shouldn't block the notification
  }
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
 * Notify seller that their auction expired without sale
 * Includes top improvement suggestions
 */
export async function notifySellerAuctionExpired(
  sellerId: string,
  auctionId: string,
  listingId: string,
  listingTitle: string,
  reason: 'no_bids' | 'reserve_not_met',
  topSuggestions: string[] = []
): Promise<void> {
  try {
    const reasonText = reason === 'no_bids'
      ? 'received no bids'
      : 'did not meet the reserve price'

    let message = `Your auction "${listingTitle}" ${reasonText}.`

    if (topSuggestions.length > 0) {
      message += ' We have suggestions to help you sell next time.'
    }

    // TODO: Add Notification model to schema to enable in-app notifications
    // await prisma.notification.create({
    //   data: {
    //     userId: sellerId,
    //     type: 'AUCTION_EXPIRED',
    //     title: 'Auction Ended - No Sale',
    //     message,
    //     data: {
    //       auctionId,
    //       listingId,
    //       reason,
    //       topSuggestions,
    //       link: `/account/listings?id=${listingId}`,
    //     },
    //   },
    // })

    // Send real-time notification
    await transport.sendToUser(sellerId, EVENTS.AUCTION_ENDED, {
      type: 'auction_expired',
      auctionId,
      listingId,
      listingTitle,
      reason,
      topSuggestions,
      message,
    })

    notificationLogger.info(
      { sellerId, auctionId, listingId, reason },
      'Notified seller about expired auction'
    )
  } catch (error) {
    logError(notificationLogger, 'Failed to notify seller of expired auction', error, {
      sellerId,
      auctionId,
    })
  }
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
  // Send in-app notification
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

  // Send email notification
  try {
    const winner = await prisma.user.findUnique({
      where: { id: winnerId },
      select: { email: true, name: true },
    })

    if (winner?.email) {
      const checkoutUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auctions/${auctionId}/checkout`
      await emailService.sendAuctionWonEmail(
        winner.email,
        winner.name || 'Winner',
        listingTitle,
        finalPrice,
        currency,
        checkoutUrl
      )
    }
  } catch (emailError) {
    console.error('Failed to send auction won email:', emailError)
    // Don't throw - email failure shouldn't block the notification
  }
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
      select: {
        bidderId: true,
        bidder: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    // Get auction details for email
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      select: { finalPrice: true, currency: true },
    })

    // Send notification to each losing bidder
    for (const bid of bids) {
      // Send in-app notification
      await sendUserNotification(bid.bidderId, {
        type: 'AUCTION_LOST',
        title: 'Auction Ended',
        message: `The auction for "${listingTitle}" has ended. Better luck next time!`,
        data: {
          auctionId,
        },
        link: `/auctions/${auctionId}`,
      })

      // Send email notification
      try {
        if (bid.bidder.email && auction?.finalPrice) {
          await emailService.sendAuctionLostEmail(
            bid.bidder.email,
            bid.bidder.name || 'Bidder',
            listingTitle,
            Number(auction.finalPrice),
            auction.currency
          )
        }
      } catch (emailError) {
        console.error(`Failed to send auction lost email to ${bid.bidderId}:`, emailError)
        // Continue with other bidders even if one email fails
      }
    }

    console.log(`Notified ${bids.length} losing bidders for auction ${auctionId}`)
  } catch (error) {
    console.error(`Failed to notify losing bidders for auction ${auctionId}:`, error)
  }
}

/**
 * Notify watchers about a new bid on an auction they're watching
 * Uses anonymous bidder display (e.g., "Bidder 3 (Romania)")
 */
export async function notifyWatchersNewBid(
  auctionId: string,
  bidAmount: number,
  currency: string,
  bidderNumber: number,
  bidderCountry: string | null
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
    const bidderDisplay = formatBidderDisplay(bidderNumber, bidderCountry)

    // Send notification to each watcher in parallel for better performance
    const notificationPromises = watchers.map(watcher =>
      sendUserNotification(watcher.userId, {
        type: 'WATCHLIST_NEW_BID',
        title: 'New Bid on Watched Auction',
        message: `${bidderDisplay} placed a bid of ${currency} ${bidAmount.toLocaleString()} on "${listingTitle}"`,
        data: {
          auctionId,
          bidAmount,
          currency,
          bidderNumber,
          bidderCountry,
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
 * Notify seller that a license plate was detected and auto-blurred in their listing photo
 */
export async function notifyLicensePlateDetected(
  sellerId: string,
  listingId: string,
  listingTitle: string,
  mediaId: string,
  plateCount: number,
  wasBlurred: boolean
): Promise<void> {
  const action = wasBlurred ? 'automatically blurred' : 'detected'
  const message = wasBlurred
    ? `We detected ${plateCount} license plate${plateCount > 1 ? 's' : ''} in a photo for "${listingTitle}" and automatically blurred ${plateCount > 1 ? 'them' : 'it'} for privacy.`
    : `We detected ${plateCount} license plate${plateCount > 1 ? 's' : ''} in a photo for "${listingTitle}". Please review the image.`

  await sendUserNotification(sellerId, {
    type: 'LICENSE_PLATE_DETECTED',
    title: `License Plate ${wasBlurred ? 'Auto-Blurred' : 'Detected'}`,
    message,
    data: {
      listingId,
      mediaId,
      plateCount,
      wasBlurred,
    },
    link: `/sell/listings/${listingId}`,
  })
}

/**
 * Broadcast a new bid to all viewers of an auction
 * Uses the transport layer to send to auction-specific channel
 */
export async function broadcastNewBid(data: {
  bidId: string
  auctionId: string
  amount: number
  bidderNumber: number
  bidderCountry: string | null
  bidCount: number
  timestamp: string
  isReserveMet: boolean
}): Promise<void> {
  try {
    // Broadcast to auction-specific channel
    await transport.send(`auction-${data.auctionId}`, EVENTS.NEW_BID, data)

    // Also broadcast to public channel for homepage updates
    await transport.send('public', EVENTS.NEW_BID, data)

    console.log(`Broadcast new bid for auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to broadcast new bid for auction ${data.auctionId}:`, error)
  }
}

/**
 * Broadcast auction time extension
 * Notifies all viewers that the auction end time has been extended
 */
export async function broadcastAuctionExtended(data: {
  auctionId: string
  newEndTime: string
  extensionCount: number
  triggeredByBidId: string
}): Promise<void> {
  try {
    await transport.send(`auction-${data.auctionId}`, EVENTS.AUCTION_EXTENDED, data)
    console.log(`Broadcast auction extended for auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to broadcast auction extended for auction ${data.auctionId}:`, error)
  }
}

/**
 * Broadcast auction ended
 * Notifies all viewers that the auction has ended
 */
export async function broadcastAuctionEnded(data: {
  auctionId: string
  status: 'SOLD' | 'NO_SALE' | 'CANCELLED'
  finalPrice: number | null
  winnerId: string | null
}): Promise<void> {
  try {
    await transport.send(`auction-${data.auctionId}`, EVENTS.AUCTION_ENDED, data)
    console.log(`Broadcast auction ended for auction ${data.auctionId} - ${data.status}`)
  } catch (error) {
    console.error(`Failed to broadcast auction ended for auction ${data.auctionId}:`, error)
  }
}

/**
 * Notify a user they've been outbid
 * Sends a private notification to the outbid user
 */
export async function notifyOutbid(
  userId: string,
  data: {
    auctionId: string
    listingTitle: string
    newBidAmount: number
    yourBidAmount: number
  }
): Promise<void> {
  try {
    await transport.sendToUser(userId, EVENTS.OUTBID, data)

    // Also send in-app notification
    await sendUserNotification(userId, {
      type: 'OUTBID',
      title: 'You\'ve Been Outbid',
      message: `You were outbid on "${data.listingTitle}". Current bid: ${data.newBidAmount}`,
      data: {
        auctionId: data.auctionId,
        newBidAmount: data.newBidAmount,
        yourBidAmount: data.yourBidAmount,
      },
      link: `/auctions/${data.auctionId}`,
    })

    console.log(`Notified user ${userId} they've been outbid on auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to notify user ${userId} about being outbid:`, error)
  }
}

/**
 * Notify a user they're winning
 * Sends a private notification to the current winning bidder
 */
export async function notifyWinning(
  userId: string,
  data: {
    auctionId: string
    amount: number
  }
): Promise<void> {
  try {
    await transport.sendToUser(userId, EVENTS.WINNING, data)
    console.log(`Notified user ${userId} they're winning auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to notify user ${userId} about winning:`, error)
  }
}

/**
 * Broadcast auction starting event to the public auction channel
 * Called when a scheduled auction becomes active
 */
export async function broadcastAuctionStarting(data: {
  auctionId: string
  listingId: string
  listingTitle: string
  startingPrice: number
  currentEndTime: string
}): Promise<void> {
  try {
    await transport.send(`auction-${data.auctionId}`, EVENTS.AUCTION_STARTING, data)
    console.log(`Broadcast auction starting for auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to broadcast auction starting for auction ${data.auctionId}:`, error)
  }
}

/**
 * Notify winner via private channel and in-app notification
 * Called when an auction ends with a winning bid
 * This is a simplified version that sends both real-time and in-app notifications
 */
export async function notifyWinner(
  userId: string,
  data: {
    auctionId: string
    listingTitle: string
    finalPrice: number
    buyerFee: number
  }
): Promise<void> {
  try {
    // Send real-time notification via transport
    await transport.sendToUser(userId, 'auction-won', data)

    // Also use the standard notifyAuctionWon function for in-app + email
    await notifyAuctionWon(
      userId,
      data.auctionId,
      data.listingTitle,
      data.finalPrice,
      'EUR' // TODO: Get currency from auction data if needed
    )

    console.log(`Notified winner ${userId} for auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to notify winner ${userId}:`, error)
  }
}

/**
 * Broadcast a new comment to all viewers of an auction
 * Uses the transport layer to send to auction-specific channel
 */
export async function broadcastNewComment(data: {
  commentId: string
  auctionId: string
  listingId: string
  content: string
  authorName: string | null
  authorImage: string | null
  authorId: string
  timestamp: string
  parentId: string | null
}): Promise<void> {
  try {
    await transport.send(`auction-${data.auctionId}`, EVENTS.NEW_COMMENT, {
      commentId: data.commentId,
      auctionId: data.auctionId,
      listingId: data.listingId,
      content: data.content,
      authorName: data.authorName,
      authorImage: data.authorImage,
      timestamp: data.timestamp,
      parentId: data.parentId,
    })
    console.log(`Broadcast new comment for auction ${data.auctionId}`)
  } catch (error) {
    console.error(`Failed to broadcast new comment for auction ${data.auctionId}:`, error)
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
