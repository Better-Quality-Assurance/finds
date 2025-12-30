'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Gavel, ArrowRight } from 'lucide-react'
import Pusher from 'pusher-js'
import { CHANNELS, EVENTS, type NewBidEvent } from '@/lib/pusher'

type BidData = {
  id: string
  amount: number
  currency: string
  createdAt: string
  bidderNumber: number
  bidderCountry: string | null
  auction: {
    id: string
    currentEndTime: string
    reserveMet: boolean
  }
  listing: {
    id: string
    title: string
    year: number
    make: string
    model: string
    currency: string
    imageUrl: string | null
  }
}

type LatestBidsResponse = {
  bids: BidData[]
  liveAuctionCount: number
}

// Singleton Pusher instance for client-side
let pusherInstance: Pusher | null = null

function getPusherInstance(): Pusher {
  if (!pusherInstance) {
    pusherInstance = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
  }
  return pusherInstance
}

export function LatestBidsSection() {
  const [bids, setBids] = useState<BidData[]>([])
  const [liveCount, setLiveCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch initial data
  useEffect(() => {
    async function fetchLatestBids() {
      try {
        const response = await fetch('/api/home/latest-bids')
        if (!response.ok) {
          throw new Error('Failed to fetch latest bids')
        }
        const data: LatestBidsResponse = await response.json()
        setBids(data.bids)
        setLiveCount(data.liveAuctionCount)
      } catch (error) {
        console.error('Error fetching latest bids:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLatestBids()
  }, [])

  // Subscribe to Pusher public channel for real-time bid updates
  useEffect(() => {
    const pusher = getPusherInstance()
    const channel = pusher.subscribe(CHANNELS.public)

    const handleNewBid = async (_data: NewBidEvent) => {
      // Fetch the full bid details
      try {
        const response = await fetch('/api/home/latest-bids')
        if (!response.ok) {
          return
        }

        const freshData: LatestBidsResponse = await response.json()

        // Update bids and live count
        setBids(freshData.bids)
        setLiveCount(freshData.liveAuctionCount)
      } catch (error) {
        console.error('Error updating bid:', error)
      }
    }

    channel.bind(EVENTS.NEW_BID, handleNewBid)

    return () => {
      channel.unbind(EVENTS.NEW_BID, handleNewBid)
      pusher.unsubscribe(CHANNELS.public)
    }
  }, [])

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
              Latest Bids
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {liveCount} {liveCount === 1 ? 'auction' : 'auctions'} now live
            </p>
          </div>
          <Link
            href="/auctions"
            className="group inline-flex items-center gap-2 text-primary hover:underline"
          >
            View All Auctions
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

function BidCard({ bid }: { bid: BidData }) {
  const vehicleTitle = bid.listing.title ||
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
                  Reserve Met
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
                    Latest Bid
                  </p>
                  <p className="font-mono text-xl font-bold text-primary">
                    {formatCurrency(bid.amount, bid.listing.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Gavel className="h-3 w-3" />
                    Bidder #{bid.bidderNumber}
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
