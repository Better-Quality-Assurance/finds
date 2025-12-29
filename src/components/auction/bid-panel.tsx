'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime'
import { useBidding } from '@/hooks/useBidding'
import {
  calculateMinimumBid,
  calculateSuggestedBid,
  calculateBuyerFee,
  calculateTotalWithFee,
} from '@/domain/auction/rules'
import {
  Loader2,
  Gavel,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBidderWithFlag, formatBidderWithFlagMobile } from '@/utils/country-flag'
import { BidVerificationModal } from './bid-verification-modal'
import { getCurrencySymbol } from '@/domain/currency/currency-config'

type BidPanelProps = {
  auction: {
    id: string
    currentBid: number | null
    bidCount: number
    currentEndTime: string
    reserveMet: boolean
    extensionCount: number
    status: string
    listing: {
      startingPrice: number
      reservePrice: number | null
      currency: string
      sellerId: string
    }
  }
  bids: Array<{
    id: string
    amount: number
    createdAt: string
    bidderNumber: number
    bidderCountry: string | null
    bidder: { id: string }
  }>
}

export function BidPanel({ auction: initialAuction, bids: initialBids }: BidPanelProps) {
  const { data: session } = useSession()

  // Calculate bid values
  const currentBid = initialAuction.currentBid
  const startingPrice = initialAuction.listing.startingPrice
  const currency = initialAuction.listing.currency

  const minimumBid = calculateMinimumBid(currentBid, startingPrice)
  const suggestedBid = calculateSuggestedBid(currentBid, startingPrice)

  // Real-time auction state management
  const {
    auction,
    bids,
    timeRemaining,
    isEnded,
    isEndingSoon,
    isActive,
    updateAuctionState,
    updateEndTime,
  } = useAuctionRealtime(initialAuction, initialBids, {
    showToasts: true,
  })

  // Bidding logic and verification
  const {
    bidAmount,
    setBidAmount,
    clearBidAmount,
    isSubmitting,
    isVerified,
    showVerificationModal,
    setShowVerificationModal,
    setVerificationComplete,
    submitBid,
    handleQuickBid,
  } = useBidding(auction.id, minimumBid, currency, {
    onBidSuccess: (result) => {
      // Optimistic update - Pusher will also send updates
      if (result.auction) {
        updateAuctionState({
          currentBid: result.auction.currentBid,
          bidCount: result.auction.bidCount,
          reserveMet: result.auction.reserveMet,
          currentEndTime: result.auction.currentEndTime,
        })
      }
      // Clear bid input after successful submission
      clearBidAmount()
    },
  })

  const isSeller = session?.user?.id === auction.listing.sellerId
  const isWinning = bids[0]?.bidder.id === session?.user?.id

  // Set initial bid amount once on mount
  const isInitialized = useRef(false)
  useEffect(() => {
    if (!isInitialized.current) {
      setBidAmount(suggestedBid.toString())
      isInitialized.current = true
    }
  }, [suggestedBid, setBidAmount])

  // Handler for bid submission
  const handleBid = async () => {
    const amount = parseFloat(bidAmount)
    await submitBid(amount)
  }

  return (
    <>
    {/* Sticky urgency banner for mobile when ending soon */}
    {isEndingSoon && isActive && (
      <div className="fixed left-0 right-0 top-16 z-50 animate-pulse-subtle bg-gradient-to-r from-destructive via-red-600 to-destructive px-4 py-3 text-center shadow-xl lg:hidden">
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 animate-bounce text-white" aria-hidden="true" />
          <span className="text-sm font-bold text-white">
            Ending in {timeRemaining}!
          </span>
          <Clock className="h-4 w-4 animate-bounce text-white" aria-hidden="true" />
        </div>
      </div>
    )}

    <Card variant="glass" className="sticky top-20">
      <CardHeader className="px-4 pb-3 pt-4 md:px-5 md:pb-4 md:pt-4.5 sm:px-6 sm:pb-4 sm:pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-heading md:text-lg sm:text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 md:h-9 md:w-9 sm:h-10 sm:w-10 sm:rounded-xl">
              <Gavel className="h-4 w-4 text-primary-foreground md:h-4.5 md:w-4.5 sm:h-5 sm:w-5" aria-hidden="true" />
            </div>
            {isActive ? 'Place Your Bid' : 'Auction Ended'}
          </CardTitle>
          {isActive && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1.5 font-semibold md:gap-1.5 md:px-3.5 md:py-1.5 sm:gap-1.5 sm:px-4 sm:py-2',
                isEndingSoon
                  ? 'animate-pulse-subtle bg-gradient-ending text-sm text-white shadow-lg shadow-destructive/30 md:text-sm sm:text-base'
                  : 'bg-muted/80 text-xs backdrop-blur-sm md:text-sm sm:text-sm'
              )}
              aria-live={isEndingSoon ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              <Clock className={cn(
                'h-3.5 w-3.5 md:h-4 md:w-4 sm:h-4 sm:w-4',
                isEndingSoon && 'animate-bounce'
              )} aria-hidden="true" />
              <span><span className="sr-only">Time remaining: </span>{timeRemaining}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 md:space-y-4.5 md:px-5 sm:space-y-5 sm:px-6">
        {/* Current bid */}
        <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/50 p-3.5 backdrop-blur-sm md:p-4 sm:rounded-2xl sm:p-5" aria-live="polite" aria-atomic="true">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:text-[11px] sm:text-xs" id="bid-label">
                {currentBid ? 'Current Bid' : 'Starting Bid'}
              </p>
              <p className="font-mono text-3xl font-bold text-primary md:text-3xl sm:text-4xl lg:text-5xl">
                {formatCurrency(currentBid || startingPrice, currency)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-right">
              <p className="flex items-center gap-1 rounded-full bg-background/50 px-2 py-1 text-xs font-medium text-muted-foreground md:gap-1.5 md:px-2.5 md:py-1 md:text-xs sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
                <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </p>
              {auction.extensionCount > 0 && (
                <p className="text-[10px] text-muted-foreground md:text-[11px] sm:text-xs">
                  Extended {auction.extensionCount}x
                </p>
              )}
            </div>
          </div>

          {/* Reserve status */}
          <div className="mt-3 md:mt-3.5 sm:mt-4">
            <Badge
              variant={auction.reserveMet ? 'success' : 'warning'}
              className="w-full justify-center py-1 text-xs md:py-1 md:text-xs sm:w-auto sm:py-1.5 sm:text-sm"
            >
              {auction.listing.reservePrice
                ? auction.reserveMet
                  ? 'Reserve Price Met'
                  : 'Reserve Not Yet Met'
                : 'No Reserve'}
            </Badge>
          </div>
        </div>

        {/* Winning status */}
        {session && isWinning && isActive && (
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-success/10 to-emerald-500/10 p-3 text-success md:rounded-lg md:p-3.5 sm:rounded-xl sm:p-4">
            <CheckCircle className="h-4 w-4 flex-shrink-0 md:h-4.5 md:w-4.5 sm:h-5 sm:w-5" />
            <span className="text-sm font-semibold md:text-sm sm:text-base">You are the high bidder!</span>
          </div>
        )}

        {/* Not logged in - show account required message */}
        {isActive && !isSeller && !session && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center md:p-5 sm:p-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 md:h-14 md:w-14 sm:h-16 sm:w-16">
                <User className="h-6 w-6 text-primary md:h-7 md:w-7 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-2 text-base font-semibold md:text-lg sm:text-lg">
                Account Required to Bid
              </h3>
              <p className="mb-4 text-xs text-muted-foreground md:text-sm sm:text-sm">
                Create a free account to place bids, track auctions, and get notified when you&apos;re outbid.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button asChild variant="bid" className="w-full sm:w-auto">
                  <a href="/register">Create Account</a>
                </Button>
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <a href="/login">Log In</a>
                </Button>
              </div>
            </div>
            <p className="text-center text-[11px] text-muted-foreground md:text-xs sm:text-xs">
              Minimum bid: {formatCurrency(minimumBid, currency)}
            </p>
          </div>
        )}

        {/* Bid form - only show when logged in */}
        {isActive && !isSeller && session && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bidAmount" className="text-sm md:text-sm sm:text-sm">Your Bid</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground md:text-sm sm:text-sm" aria-hidden="true">
                    {getCurrencySymbol(currency)}
                  </span>
                  <Input
                    id="bidAmount"
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={minimumBid}
                    step={10}
                    className={cn(
                      "h-11 pl-8 text-base md:h-11 md:text-base sm:h-12 sm:text-base",
                      bidAmount && parseFloat(bidAmount) < minimumBid && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isSubmitting}
                    aria-describedby="minimum-bid-text"
                    aria-label={`Enter bid amount in ${currency}`}
                    aria-invalid={bidAmount ? parseFloat(bidAmount) < minimumBid : undefined}
                  />
                </div>
                <Button
                  onClick={handleBid}
                  disabled={isSubmitting}
                  variant="bid"
                  size="lg"
                  className="h-11 min-w-[100px] text-sm md:h-11 md:min-w-[110px] md:text-sm sm:h-12 sm:min-w-[120px] sm:text-base"
                  aria-label="Submit bid"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin md:h-4 md:w-4 sm:h-4 sm:w-4" aria-hidden="true" />
                  ) : (
                    'Place Bid'
                  )}
                </Button>
              </div>
              <p id="minimum-bid-text" className="text-[11px] text-muted-foreground md:text-xs sm:text-xs">
                Minimum bid: {formatCurrency(minimumBid, currency)}
              </p>
            </div>

            {/* Quick bid buttons */}
            <div className="flex gap-2" role="group" aria-label="Quick bid amounts">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickBid(minimumBid)}
                disabled={isSubmitting}
                className="h-10 flex-1 text-xs md:h-10 md:text-xs sm:h-11 sm:text-sm"
                aria-label={`Set bid to minimum: ${formatCurrency(minimumBid, currency)}`}
              >
                Min: {formatCurrency(minimumBid, currency)}
              </Button>
              <Button
                variant="bid"
                size="sm"
                onClick={() => handleQuickBid(suggestedBid)}
                disabled={isSubmitting}
                className="h-10 flex-1 text-xs md:h-10 md:text-xs sm:h-11 sm:text-sm"
                aria-label={`Set bid to suggested: ${formatCurrency(suggestedBid, currency)}`}
              >
                Suggested: {formatCurrency(suggestedBid, currency)}
              </Button>
            </div>

            {/* Fee breakdown */}
            {bidAmount && parseFloat(bidAmount) >= minimumBid && (
              <div className="rounded-lg border p-2.5 text-xs md:p-3 md:text-sm sm:p-3 sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span>Your bid:</span>
                  <span>{formatCurrency(parseFloat(bidAmount), currency)}</span>
                </div>
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Buyer fee (5%):</span>
                  <span>+{formatCurrency(calculateBuyerFee(parseFloat(bidAmount)), currency)}</span>
                </div>
                <div className="mt-1.5 flex justify-between gap-2 border-t pt-1.5 font-medium md:mt-2 md:pt-2 sm:mt-2 sm:pt-2">
                  <span>Total if you win:</span>
                  <span>{formatCurrency(calculateTotalWithFee(parseFloat(bidAmount)), currency)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {isSeller && (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning md:p-3 md:text-sm sm:p-3 sm:text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 md:h-4.5 md:w-4.5 sm:h-5 sm:w-5" />
            <span>You cannot bid on your own listing</span>
          </div>
        )}

        {/* Bid history */}
        {bids.length > 0 && (
          <div className="space-y-1.5 md:space-y-2 sm:space-y-2">
            <h4 className="text-sm font-medium md:text-sm sm:text-base">Recent Bids</h4>
            <div className="relative">
              <div className="max-h-40 space-y-1.5 overflow-y-auto md:max-h-44 md:space-y-2 sm:max-h-48 sm:space-y-2">
                {bids.slice(0, 10).map((bid, i) => (
                  <div
                    key={bid.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded p-2 text-xs md:p-2.5 md:text-sm sm:p-2.5 sm:text-sm',
                      i === 0 ? 'bg-primary/10' : 'bg-muted'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2 sm:gap-2">
                      {/* Mobile format */}
                      <span className="truncate sm:hidden">{formatBidderWithFlagMobile(bid.bidderNumber, bid.bidderCountry)}</span>
                      {/* Desktop format */}
                      <span className="hidden truncate sm:inline">{formatBidderWithFlag(bid.bidderNumber, bid.bidderCountry)}</span>
                      {i === 0 && (
                        <Badge variant="success" className="flex-shrink-0 text-[10px] md:text-[11px] sm:text-xs">
                          Leading
                        </Badge>
                      )}
                    </div>
                    <span className="flex-shrink-0 font-medium">
                      {formatCurrency(Number(bid.amount), currency)}
                    </span>
                  </div>
                ))}
              </div>
              {/* Scroll fade indicator */}
              {bids.length > 5 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" aria-hidden="true" />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Verification Modal */}
    <BidVerificationModal
      open={showVerificationModal}
      onOpenChange={setShowVerificationModal}
      onVerificationComplete={setVerificationComplete}
    />
    </>
  )
}
