import { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'
import { placeBid, getAuctionById, getBidHistory } from '@/services/auction.service'
import {
  broadcastNewBid,
  broadcastAuctionExtended,
  notifyOutbid,
} from '@/services/notification.service'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { placeBidSchema } from '@/lib/validation-schemas'
import {
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  FraudDetectedError,
  InsufficientDepositError,
  BidValidationError,
  AuctionStateError,
  AuctionNotActiveError,
  AuctionEndedError,
  AuctionNotStartedError,
  BidTooLowError,
  SelfBidError,
} from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'
import { checkRateLimit, userRateLimitKey, createRateLimitResponse } from '@/middleware/rate-limit'
import { BID_RATE_LIMIT } from '@/lib/rate-limit-config'
import { isPhoneVerified } from '@/services/phone-verification.service'

type RouteParams = { params: Promise<{ id: string }> }

// GET - Get bid history
export const GET = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }) => {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const bids = await getBidHistory(id, limit)

    return successResponse({ bids })
  },
  {
    resourceType: 'auction',
    action: 'auction.bids.list',
  }
)

// POST - Place a bid
export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError('You must be logged in to place a bid')
    }

    // Rate limit check - 30 bids per minute per user
    const rateLimitKey = userRateLimitKey('bid', session.user.id)
    const rateLimitResult = checkRateLimit(rateLimitKey, BID_RATE_LIMIT)

    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        rateLimitResult,
        'Too many bids. Please slow down and try again later.'
      )
    }

    // Check if user can bid
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { biddingEnabled: true, emailVerified: true },
    })

    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND)
    }

    if (!user.emailVerified) {
      throw new ForbiddenError(
        'Please verify your email before bidding',
        ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED
      )
    }

    // Check phone verification (required for KYC)
    const phoneVerified = await isPhoneVerified(session.user.id)
    if (!phoneVerified) {
      throw new ForbiddenError(
        'Phone verification required to place bids',
        ERROR_CODES.AUTH_PHONE_NOT_VERIFIED,
        { nextStep: 'verify-phone' }
      )
    }

    if (!user.biddingEnabled) {
      throw new ForbiddenError(
        'Bidding is not enabled for your account. Please add a payment method.',
        ERROR_CODES.AUTH_BIDDING_DISABLED
      )
    }

    const { id } = await params
    const body = await request.json()
    const { amount } = placeBidSchema.parse(body)

    // Get service container
    const container = getContainer()

    // Get request metadata for fraud detection
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] ||
                      headersList.get('x-real-ip') || null
    const userAgent = headersList.get('user-agent') || null

    // Run fraud checks
    const fraudCheck = await container.fraud.runBidFraudChecks({
      userId: session.user.id,
      auctionId: id,
      bidAmount: amount,
      ipAddress,
      userAgent,
    })

    if (!fraudCheck.passed) {
      const criticalAlert = fraudCheck.alerts.find(a => a.severity === 'CRITICAL')
      throw new FraudDetectedError(
        criticalAlert?.message || 'Bid blocked due to suspicious activity',
        ERROR_CODES.FRAUD_DETECTED,
        {
          fraudAlerts: fraudCheck.alerts.map(a => ({ type: a.type, severity: a.severity }))
        }
      )
    }

    // Check for valid deposit
    const hasDeposit = await container.deposits.hasValidDeposit(session.user.id, id)
    if (!hasDeposit) {
      // Try to create deposit automatically
      const depositResult = await container.deposits.createBidDeposit({
        userId: session.user.id,
        auctionId: id,
        bidAmount: amount,
      })

      if (!depositResult.success) {
        throw new InsufficientDepositError(
          depositResult.error || 'Deposit required before bidding',
          ERROR_CODES.DEPOSIT_REQUIRED,
          {
            requiresDeposit: true,
            requiresAction: depositResult.requiresAction,
            clientSecret: depositResult.clientSecret,
          }
        )
      }
    }

    // Get current auction state to find previous bidder
    const auctionBefore = await getAuctionById(id)
    const previousWinningBid = auctionBefore?.bids.find(b => b.isWinning)

    // Place the bid - service layer now throws typed errors, so we just need to handle them
    const { bid, auction, extended } = await placeBid(id, session.user.id, amount, {
      ipAddress,
      userAgent,
    })

    // Broadcast new bid to all watchers (anonymous - no names)
    await broadcastNewBid({
      bidId: bid.id,
      auctionId: id,
      amount: Number(bid.amount),
      bidderNumber: bid.bidderNumber,
      bidderCountry: bid.bidderCountry,
      bidCount: auction.bidCount,
      timestamp: bid.createdAt.toISOString(),
      isReserveMet: auction.reserveMet,
    })

    // If auction was extended, broadcast that too
    if (extended) {
      await broadcastAuctionExtended({
        auctionId: id,
        newEndTime: auction.currentEndTime.toISOString(),
        extensionCount: auction.extensionCount,
        triggeredByBidId: bid.id,
      })
    }

    // Notify previous bidder they've been outbid
    if (previousWinningBid && previousWinningBid.bidderId !== session.user.id) {
      await notifyOutbid(previousWinningBid.bidderId, {
        auctionId: id,
        listingTitle: auctionBefore?.listing.title || '',
        newBidAmount: Number(bid.amount),
        yourBidAmount: Number(previousWinningBid.amount),
      })
    }

    // Notify watchers about the new bid (non-blocking, anonymous)
    // Using dynamic import to avoid circular dependencies
    import('@/services/notification.service')
      .then(({ notifyWatchersNewBid }) => {
        return notifyWatchersNewBid(
          id,
          Number(bid.amount),
          auction.currency,
          bid.bidderNumber,
          bid.bidderCountry
        )
      })
      .catch(error => {
        console.error('Failed to notify watchers about new bid:', error)
      })

    const response = successResponse({
      bid,
      auction: {
        currentBid: Number(auction.currentBid),
        bidCount: auction.bidCount,
        reserveMet: auction.reserveMet,
        currentEndTime: auction.currentEndTime.toISOString(),
        extended,
      },
    })

    // Add rate limit headers to successful response
    response.headers.set('X-RateLimit-Limit', rateLimitResult.total.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString())

    return response
  },
  {
    requiresAuth: true,
    auditLog: true,
    resourceType: 'auction',
    action: 'auction.bid.place',
  }
)
