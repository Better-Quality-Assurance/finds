// Fraud Detection Service - handles bid fraud prevention and detection
import { prisma } from '@/lib/db'
import { AlertSeverity, FraudAlert, Bid } from '@prisma/client'

// Fraud detection thresholds
export const FRAUD_THRESHOLDS = {
  // Bid velocity: max bids per user per hour
  MAX_BIDS_PER_HOUR: 20,
  // Minimum time between bids in seconds
  MIN_BID_INTERVAL_SECONDS: 5,
  // Shill bidding: seller IP matching bidder IP
  SHILL_IP_MATCH: true,
  // Coordinated bidding: multiple bidders from same IP
  MAX_BIDDERS_SAME_IP: 2,
  // Bid increment suspicious threshold (too small increments)
  MIN_BID_INCREMENT_PERCENT: 1,
  // Last minute bid surge (potential manipulation)
  LAST_MINUTE_BID_THRESHOLD: 10,
  // New account bidding on high-value items
  NEW_ACCOUNT_DAYS: 7,
  NEW_ACCOUNT_BID_LIMIT: 5000, // €5,000
}

export type FraudCheckResult = {
  passed: boolean
  alerts: Array<{
    type: string
    severity: AlertSeverity
    message: string
    details: Record<string, unknown>
  }>
}

/**
 * Run all fraud checks before placing a bid
 */
export async function runBidFraudChecks(params: {
  userId: string
  auctionId: string
  bidAmount: number
  ipAddress?: string | null
  userAgent?: string | null
}): Promise<FraudCheckResult> {
  const { userId, auctionId, bidAmount, ipAddress, userAgent } = params
  const alerts: FraudCheckResult['alerts'] = []

  // Get auction and listing info
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      listing: {
        select: { sellerId: true },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          bidder: {
            select: { id: true, createdAt: true },
          },
        },
      },
    },
  })

  if (!auction) {
    return { passed: false, alerts: [{ type: 'INVALID_AUCTION', severity: 'HIGH', message: 'Auction not found', details: {} }] }
  }

  // 1. Check for shill bidding (seller bidding on own auction)
  if (auction.listing.sellerId === userId) {
    alerts.push({
      type: 'SHILL_BIDDING',
      severity: 'CRITICAL',
      message: 'Seller attempting to bid on own auction',
      details: { sellerId: auction.listing.sellerId, bidderId: userId },
    })
  }

  // 2. Check bid velocity
  const velocityAlert = await checkBidVelocity(userId, auctionId)
  if (velocityAlert) alerts.push(velocityAlert)

  // 3. Check for same IP as seller (potential shill)
  if (ipAddress) {
    const ipAlert = await checkSellerIpMatch(auctionId, ipAddress, auction.listing.sellerId)
    if (ipAlert) alerts.push(ipAlert)

    // 4. Check for multiple bidders from same IP
    const coordAlert = await checkCoordinatedBidding(auctionId, ipAddress, userId)
    if (coordAlert) alerts.push(coordAlert)
  }

  // 5. Check for suspicious bid patterns
  const patternAlert = await checkBidPatterns(auction.bids, userId, bidAmount)
  if (patternAlert) alerts.push(patternAlert)

  // 6. Check for new account on high-value bid
  const newAccountAlert = await checkNewAccountHighValue(userId, bidAmount)
  if (newAccountAlert) alerts.push(newAccountAlert)

  // 7. Check for last-minute bid surge
  const surgeAlert = checkLastMinuteSurge(auction.bids, auction.currentEndTime)
  if (surgeAlert) alerts.push(surgeAlert)

  // Create alerts in database
  for (const alert of alerts) {
    await createFraudAlert({
      userId,
      auctionId,
      alertType: alert.type,
      severity: alert.severity,
      details: alert.details,
    })
  }

  // Determine if bid should be blocked
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL')
  const highAlerts = alerts.filter(a => a.severity === 'HIGH')

  // Block on critical alerts or multiple high alerts
  const passed = criticalAlerts.length === 0 && highAlerts.length < 2

  return { passed, alerts }
}

/**
 * Check bid velocity (too many bids in short time)
 */
async function checkBidVelocity(
  userId: string,
  auctionId: string
): Promise<FraudCheckResult['alerts'][0] | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // Count bids in last hour
  const recentBids = await prisma.bid.count({
    where: {
      bidderId: userId,
      createdAt: { gte: oneHourAgo },
    },
  })

  if (recentBids >= FRAUD_THRESHOLDS.MAX_BIDS_PER_HOUR) {
    return {
      type: 'BID_VELOCITY',
      severity: 'HIGH',
      message: `User placed ${recentBids} bids in the last hour`,
      details: { bidCount: recentBids, threshold: FRAUD_THRESHOLDS.MAX_BIDS_PER_HOUR },
    }
  }

  // Check time since last bid on this auction
  const lastBid = await prisma.bid.findFirst({
    where: {
      bidderId: userId,
      auctionId,
    },
    orderBy: { createdAt: 'desc' },
  })

  if (lastBid) {
    const secondsSinceLastBid = (Date.now() - lastBid.createdAt.getTime()) / 1000
    if (secondsSinceLastBid < FRAUD_THRESHOLDS.MIN_BID_INTERVAL_SECONDS) {
      return {
        type: 'RAPID_BIDDING',
        severity: 'MEDIUM',
        message: `Bid placed ${secondsSinceLastBid.toFixed(1)}s after previous bid`,
        details: { interval: secondsSinceLastBid, threshold: FRAUD_THRESHOLDS.MIN_BID_INTERVAL_SECONDS },
      }
    }
  }

  return null
}

/**
 * Check if bidder IP matches seller's known IPs
 */
async function checkSellerIpMatch(
  auctionId: string,
  bidderIp: string,
  sellerId: string
): Promise<FraudCheckResult['alerts'][0] | null> {
  // Get seller's recent IPs from their bids on other auctions
  const sellerBids = await prisma.bid.findMany({
    where: { bidderId: sellerId },
    select: { ipAddress: true },
    take: 50,
  })

  const sellerIps = new Set(sellerBids.map(b => b.ipAddress).filter(Boolean))

  if (sellerIps.has(bidderIp)) {
    return {
      type: 'SELLER_IP_MATCH',
      severity: 'HIGH',
      message: 'Bidder IP matches seller IP from previous activity',
      details: { matchedIp: bidderIp },
    }
  }

  // Also check listings created by seller for IP patterns
  // (This would require storing IP on listing creation)

  return null
}

/**
 * Check for coordinated bidding (multiple bidders from same IP)
 */
async function checkCoordinatedBidding(
  auctionId: string,
  ipAddress: string,
  currentUserId: string
): Promise<FraudCheckResult['alerts'][0] | null> {
  // Find other bidders from same IP
  const sameIpBids = await prisma.bid.findMany({
    where: {
      auctionId,
      ipAddress,
      bidderId: { not: currentUserId },
    },
    select: { bidderId: true },
    distinct: ['bidderId'],
  })

  if (sameIpBids.length >= FRAUD_THRESHOLDS.MAX_BIDDERS_SAME_IP) {
    return {
      type: 'COORDINATED_BIDDING',
      severity: 'HIGH',
      message: `Multiple bidders (${sameIpBids.length + 1}) from same IP address`,
      details: {
        ipAddress,
        bidderCount: sameIpBids.length + 1,
        otherBidders: sameIpBids.map(b => b.bidderId),
      },
    }
  }

  return null
}

/**
 * Check for suspicious bid patterns
 */
async function checkBidPatterns(
  bids: Array<Bid & { bidder: { id: string; createdAt: Date } }>,
  userId: string,
  newBidAmount: number
): Promise<FraudCheckResult['alerts'][0] | null> {
  if (bids.length < 2) return null

  const userBids = bids.filter(b => b.bidder.id === userId)

  // Check for penny bidding (very small increments to drive up price)
  const lastBid = bids[0]
  if (lastBid) {
    const increment = newBidAmount - Number(lastBid.amount)
    const incrementPercent = (increment / Number(lastBid.amount)) * 100

    if (incrementPercent < FRAUD_THRESHOLDS.MIN_BID_INCREMENT_PERCENT && increment > 0) {
      return {
        type: 'PENNY_BIDDING',
        severity: 'MEDIUM',
        message: `Very small bid increment: ${incrementPercent.toFixed(2)}%`,
        details: { increment, incrementPercent, threshold: FRAUD_THRESHOLDS.MIN_BID_INCREMENT_PERCENT },
      }
    }
  }

  // Check for bid retraction pattern (user consistently outbid by specific other user)
  // This could indicate shill bidding to drive up price

  return null
}

/**
 * Check if new account is bidding on high-value items
 */
async function checkNewAccountHighValue(
  userId: string,
  bidAmount: number
): Promise<FraudCheckResult['alerts'][0] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })

  if (!user) return null

  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)

  if (accountAgeDays < FRAUD_THRESHOLDS.NEW_ACCOUNT_DAYS &&
      bidAmount > FRAUD_THRESHOLDS.NEW_ACCOUNT_BID_LIMIT) {
    return {
      type: 'NEW_ACCOUNT_HIGH_VALUE',
      severity: 'MEDIUM',
      message: `New account (${accountAgeDays.toFixed(1)} days) bidding €${bidAmount}`,
      details: {
        accountAgeDays,
        bidAmount,
        ageThreshold: FRAUD_THRESHOLDS.NEW_ACCOUNT_DAYS,
        valueThreshold: FRAUD_THRESHOLDS.NEW_ACCOUNT_BID_LIMIT,
      },
    }
  }

  return null
}

/**
 * Check for suspicious last-minute bid surge
 */
function checkLastMinuteSurge(
  bids: Array<Bid>,
  endTime: Date
): FraudCheckResult['alerts'][0] | null {
  const oneMinuteBeforeEnd = new Date(endTime.getTime() - 60 * 1000)
  const twoMinutesBeforeEnd = new Date(endTime.getTime() - 2 * 60 * 1000)

  // Count bids in last minute vs previous minute
  const lastMinuteBids = bids.filter(b => b.createdAt >= oneMinuteBeforeEnd).length
  const previousMinuteBids = bids.filter(
    b => b.createdAt >= twoMinutesBeforeEnd && b.createdAt < oneMinuteBeforeEnd
  ).length

  if (lastMinuteBids > FRAUD_THRESHOLDS.LAST_MINUTE_BID_THRESHOLD &&
      lastMinuteBids > previousMinuteBids * 3) {
    return {
      type: 'LAST_MINUTE_SURGE',
      severity: 'LOW',
      message: `Unusual bid surge in final minute: ${lastMinuteBids} bids`,
      details: {
        lastMinuteBids,
        previousMinuteBids,
        ratio: previousMinuteBids > 0 ? lastMinuteBids / previousMinuteBids : lastMinuteBids,
      },
    }
  }

  return null
}

/**
 * Create a fraud alert in the database
 */
export async function createFraudAlert(params: {
  userId?: string
  auctionId?: string
  bidId?: string
  alertType: string
  severity: AlertSeverity
  details: Record<string, unknown>
}): Promise<FraudAlert> {
  return prisma.fraudAlert.create({
    data: {
      userId: params.userId,
      auctionId: params.auctionId,
      bidId: params.bidId,
      alertType: params.alertType,
      severity: params.severity,
      details: params.details as object,
      status: 'OPEN',
    },
  })
}

/**
 * Get open fraud alerts
 */
export async function getOpenAlerts(options?: {
  severity?: AlertSeverity
  limit?: number
  offset?: number
}): Promise<{ alerts: FraudAlert[]; total: number }> {
  const { severity, limit = 50, offset = 0 } = options || {}

  const where = {
    status: 'OPEN' as const,
    ...(severity && { severity }),
  }

  const [alerts, total] = await Promise.all([
    prisma.fraudAlert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.fraudAlert.count({ where }),
  ])

  return { alerts, total }
}

/**
 * Review and update a fraud alert
 */
export async function reviewFraudAlert(
  alertId: string,
  reviewerId: string,
  status: 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE',
  notes?: string
): Promise<FraudAlert> {
  return prisma.fraudAlert.update({
    where: { id: alertId },
    data: {
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      resolutionNotes: notes,
    },
  })
}

/**
 * Get fraud stats for dashboard
 */
export async function getFraudStats(): Promise<{
  openAlerts: number
  criticalAlerts: number
  alertsToday: number
  alertsByType: Record<string, number>
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openAlerts, criticalAlerts, alertsToday, alertsByType] = await Promise.all([
    prisma.fraudAlert.count({ where: { status: 'OPEN' } }),
    prisma.fraudAlert.count({ where: { status: 'OPEN', severity: 'CRITICAL' } }),
    prisma.fraudAlert.count({ where: { createdAt: { gte: today } } }),
    prisma.fraudAlert.groupBy({
      by: ['alertType'],
      _count: true,
      where: { status: 'OPEN' },
    }),
  ])

  return {
    openAlerts,
    criticalAlerts,
    alertsToday,
    alertsByType: Object.fromEntries(
      alertsByType.map(a => [a.alertType, a._count])
    ),
  }
}

/**
 * Check user's fraud history
 */
export async function getUserFraudHistory(userId: string): Promise<{
  totalAlerts: number
  criticalAlerts: number
  recentAlerts: FraudAlert[]
  isSuspicious: boolean
}> {
  const [totalAlerts, criticalAlerts, recentAlerts] = await Promise.all([
    prisma.fraudAlert.count({ where: { userId } }),
    prisma.fraudAlert.count({ where: { userId, severity: 'CRITICAL' } }),
    prisma.fraudAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  // User is suspicious if they have critical alerts or many total alerts
  const isSuspicious = criticalAlerts > 0 || totalAlerts >= 5

  return { totalAlerts, criticalAlerts, recentAlerts, isSuspicious }
}
