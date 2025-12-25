// Auction business rules

export const AUCTION_RULES = {
  // Timing
  DEFAULT_DURATION_DAYS: 7,
  MIN_DURATION_DAYS: 3,
  MAX_DURATION_DAYS: 14,

  // Anti-sniping
  ANTI_SNIPE_WINDOW_MINUTES: 2, // Bids in last 2 minutes trigger extension
  ANTI_SNIPE_EXTENSION_MINUTES: 2, // Extend by 2 minutes
  MAX_EXTENSIONS: 10, // Maximum number of anti-snipe extensions

  // Bidding
  MIN_BID_INCREMENT_PERCENT: 1, // Minimum 1% increase
  MIN_BID_INCREMENT_AMOUNT: 10, // Minimum €10 increase

  // Bid increments by price tier (for suggested next bid)
  BID_INCREMENTS: [
    { maxPrice: 1000, increment: 50 },
    { maxPrice: 5000, increment: 100 },
    { maxPrice: 10000, increment: 250 },
    { maxPrice: 25000, increment: 500 },
    { maxPrice: 50000, increment: 1000 },
    { maxPrice: 100000, increment: 2500 },
    { maxPrice: 250000, increment: 5000 },
    { maxPrice: Infinity, increment: 10000 },
  ],

  // Buyer fee
  BUYER_FEE_PERCENT: 5,

  // Payment
  PAYMENT_DEADLINE_DAYS: 5, // 5 business days to complete payment
} as const

export type AuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'SOLD' | 'NO_SALE' | 'CANCELLED'

/**
 * Calculate the minimum valid bid amount
 */
export function calculateMinimumBid(currentBid: number | null, startingPrice: number): number {
  if (currentBid === null) {
    return startingPrice
  }

  // Minimum increment is 1% or €10, whichever is greater
  const percentIncrement = currentBid * (AUCTION_RULES.MIN_BID_INCREMENT_PERCENT / 100)
  const minIncrement = Math.max(percentIncrement, AUCTION_RULES.MIN_BID_INCREMENT_AMOUNT)

  return Math.ceil(currentBid + minIncrement)
}

/**
 * Calculate suggested next bid based on price tier
 */
export function calculateSuggestedBid(currentBid: number | null, startingPrice: number): number {
  const baseBid = currentBid ?? startingPrice

  // Find the appropriate increment for this price tier
  const tier = AUCTION_RULES.BID_INCREMENTS.find((t) => baseBid < t.maxPrice)
  const increment = tier?.increment ?? 10000

  // If no current bid, return starting price
  if (currentBid === null) {
    return startingPrice
  }

  return currentBid + increment
}

/**
 * Validate if a bid amount is valid
 */
export function validateBidAmount(
  bidAmount: number,
  currentBid: number | null,
  startingPrice: number
): { valid: boolean; error?: string; minimumBid: number } {
  const minimumBid = calculateMinimumBid(currentBid, startingPrice)

  if (bidAmount < minimumBid) {
    return {
      valid: false,
      error: `Bid must be at least ${minimumBid}`,
      minimumBid,
    }
  }

  // Check for reasonable maximum (prevent typos)
  const maxReasonableBid = (currentBid || startingPrice) * 100
  if (bidAmount > maxReasonableBid) {
    return {
      valid: false,
      error: 'Bid amount seems unusually high. Please verify.',
      minimumBid,
    }
  }

  return { valid: true, minimumBid }
}

/**
 * Check if a bid triggers anti-sniping extension
 */
export function shouldExtendAuction(
  bidTime: Date,
  currentEndTime: Date,
  extensionCount: number
): boolean {
  // Check if max extensions reached
  if (extensionCount >= AUCTION_RULES.MAX_EXTENSIONS) {
    return false
  }

  // Check if bid is within anti-snipe window
  const timeUntilEnd = currentEndTime.getTime() - bidTime.getTime()
  const windowMs = AUCTION_RULES.ANTI_SNIPE_WINDOW_MINUTES * 60 * 1000

  return timeUntilEnd <= windowMs && timeUntilEnd > 0
}

/**
 * Calculate new end time after anti-snipe extension
 */
export function calculateExtendedEndTime(currentEndTime: Date): Date {
  const extensionMs = AUCTION_RULES.ANTI_SNIPE_EXTENSION_MINUTES * 60 * 1000
  return new Date(currentEndTime.getTime() + extensionMs)
}

/**
 * Calculate buyer fee
 */
export function calculateBuyerFee(hammerPrice: number): number {
  return Math.round(hammerPrice * (AUCTION_RULES.BUYER_FEE_PERCENT / 100) * 100) / 100
}

/**
 * Calculate total buyer pays (hammer price + fee)
 */
export function calculateTotalWithFee(hammerPrice: number): number {
  return hammerPrice + calculateBuyerFee(hammerPrice)
}

/**
 * Check if reserve is met
 */
export function isReserveMet(currentBid: number | null, reservePrice: number | null): boolean {
  if (reservePrice === null) {
    return true // No reserve means it's always "met"
  }
  if (currentBid === null) {
    return false
  }
  return currentBid >= reservePrice
}

/**
 * Calculate auction end status
 */
export function determineAuctionResult(
  currentBid: number | null,
  reservePrice: number | null
): 'SOLD' | 'NO_SALE' {
  if (currentBid === null) {
    return 'NO_SALE'
  }
  if (reservePrice !== null && currentBid < reservePrice) {
    return 'NO_SALE'
  }
  return 'SOLD'
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(endTime: Date): string {
  const now = new Date()
  const diff = endTime.getTime() - now.getTime()

  if (diff <= 0) {
    return 'Ended'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Check if auction is ending soon (within anti-snipe window)
 */
export function isEndingSoon(endTime: Date): boolean {
  const now = new Date()
  const diff = endTime.getTime() - now.getTime()
  const windowMs = AUCTION_RULES.ANTI_SNIPE_WINDOW_MINUTES * 60 * 1000 * 5 // 5x window for "ending soon"
  return diff > 0 && diff <= windowMs
}

/**
 * Check if auction is active
 */
export function isAuctionActive(startTime: Date, endTime: Date): boolean {
  const now = new Date()
  return now >= startTime && now < endTime
}

/**
 * Check if auction has ended
 */
export function hasAuctionEnded(endTime: Date): boolean {
  return new Date() >= endTime
}

/**
 * Calculate payment deadline
 */
export function calculatePaymentDeadline(auctionEndTime: Date): Date {
  const deadline = new Date(auctionEndTime)
  // Add business days (skip weekends)
  let daysToAdd = AUCTION_RULES.PAYMENT_DEADLINE_DAYS
  while (daysToAdd > 0) {
    deadline.setDate(deadline.getDate() + 1)
    const dayOfWeek = deadline.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysToAdd--
    }
  }
  return deadline
}
