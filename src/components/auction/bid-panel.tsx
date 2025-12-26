'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime'
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
import { formatBidderDisplay } from '@/services/bidder-number.service'
import { BidVerificationModal } from './bid-verification-modal'

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
  const [bidAmount, setBidAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

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
    onNewBid: () => {
      // Clear bid input when new bid arrives
      setBidAmount('')
    },
  })

  const currentBid = auction.currentBid
  const startingPrice = auction.listing.startingPrice
  const currency = auction.listing.currency

  const minimumBid = calculateMinimumBid(currentBid, startingPrice)
  const suggestedBid = calculateSuggestedBid(currentBid, startingPrice)

  const isSeller = session?.user?.id === auction.listing.sellerId
  const isWinning = bids[0]?.bidder.id === session?.user?.id

  // Set initial bid amount
  useEffect(() => {
    if (!bidAmount) {
      setBidAmount(suggestedBid.toString())
    }
  }, [suggestedBid, bidAmount])

  // Check verification status when session is available
  const checkVerificationStatus = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const res = await fetch('/api/user/verification-status')
      if (res.ok) {
        const data = await res.json()
        // User is verified if all checks pass
        setIsVerified(
          data.emailVerified && data.phoneVerified && data.biddingEnabled
        )
      }
    } catch (error) {
      console.error('Failed to check verification status:', error)
    }
  }, [session?.user?.id])

  useEffect(() => {
    checkVerificationStatus()
  }, [checkVerificationStatus])

  const handleBid = async () => {
    if (!session) {
      toast.error('Please log in to place a bid')
      return
    }

    // Check verification status before allowing bid
    if (isVerified === false) {
      setShowVerificationModal(true)
      return
    }

    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount < minimumBid) {
      toast.error(`Minimum bid is ${formatCurrency(minimumBid, currency)}`)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/auctions/${auction.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to place bid')
      }

      const result = await response.json()
      toast.success('Bid placed successfully!')

      // Optimistic update - Pusher will also send updates
      updateAuctionState({
        currentBid: result.auction.currentBid,
        bidCount: result.auction.bidCount,
        reserveMet: result.auction.reserveMet,
        currentEndTime: result.auction.currentEndTime,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place bid')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerificationComplete = () => {
    setIsVerified(true)
    setShowVerificationModal(false)
    toast.success('Verification complete! You can now place bids.')
  }

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString())
  }

  return (
    <>
    <Card variant="glass" className="sticky top-20">
      <CardHeader className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-heading sm:text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 sm:h-10 sm:w-10 sm:rounded-xl">
              <Gavel className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" aria-hidden="true" />
            </div>
            {isActive ? 'Place Your Bid' : 'Auction Ended'}
          </CardTitle>
          {isActive && (
            <div
              className={cn(
                'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm',
                isEndingSoon
                  ? 'animate-pulse-subtle bg-gradient-ending text-white shadow-lg shadow-destructive/30'
                  : 'bg-muted/80 backdrop-blur-sm'
              )}
              aria-live={isEndingSoon ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              <span><span className="sr-only">Time remaining: </span>{timeRemaining}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:space-y-5 sm:px-6">
        {/* Current bid */}
        <div className="rounded-xl bg-gradient-to-br from-muted/80 to-muted/50 p-3.5 backdrop-blur-sm sm:rounded-2xl sm:p-5" aria-live="polite" aria-atomic="true">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs" id="bid-label">
                {currentBid ? 'Current Bid' : 'Starting Bid'}
              </p>
              <p className="font-mono text-2xl font-bold text-primary sm:text-4xl">
                {formatCurrency(currentBid || startingPrice, currency)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-right">
              <p className="flex items-center gap-1 rounded-full bg-background/50 px-2 py-1 text-xs font-medium text-muted-foreground sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm">
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </p>
              {auction.extensionCount > 0 && (
                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  Extended {auction.extensionCount}x
                </p>
              )}
            </div>
          </div>

          {/* Reserve status */}
          <div className="mt-3 sm:mt-4">
            <Badge
              variant={auction.reserveMet ? 'success' : 'warning'}
              className="w-full justify-center py-1 text-xs sm:py-1.5 sm:text-sm"
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
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-success/10 to-emerald-500/10 p-3 text-success sm:rounded-xl sm:p-4">
            <CheckCircle className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
            <span className="text-sm font-semibold sm:text-base">You are the high bidder!</span>
          </div>
        )}

        {/* Bid form */}
        {isActive && !isSeller && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bidAmount" className="text-sm">Your Bid</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" aria-hidden="true">
                    {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : ''}
                  </span>
                  <Input
                    id="bidAmount"
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={minimumBid}
                    step={10}
                    className="h-11 pl-8 text-base sm:h-12"
                    disabled={isSubmitting}
                    aria-describedby="minimum-bid-text"
                    aria-label={`Enter bid amount in ${currency}`}
                  />
                </div>
                <Button
                  onClick={handleBid}
                  disabled={!session || isSubmitting}
                  variant="bid"
                  size="lg"
                  className="h-11 min-w-[100px] text-sm sm:h-12 sm:min-w-[120px] sm:text-base"
                  aria-label="Submit bid"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    'Place Bid'
                  )}
                </Button>
              </div>
              <p id="minimum-bid-text" className="text-[11px] text-muted-foreground sm:text-xs">
                Minimum bid: {formatCurrency(minimumBid, currency)}
              </p>
            </div>

            {/* Quick bid buttons */}
            <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:gap-2" role="group" aria-label="Quick bid amounts">
              {[minimumBid, suggestedBid, suggestedBid + 100, suggestedBid + 500].map(
                (amount, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickBid(amount)}
                    disabled={isSubmitting}
                    className="h-9 text-xs sm:h-auto sm:text-sm"
                    aria-label={`Set bid to ${formatCurrency(amount, currency)}`}
                  >
                    {formatCurrency(amount, currency)}
                  </Button>
                )
              )}
            </div>

            {/* Fee breakdown */}
            {bidAmount && parseFloat(bidAmount) >= minimumBid && (
              <div className="rounded-lg border p-2.5 text-xs sm:p-3 sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span>Your bid:</span>
                  <span>{formatCurrency(parseFloat(bidAmount), currency)}</span>
                </div>
                <div className="flex justify-between gap-2 text-muted-foreground">
                  <span>Buyer fee (5%):</span>
                  <span>+{formatCurrency(calculateBuyerFee(parseFloat(bidAmount)), currency)}</span>
                </div>
                <div className="mt-1.5 flex justify-between gap-2 border-t pt-1.5 font-medium sm:mt-2 sm:pt-2">
                  <span>Total if you win:</span>
                  <span>{formatCurrency(calculateTotalWithFee(parseFloat(bidAmount)), currency)}</span>
                </div>
              </div>
            )}

            {!session && (
              <p className="text-center text-xs text-muted-foreground sm:text-sm">
                <a href="/login" className="text-primary hover:underline">
                  Log in
                </a>{' '}
                to place a bid
              </p>
            )}
          </>
        )}

        {isSeller && (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-2.5 text-xs text-warning sm:p-3 sm:text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
            <span>You cannot bid on your own listing</span>
          </div>
        )}

        {/* Bid history */}
        {bids.length > 0 && (
          <div className="space-y-1.5 sm:space-y-2">
            <h4 className="text-sm font-medium sm:text-base">Recent Bids</h4>
            <div className="max-h-40 space-y-1.5 overflow-y-auto sm:max-h-48 sm:space-y-2">
              {bids.slice(0, 10).map((bid, i) => (
                <div
                  key={bid.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded p-1.5 text-xs sm:p-2 sm:text-sm',
                    i === 0 ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                    <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground sm:h-4 sm:w-4" />
                    <span className="truncate">{formatBidderDisplay(bid.bidderNumber, bid.bidderCountry)}</span>
                    {i === 0 && (
                      <Badge variant="success" className="flex-shrink-0 text-[10px] sm:text-xs">
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
          </div>
        )}
      </CardContent>
    </Card>

    {/* Verification Modal */}
    <BidVerificationModal
      open={showVerificationModal}
      onOpenChange={setShowVerificationModal}
      onVerificationComplete={handleVerificationComplete}
    />
    </>
  )
}
