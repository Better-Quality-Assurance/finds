'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Gavel, ArrowRight } from 'lucide-react'
import { useLatestBids, type LatestBid } from '@/hooks/use-latest-bids'

export function LatestBidsSection() {
  const t = useTranslations('home.latestBids')
  const { bids, liveAuctionCount, isLoading } = useLatestBids()

  if (isLoading) {
    return (
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-48 w-80 flex-shrink-0 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (bids.length === 0) {
    return null
  }

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {t('liveCount', { count: liveAuctionCount })}
            </p>
          </div>
          <Link
            href="/auctions"
            className="group inline-flex items-center gap-2 text-primary hover:underline"
          >
            {t('viewAll')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Horizontal scrollable carousel */}
        <div className="relative -mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {bids.map((bid) => (
              <BidCard key={bid.id} bid={bid} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function BidCard({ bid }: { bid: LatestBid }) {
  const t = useTranslations('home.latestBids')
  const tAuction = useTranslations('auction')

  const vehicleTitle =
    bid.listing.title ||
    `${bid.listing.year} ${bid.listing.make} ${bid.listing.model}`

  return (
    <Link href={`/auctions/${bid.auction.id}`}>
      <Card
        variant="elevated"
        className="group w-80 flex-shrink-0 snap-start overflow-hidden transition-all hover:shadow-xl md:w-96"
      >
        <div className="flex h-full flex-col">
          {/* Image */}
          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
            {bid.listing.imageUrl ? (
              <Image
                src={bid.listing.imageUrl}
                alt={vehicleTitle}
                fill
                sizes="(max-width: 640px) 320px, 384px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Gavel className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Reserve badge */}
            {bid.auction.reserveMet && (
              <div className="absolute bottom-3 left-3">
                <div className="rounded-full bg-success/90 px-3 py-1 text-xs font-semibold text-success-foreground backdrop-blur-sm">
                  {tAuction('reserveMet')}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="flex flex-1 flex-col p-4">
            {/* Vehicle title */}
            <h3 className="line-clamp-1 font-heading text-lg font-semibold tracking-tight">
              {vehicleTitle}
            </h3>

            {/* Bid details */}
            <div className="mt-auto pt-4">
              <div className="flex items-end justify-between border-t border-border/50 pt-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('latestBid')}
                  </p>
                  <p className="font-mono text-xl font-bold text-primary">
                    {formatCurrency(bid.amount, bid.listing.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Gavel className="h-3 w-3" />
                    {t('bidder', { number: bid.bidderNumber })}
                  </p>
                  {bid.bidderCountry && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {bid.bidderCountry}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  )
}
