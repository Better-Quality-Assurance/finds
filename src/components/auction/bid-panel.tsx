'use client'

import { useState, useEffect } from 'react'
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
    bidder: { id: string; name: string | null }
  }>
}

export function BidPanel({ auction: initialAuction, bids: initialBids }: BidPanelProps) {
  const { data: session } = useSession()
  const [bidAmount, setBidAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleBid = async () => {
    if (!session) {
      toast.error('Please log in to place a bid')
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

  const handleQuickBid = (amount: number) => {
    setBidAmount(amount.toString())
  }

  return (
    <Card variant="glass" className="sticky top-4 lg:top-20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-heading">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Gavel className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </div>
            {isActive ? 'Place Your Bid' : 'Auction Ended'}
          </CardTitle>
          {isActive && (
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold',
                isEndingSoon
                  ? 'animate-pulse-subtle bg-gradient-ending text-white shadow-lg shadow-destructive/30'
                  : 'bg-muted/80 backdrop-blur-sm'
              )}
              aria-live={isEndingSoon ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span><span className="sr-only">Time remaining: </span>{timeRemaining}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Current bid */}
        <div className="rounded-2xl bg-gradient-to-br from-muted/80 to-muted/50 p-5 backdrop-blur-sm" aria-live="polite" aria-atomic="true">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground" id="bid-label">
                {currentBid ? 'Current Bid' : 'Starting Bid'}
              </p>
              <p className="font-mono text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
                {formatCurrency(currentBid || startingPrice, currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1.5 rounded-full bg-background/50 px-3 py-1.5 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </p>
              {auction.extensionCount > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Extended {auction.extensionCount}x
                </p>
              )}
            </div>
          </div>

          {/* Reserve status */}
          <div className="mt-4">
            <Badge
              variant={auction.reserveMet ? 'success' : 'warning'}
              className="w-full justify-center py-1.5 text-sm"
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
          <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-success/10 to-emerald-500/10 p-4 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">You are the high bidder!</span>
          </div>
        )}

        {/* Bid form */}
        {isActive && !isSeller && (
          <>
            <div className="space-y-2">
              <Label htmlFor="bidAmount">Your Bid</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
                    {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : ''}
                  </span>
                  <Input
                    id="bidAmount"
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    min={minimumBid}
                    step={10}
                    className="pl-8"
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
                  className="min-w-[100px] sm:min-w-[120px]"
                  aria-label="Submit bid"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    'Place Bid'
                  )}
                </Button>
              </div>
              <p id="minimum-bid-text" className="text-xs text-muted-foreground">
                Minimum bid: {formatCurrency(minimumBid, currency)}
              </p>
            </div>

            {/* Quick bid buttons */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Quick bid amounts">
              {[minimumBid, suggestedBid, suggestedBid + 100, suggestedBid + 500].map(
                (amount, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickBid(amount)}
                    disabled={isSubmitting}
                    aria-label={`Set bid to ${formatCurrency(amount, currency)}`}
                  >
                    {formatCurrency(amount, currency)}
                  </Button>
                )
              )}
            </div>

            {/* Fee breakdown */}
            {bidAmount && parseFloat(bidAmount) >= minimumBid && (
              <div className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span>Your bid:</span>
                  <span>{formatCurrency(parseFloat(bidAmount), currency)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Buyer fee (5%):</span>
                  <span>+{formatCurrency(calculateBuyerFee(parseFloat(bidAmount)), currency)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                  <span>Total if you win:</span>
                  <span>{formatCurrency(calculateTotalWithFee(parseFloat(bidAmount)), currency)}</span>
                </div>
              </div>
            )}

            {!session && (
              <p className="text-center text-sm text-muted-foreground">
                <a href="/login" className="text-primary hover:underline">
                  Log in
                </a>{' '}
                to place a bid
              </p>
            )}
          </>
        )}

        {isSeller && (
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <span>You cannot bid on your own listing</span>
          </div>
        )}

        {/* Bid history */}
        {bids.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Recent Bids</h4>
            <div className="max-h-36 space-y-2 overflow-y-auto sm:max-h-48">
              {bids.slice(0, 10).map((bid, i) => (
                <div
                  key={bid.id}
                  className={cn(
                    'flex items-center justify-between rounded p-2 text-sm',
                    i === 0 ? 'bg-primary/10' : 'bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{bid.bidder.name || 'Anonymous'}</span>
                    {i === 0 && (
                      <Badge variant="success" className="text-xs">
                        Leading
                      </Badge>
                    )}
                  </div>
                  <span className="font-medium">
                    {formatCurrency(Number(bid.amount), currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
