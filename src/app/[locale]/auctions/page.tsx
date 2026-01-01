import { Suspense } from 'react'
import { AuctionCard } from '@/components/auction/auction-card'
import { AuctionFilters } from './auction-filters'
import { Loader2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function generateMetadata() {
  return {
    title: 'Live Auctions - Finds',
    description: 'Browse live auctions for classic cars, barn finds, and project vehicles',
  }
}

type SearchParams = {
  page?: string
  category?: string
  country?: string
  min_price?: string
  max_price?: string
  sort?: string
  q?: string
}

async function getAuctions(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 20
  const category = searchParams.category || undefined
  const minPrice = searchParams.min_price ? parseInt(searchParams.min_price) : undefined
  const maxPrice = searchParams.max_price ? parseInt(searchParams.max_price) : undefined
  const country = searchParams.country || undefined
  const searchQuery = searchParams.q || undefined
  const sortBy = (searchParams.sort as 'ending_soon' | 'newly_listed' | 'price_low' | 'price_high' | 'most_bids' | 'relevance') || 'ending_soon'

  // Use auction service for consistent logic with API
  const { getActiveAuctions } = await import('@/services/auction.service')

  const result = await getActiveAuctions({
    page,
    limit,
    category,
    minPrice,
    maxPrice,
    country,
    sortBy,
    searchQuery,
  })

  return result
}

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const [{ auctions, pagination }, session] = await Promise.all([
    getAuctions(params),
    auth(),
  ])

  // Get user's watchlist to show which auctions they're watching
  let watchedAuctionIds: Set<string> = new Set()
  if (session?.user?.id) {
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: session.user.id },
      select: { auctionId: true },
    })
    watchedAuctionIds = new Set(watchlist.map((w) => w.auctionId))
  }

  const searchQuery = params.q

  return (
    <div className="container px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mb-6 sm:mb-10">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {searchQuery ? 'Search Results' : 'Live Auctions'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-lg">
          {searchQuery ? (
            <>
              {pagination.total} {pagination.total === 1 ? 'result' : 'results'} for{' '}
              <span className="font-medium text-foreground">&ldquo;{searchQuery}&rdquo;</span>
            </>
          ) : (
            <>Browse {pagination.total} active auctions for classic cars, barn finds, and project vehicles</>
          )}
        </p>
      </div>

      {/* Filters */}
      <AuctionFilters />

      {/* Auctions Grid */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading auctions...</p>
            </div>
          </div>
        }
      >
        {auctions.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border/50 bg-muted/30 p-8 text-center sm:rounded-2xl sm:p-16">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-muted sm:mb-6 sm:h-20 sm:w-20 sm:rounded-2xl">
              <Loader2 className="h-8 w-8 text-muted-foreground sm:h-10 sm:w-10" />
            </div>
            <p className="text-lg font-semibold text-foreground sm:text-xl">
              No active auctions match your filters
            </p>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4">
            {auctions.map((auction: typeof auctions[number]) => (
              <AuctionCard
                key={auction.id}
                auction={{
                  id: auction.id,
                  currentBid: auction.currentBid ? Number(auction.currentBid) : null,
                  bidCount: auction.bidCount,
                  currentEndTime: auction.currentEndTime,
                  reserveMet: auction.reserveMet,
                  listing: {
                    id: auction.listing.id,
                    title: auction.listing.title,
                    year: auction.listing.year,
                    make: auction.listing.make,
                    model: auction.listing.model,
                    startingPrice: Number(auction.listing.startingPrice),
                    currency: auction.listing.currency,
                    locationCity: auction.listing.locationCity,
                    locationCountry: auction.listing.locationCountry,
                    isRunning: auction.listing.isRunning,
                    media: auction.listing.media,
                  },
                }}
                showWatchButton
                isWatching={watchedAuctionIds.has(auction.id)}
              />
            ))}
          </div>
        )}
      </Suspense>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-12">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <a
                key={page}
                href={`?page=${page}${params.category ? `&category=${params.category}` : ''}${params.country ? `&country=${params.country}` : ''}${params.sort ? `&sort=${params.sort}` : ''}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all sm:px-4 sm:py-2 sm:text-base ${
                  page === pagination.page
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'bg-muted hover:bg-muted/80 hover:shadow-sm'
                }`}
              >
                {page}
              </a>
            )
          )}
        </div>
      )}
    </div>
  )
}
