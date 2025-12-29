'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AuctionCard } from './auction-card'
import { Heart } from 'lucide-react'

type SimilarAuction = {
  id: string
  currentBid: number | null
  bidCount: number
  currentEndTime: string
  reserveMet: boolean
  watchlistCount: number
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
    seller: {
      id: string
      averageRating: number | null
      totalReviews: number
    }
  }
}

type SimilarAuctionsProps = {
  auctionId: string
}

export function SimilarAuctions({ auctionId }: SimilarAuctionsProps) {
  const t = useTranslations('auction')
  const [auctions, setAuctions] = useState<SimilarAuction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchSimilarAuctions() {
      try {
        setIsLoading(true)
        setError(false)

        const response = await fetch(`/api/auctions/${auctionId}/similar`)

        if (!response.ok) {
          throw new Error('Failed to fetch similar auctions')
        }

        const data = await response.json()
        setAuctions(data)
      } catch (err) {
        console.error('Error fetching similar auctions:', err)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSimilarAuctions()
  }, [auctionId])

  // Don't render anything if loading, error, or no results
  if (isLoading || error || auctions.length === 0) {
    return null
  }

  return (
    <section className="space-y-4 sm:space-y-6" aria-labelledby="similar-objects-heading">
      <h2
        id="similar-objects-heading"
        className="text-xl font-semibold tracking-tight sm:text-2xl"
      >
        {t('similarObjects')}
      </h2>

      {/* Mobile: Horizontal scrollable row */}
      <div className="lg:hidden">
        <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          {auctions.map((auction) => (
            <div
              key={auction.id}
              className="w-[280px] flex-shrink-0 sm:w-[320px]"
            >
              <div className="relative">
                <AuctionCard
                  auction={{
                    ...auction,
                    currentEndTime: new Date(auction.currentEndTime),
                  }}
                />
                {/* Watchlist count badge - Catawiki style */}
                {auction.watchlistCount > 0 && (
                  <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    <Heart className="h-3 w-3 fill-white" aria-hidden="true" />
                    <span>{auction.watchlistCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
        {auctions.map((auction) => (
          <div key={auction.id} className="relative">
            <AuctionCard
              auction={{
                ...auction,
                currentEndTime: new Date(auction.currentEndTime),
              }}
            />
            {/* Watchlist count badge - Catawiki style */}
            {auction.watchlistCount > 0 && (
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                <Heart className="h-3 w-3 fill-white" aria-hidden="true" />
                <span>{auction.watchlistCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
