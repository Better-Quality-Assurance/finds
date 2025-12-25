import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { AuctionCard } from '@/components/auction/auction-card'
import { AuctionFilters } from './auction-filters'
import { Loader2 } from 'lucide-react'

export async function generateMetadata() {
  const t = await getTranslations('auction')
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
}

async function getAuctions(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1')
  const limit = 20

  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    currentEndTime: { gt: new Date() },
  }

  // Build listing filters
  const listingWhere: Record<string, unknown> = {}
  if (searchParams.category) {
    listingWhere.category = searchParams.category
  }
  if (searchParams.country) {
    listingWhere.locationCountry = searchParams.country
  }
  if (searchParams.min_price || searchParams.max_price) {
    listingWhere.startingPrice = {}
    if (searchParams.min_price) {
      (listingWhere.startingPrice as Record<string, number>).gte = parseInt(searchParams.min_price)
    }
    if (searchParams.max_price) {
      (listingWhere.startingPrice as Record<string, number>).lte = parseInt(searchParams.max_price)
    }
  }

  if (Object.keys(listingWhere).length > 0) {
    where.listing = listingWhere
  }

  // Sort order
  let orderBy: Record<string, unknown> = { currentEndTime: 'asc' }
  switch (searchParams.sort) {
    case 'newly_listed':
      orderBy = { startTime: 'desc' }
      break
    case 'price_low':
      orderBy = { currentBid: 'asc' }
      break
    case 'price_high':
      orderBy = { currentBid: 'desc' }
      break
    case 'most_bids':
      orderBy = { bidCount: 'desc' }
      break
  }

  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        listing: {
          include: {
            media: {
              where: { type: 'PHOTO' },
              take: 1,
              orderBy: { position: 'asc' },
            },
          },
        },
        _count: {
          select: { bids: true },
        },
      },
    }),
    prisma.auction.count({ where }),
  ])

  return {
    auctions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { auctions, pagination } = await getAuctions(params)

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Live Auctions</h1>
        <p className="mt-2 text-muted-foreground">
          Browse {pagination.total} active auctions for classic cars, barn finds, and project vehicles
        </p>
      </div>

      {/* Filters */}
      <AuctionFilters />

      {/* Auctions Grid */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        {auctions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-16 text-center">
            <p className="text-lg text-muted-foreground">
              No active auctions match your filters.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {auctions.map((auction) => (
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
              />
            ))}
          </div>
        )}
      </Suspense>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <a
                key={page}
                href={`?page=${page}${params.category ? `&category=${params.category}` : ''}${params.country ? `&country=${params.country}` : ''}${params.sort ? `&sort=${params.sort}` : ''}`}
                className={`rounded px-3 py-1 ${
                  page === pagination.page
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
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
