'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useAuctionTimer } from '@/hooks/use-pusher'
import { Clock, Gavel, MapPin, Eye, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SellerRatingBadge } from '@/components/seller/seller-rating-badge'
import { toast } from 'sonner'

type AuctionCardProps = {
  auction: {
    id: string
    currentBid: number | null
    bidCount: number
    currentEndTime: string | Date
    reserveMet: boolean
    listing: {
      id: string
      title: string
      year: number
      make: string
      model: string
      startingPrice: number
      currency: string
      locationCity: string
      locationCountry: string
      isRunning: boolean
      media: Array<{ publicUrl: string }>
      seller?: {
        id: string
        averageRating: number | null
        totalReviews: number
      }
    }
  }
  showWatchButton?: boolean
  isWatching?: boolean
  onWatch?: () => void
}

export function AuctionCard({
  auction,
  showWatchButton = false,
  isWatching: initialIsWatching = false,
  onWatch,
}: AuctionCardProps) {
  const { data: session } = useSession()
  const [isWatching, setIsWatching] = useState(initialIsWatching)
  const [isLoading, setIsLoading] = useState(false)
  const { timeRemaining, isEnded, seconds } = useAuctionTimer(auction.currentEndTime)
  const isEndingSoon = seconds > 0 && seconds < 600 // Less than 10 minutes

  const handleWatch = async () => {
    if (onWatch) {
      onWatch()
      return
    }

    if (!session) {
      toast.error('Please log in to add to watchlist')
      return
    }

    setIsLoading(true)
    try {
      if (isWatching) {
        const response = await fetch(`/api/watchlist?auctionId=${auction.id}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!response.ok) {
          let errorMessage = 'Failed to remove from watchlist'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error?.message || errorMessage
          } catch {
            // Response wasn't JSON
          }
          throw new Error(errorMessage)
        }
        setIsWatching(false)
        toast.success('Removed from watchlist')
      } else {
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctionId: auction.id }),
        })
        if (!response.ok) {
          let errorMessage = 'Failed to add to watchlist'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error?.message || errorMessage
          } catch {
            // Response wasn't JSON
          }
          throw new Error(errorMessage)
        }
        setIsWatching(true)
        toast.success('Added to watchlist')
      }
    } catch (error) {
      console.error('Watch error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update watchlist')
    } finally {
      setIsLoading(false)
    }
  }

  const currentPrice = auction.currentBid
    ? Number(auction.currentBid)
    : Number(auction.listing.startingPrice)

  const primaryPhoto = auction.listing.media[0]

  return (
    <Card
      className={cn(
        'group relative overflow-hidden',
        'border-border/50 bg-card/95 backdrop-blur-sm',
        'transition-all duration-500 ease-out',
        'hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-card-hover'
      )}
      role="article"
      aria-label={`Auction for ${auction.listing.year} ${auction.listing.make} ${auction.listing.model}`}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

      <Link href={`/auctions/${auction.id}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-muted to-muted/30">
          {primaryPhoto ? (
            <>
              <Image
                src={primaryPhoto.publicUrl}
                alt={`${auction.listing.year} ${auction.listing.make} ${auction.listing.model}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={false}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              {/* Premium vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-80" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center" role="img" aria-label="No image available">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
                <Gavel className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* Time badge */}
          <div
            className={cn(
              'absolute left-3 top-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold backdrop-blur-md',
              isEnded
                ? 'bg-muted/90 text-muted-foreground'
                : isEndingSoon
                  ? 'bg-gradient-ending text-white shadow-lg shadow-destructive/30 animate-pulse-subtle'
                  : 'bg-black/70 text-white'
            )}
            aria-label={`Time remaining: ${timeRemaining}`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            <span aria-hidden="true">{timeRemaining}</span>
          </div>

          {/* Running status */}
          {!auction.listing.isRunning && (
            <Badge
              variant="warning"
              className="absolute right-3 top-3 shadow-lg"
            >
              Non-Running
            </Badge>
          )}

          {/* Bottom overlay with reserve status and price preview */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-end justify-between">
              {/* Reserve badge */}
              {auction.currentBid && (
                <Badge
                  variant={auction.reserveMet ? 'success' : 'muted'}
                  className="shadow-sm"
                >
                  {auction.reserveMet ? 'Reserve Met' : 'Reserve Not Met'}
                </Badge>
              )}

              {/* Bid count - visible on hover */}
              <div className="flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white/90 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="relative p-5">
          {/* Title */}
          <h3 className="line-clamp-1 font-heading text-lg font-semibold tracking-tight transition-colors duration-300 group-hover:text-primary">
            {auction.listing.title}
          </h3>

          {/* Year Make Model */}
          <p className="mt-1.5 text-sm text-muted-foreground">
            {auction.listing.year} {auction.listing.make} {auction.listing.model}
          </p>

          {/* Location */}
          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground/80">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {auction.listing.locationCity}, {auction.listing.locationCountry}
          </p>

          {/* Seller Rating */}
          {auction.listing.seller && auction.listing.seller.totalReviews > 0 && (
            <div className="mt-2.5">
              <SellerRatingBadge
                averageRating={auction.listing.seller.averageRating}
                totalReviews={auction.listing.seller.totalReviews}
                size="sm"
              />
            </div>
          )}

          {/* Divider */}
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Price and bids */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {auction.currentBid ? 'Current bid' : 'Starting bid'}
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-primary">
                {formatCurrency(currentPrice, auction.listing.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm font-medium text-muted-foreground">
                <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                {auction.bidCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Link>

      {/* Watch button - Floating style */}
      {showWatchButton && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleWatch()
          }}
          disabled={isLoading}
          className={cn(
            'absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300',
            isWatching
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
              : 'bg-black/50 text-white/90 backdrop-blur-sm hover:bg-black/70',
            isLoading && 'cursor-not-allowed opacity-50',
            // Hide if non-running badge is present
            !auction.listing.isRunning && 'hidden'
          )}
          aria-label={isWatching ? `Stop watching ${auction.listing.title}` : `Watch ${auction.listing.title}`}
          aria-pressed={isWatching}
        >
          {isWatching ? (
            <Heart className={cn('h-5 w-5 fill-current', isLoading && 'animate-pulse')} aria-hidden="true" />
          ) : (
            <Eye className={cn('h-5 w-5', isLoading && 'animate-pulse')} aria-hidden="true" />
          )}
        </button>
      )}

      {/* Alternative watch button for non-running vehicles */}
      {showWatchButton && !auction.listing.isRunning && (
        <div className="border-t border-border/50 px-4 py-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleWatch()
            }}
            disabled={isLoading}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all duration-300',
              isWatching
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              isLoading && 'cursor-not-allowed opacity-50'
            )}
            aria-label={isWatching ? `Stop watching ${auction.listing.title}` : `Watch ${auction.listing.title}`}
            aria-pressed={isWatching}
          >
            {isWatching ? (
              <Heart className={cn('h-4 w-4 fill-current', isLoading && 'animate-pulse')} aria-hidden="true" />
            ) : (
              <Eye className={cn('h-4 w-4', isLoading && 'animate-pulse')} aria-hidden="true" />
            )}
            {isLoading ? 'Loading...' : isWatching ? 'Watching' : 'Watch'}
          </button>
        </div>
      )}
    </Card>
  )
}
