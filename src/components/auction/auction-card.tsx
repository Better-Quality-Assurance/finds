'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useAuctionTimer } from '@/hooks/use-pusher'
import { Clock, Gavel, MapPin, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    }
  }
  showWatchButton?: boolean
  isWatching?: boolean
  onWatch?: () => void
}

export function AuctionCard({
  auction,
  showWatchButton = false,
  isWatching = false,
  onWatch,
}: AuctionCardProps) {
  const { timeRemaining, isEnded, seconds } = useAuctionTimer(auction.currentEndTime)
  const isEndingSoon = seconds > 0 && seconds < 600 // Less than 10 minutes

  const currentPrice = auction.currentBid
    ? Number(auction.currentBid)
    : Number(auction.listing.startingPrice)

  const primaryPhoto = auction.listing.media[0]

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg" role="article" aria-label={`Auction for ${auction.listing.year} ${auction.listing.make} ${auction.listing.model}`}>
      <Link href={`/auctions/${auction.id}`}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.publicUrl}
              alt={`${auction.listing.year} ${auction.listing.make} ${auction.listing.model}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={false}
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center" role="img" aria-label="No image available">
              <Gavel className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {/* Time badge */}
          <div
            className={cn(
              'absolute left-2 top-2 flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-white',
              isEnded
                ? 'bg-gray-600'
                : isEndingSoon
                  ? 'animate-pulse bg-red-500'
                  : 'bg-black/70'
            )}
            aria-label={`Time remaining: ${timeRemaining}`}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span aria-hidden="true">{timeRemaining}</span>
          </div>

          {/* Running status */}
          {!auction.listing.isRunning && (
            <Badge
              variant="warning"
              className="absolute right-2 top-2"
            >
              Non-Running
            </Badge>
          )}

          {/* Reserve badge */}
          {auction.currentBid && (
            <div className="absolute bottom-2 left-2">
              <Badge
                variant={auction.reserveMet ? 'success' : 'secondary'}
              >
                {auction.reserveMet ? 'Reserve Met' : 'Reserve Not Met'}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Title */}
          <h3 className="line-clamp-1 font-semibold">
            {auction.listing.title}
          </h3>

          {/* Year Make Model */}
          <p className="mt-1 text-sm text-muted-foreground">
            {auction.listing.year} {auction.listing.make} {auction.listing.model}
          </p>

          {/* Location */}
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {auction.listing.locationCity}, {auction.listing.locationCountry}
          </p>

          {/* Price and bids */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {auction.currentBid ? 'Current Bid' : 'Starting Bid'}
              </p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(currentPrice, auction.listing.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                {auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'}
              </p>
            </div>
          </div>
        </CardContent>
      </Link>

      {/* Watch button */}
      {showWatchButton && (
        <div className="border-t px-4 py-2">
          <button
            onClick={(e) => {
              e.preventDefault()
              onWatch?.()
            }}
            className={cn(
              'flex w-full items-center justify-center gap-1 rounded py-1.5 text-sm transition-colors',
              isWatching
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            )}
            aria-label={isWatching ? `Stop watching ${auction.listing.title}` : `Watch ${auction.listing.title}`}
            aria-pressed={isWatching}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {isWatching ? 'Watching' : 'Watch'}
          </button>
        </div>
      )}
    </Card>
  )
}
