import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { AuctionDetailClient } from '@/components/auction/auction-detail-client'
import { ImageGallery } from './image-gallery'
import { Badge } from '@/components/ui/badge'
import { MapPin, Car, Wrench, FileText, User } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'
import { ActivityTimeline } from '@/components/auction/activity-timeline'
import { SellerRatingBadge } from '@/components/seller/seller-rating-badge'
import { SimilarAuctions } from '@/components/auction/similar-auctions'
import { FollowButton } from '@/components/seller/follow-button'
import { WatchlistButton } from '@/components/auction/watchlist-button'
import { ConditionGrid } from '@/components/listing/condition-grid'
import { PriceEstimate } from '@/components/auction/price-estimate'
import { WinnerReviewPrompt } from '@/components/seller/winner-review-prompt'
import { AskSellerButton } from '@/components/listing/ask-seller-button'

type PageProps = {
  params: Promise<{ id: string; locale: string }>
}

async function getAuction(id: string, userId?: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      listing: {
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              averageRating: true,
              totalReviews: true,
            },
          },
          media: {
            orderBy: { position: 'asc' },
          },
        },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          createdAt: true,
          bidderNumber: true,
          bidderCountry: true,
          bidderId: true,
        },
      },
      _count: {
        select: { watchlist: true },
      },
      watchlist: userId
        ? {
            where: { userId },
            take: 1,
          }
        : false,
      // Check if user already left a review
      sellerReviews: userId
        ? {
            where: { reviewerId: userId },
            take: 1,
            select: { id: true },
          }
        : false,
    },
  })

  return auction
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://finds.ro'

export async function generateMetadata({ params }: PageProps) {
  const { id, locale } = await params
  const auction = await getAuction(id)

  if (!auction) {
    return { title: 'Auction Not Found' }
  }

  const { listing } = auction
  const imageUrl = listing.media.find((m) => m.type === 'PHOTO')?.publicUrl

  return {
    title: `${listing.year} ${listing.make} ${listing.model} - Finds`,
    description: `${listing.title} - ${listing.description.slice(0, 140)}...`,
    keywords: [
      listing.make,
      listing.model,
      `${listing.year} ${listing.make}`,
      listing.category.toLowerCase().replace('_', ' '),
      'classic car',
      'auction',
      listing.locationCountry,
    ],
    openGraph: {
      title: `${listing.year} ${listing.make} ${listing.model}`,
      description: listing.description.slice(0, 200),
      type: 'website',
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${listing.year} ${listing.make} ${listing.model}`,
      description: listing.description.slice(0, 200),
      images: imageUrl ? [imageUrl] : undefined,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/auctions/${id}`,
    },
  }
}

export default async function AuctionDetailPage({ params }: PageProps) {
  const { id, locale } = await params
  const session = await auth()
  const auction = await getAuction(id, session?.user?.id)

  if (!auction) {
    notFound()
  }

  const { listing } = auction
  const photos = listing.media.filter((m) => m.type === 'PHOTO')
  const watchlistCount = auction._count.watchlist
  const isWatching = auction.watchlist && auction.watchlist.length > 0

  // Check if current user is the winner and can leave a review
  const isWinner = session?.user?.id && auction.winnerId === session.user.id
  const isPaid = auction.paymentStatus === 'PAID'
  const hasExistingReview = auction.sellerReviews && auction.sellerReviews.length > 0
  const canReview = isWinner && isPaid

  // Vehicle structured data for SEO and ML/LLM friendliness
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: listing.title,
    description: listing.description,
    brand: {
      '@type': 'Brand',
      name: listing.make,
    },
    model: listing.model,
    vehicleModelDate: listing.year.toString(),
    ...(listing.mileage && {
      mileageFromOdometer: {
        '@type': 'QuantitativeValue',
        value: listing.mileage,
        unitCode: listing.mileageUnit === 'KM' ? 'KMT' : 'SMI',
      },
    }),
    ...(listing.vin && { vehicleIdentificationNumber: listing.vin }),
    itemCondition: listing.isRunning
      ? 'https://schema.org/UsedCondition'
      : 'https://schema.org/DamagedCondition',
    offers: {
      '@type': 'Offer',
      priceCurrency: listing.currency,
      price: auction.currentBid
        ? Number(auction.currentBid)
        : Number(listing.startingPrice),
      availability: auction.status === 'ACTIVE'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      seller: {
        '@type': 'Organization',
        name: 'Finds',
        url: SITE_URL,
      },
      priceValidUntil: auction.currentEndTime.toISOString(),
    },
    ...(photos.length > 0 && {
      image: photos.map((p) => p.publicUrl),
    }),
    vehicleConfiguration: listing.category.toLowerCase().replace('_', ' '),
    ...(listing.locationCity && listing.locationCountry && {
      vehicleLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: listing.locationCity,
          addressCountry: listing.locationCountry,
        },
      },
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Main content */}
          <div className="min-w-0 lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Image Gallery */}
          <div className="overflow-hidden">
          <ImageGallery
            images={photos.map((p) => ({
              id: p.id,
              url: p.publicUrl,
              category: p.category,
            }))}
          />
          </div>

          {/* Title and badges */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{listing.title}</h1>
                <p className="mt-1.5 text-base text-muted-foreground sm:mt-2 sm:text-lg">
                  {listing.year} {listing.make} {listing.model}
                </p>
                {listing.estimateLow && listing.estimateHigh && (
                  <div className="mt-1">
                    <PriceEstimate
                      estimateLow={listing.estimateLow}
                      estimateHigh={listing.estimateHigh}
                      currency={listing.currency}
                    />
                  </div>
                )}
              </div>
              <WatchlistButton
                auctionId={auction.id}
                initialIsWatching={isWatching}
                initialWatchlistCount={watchlistCount}
                variant="outline"
                size="default"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
              <Badge variant={listing.isRunning ? 'success' : 'warning'}>
                {listing.isRunning ? 'Running' : 'Non-Running'}
              </Badge>
              <Badge variant="secondary">{listing.category.replace('_', ' ')}</Badge>
              {listing.conditionRating && (
                <Badge variant="outline">
                  Condition: {listing.conditionRating}/10
                </Badge>
              )}
            </div>
          </div>

          {/* Vehicle details */}
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3 sm:p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium sm:text-base">
                <Car className="h-4 w-4 flex-shrink-0" />
                Vehicle Info
              </h3>
              <dl className="mt-2 space-y-1.5 text-sm sm:mt-3 sm:space-y-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Make</dt>
                  <dd className="text-right">{listing.make}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Model</dt>
                  <dd className="text-right">{listing.model}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Year</dt>
                  <dd className="text-right">{listing.year}</dd>
                </div>
                {listing.mileage && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Mileage</dt>
                    <dd className="text-right">
                      {listing.mileage.toLocaleString()} {listing.mileageUnit}
                    </dd>
                  </div>
                )}
                {listing.vin && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">VIN</dt>
                    <dd className="text-right font-mono text-xs break-all">{listing.vin}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg border p-3 sm:p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium sm:text-base">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                Location
              </h3>
              <dl className="mt-2 space-y-1.5 text-sm sm:mt-3 sm:space-y-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">City</dt>
                  <dd className="text-right">{listing.locationCity}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Country</dt>
                  <dd className="text-right">{listing.locationCountry}</dd>
                </div>
                {listing.locationRegion && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Region</dt>
                    <dd className="text-right">{listing.locationRegion}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-lg border p-3 sm:p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium sm:text-base">
              <FileText className="h-4 w-4 flex-shrink-0" />
              Description
            </h3>
            <div className="mt-2 sm:mt-3">
              <Markdown content={listing.description} />
            </div>
          </div>

          {/* Condition Grid */}
          <div className="rounded-lg border p-3 sm:p-4">
            <ConditionGrid
              conditionOverall={listing.conditionOverall}
              conditionOverallNotes={listing.conditionOverallNotes}
              conditionPaintBody={listing.conditionPaintBody}
              conditionPaintBodyNotes={listing.conditionPaintBodyNotes}
              conditionInterior={listing.conditionInterior}
              conditionInteriorNotes={listing.conditionInteriorNotes}
              conditionFrame={listing.conditionFrame}
              conditionFrameNotes={listing.conditionFrameNotes}
              conditionMechanical={listing.conditionMechanical}
              conditionMechanicalNotes={listing.conditionMechanicalNotes}
            />
          </div>

          {/* Legacy Condition Notes (if detailed grid not available) */}
          {(listing.conditionNotes || listing.knownIssues) && (
            <div className="rounded-lg border p-3 sm:p-4">
              <h3 className="flex items-center gap-2 text-sm font-medium sm:text-base">
                <Wrench className="h-4 w-4 flex-shrink-0" />
                Condition Details
              </h3>
              {listing.conditionNotes && (
                <div className="mt-2 sm:mt-3">
                  <h4 className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Condition Notes
                  </h4>
                  <div className="mt-1">
                    <Markdown content={listing.conditionNotes} />
                  </div>
                </div>
              )}
              {listing.knownIssues && (
                <div className="mt-2 sm:mt-3">
                  <h4 className="text-xs font-medium text-muted-foreground sm:text-sm">
                    Known Issues
                  </h4>
                  <div className="mt-1">
                    <Markdown content={listing.knownIssues} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seller info - anonymized for privacy */}
          <div className="rounded-lg border p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-medium sm:text-base">Seller</h3>
              <div className="flex items-center gap-2">
                <FollowButton sellerId={listing.seller.id} size="sm" showText={false} />
                <Link
                  href={`/${locale}/sellers/${listing.seller.id}`}
                  className="text-xs text-primary hover:underline sm:text-sm flex items-center gap-1"
                >
                  <User className="h-3 w-3" />
                  View Profile
                </Link>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 sm:mt-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success text-sm text-success-foreground sm:h-10 sm:w-10">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium sm:text-base">
                  Verified Seller
                  <Badge variant="success" className="text-[10px]">Verified</Badge>
                </div>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Member since{' '}
                  {new Date(listing.seller.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                  })}
                </p>
                {listing.seller.totalReviews > 0 && (
                  <div className="mt-1">
                    <SellerRatingBadge
                      averageRating={listing.seller.averageRating}
                      totalReviews={listing.seller.totalReviews}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Ask Seller Button */}
            <div className="mt-4 border-t pt-4">
              <AskSellerButton listingId={listing.id} className="w-full" />
            </div>
          </div>

          {/* Winner Review Prompt */}
          {canReview && (
            <WinnerReviewPrompt
              auctionId={auction.id}
              sellerId={listing.seller.id}
              sellerName={listing.seller.name}
              vehicleInfo={{
                year: listing.year,
                make: listing.make,
                model: listing.model,
              }}
              hasExistingReview={hasExistingReview || false}
            />
          )}

          {/* Activity Timeline - Comments & Bids */}
          <ActivityTimeline
            auctionId={auction.id}
            listingId={listing.id}
            currency={listing.currency}
            locale={locale}
          />
        </div>

        {/* Sidebar - Bid Panel (Desktop) + Mobile Sticky Bar */}
        <div className="lg:col-span-1">
          <AuctionDetailClient auction={auction} />
        </div>
      </div>

      {/* Similar Objects - Full width below main content */}
      <div className="mt-8 sm:mt-12">
        <SimilarAuctions auctionId={id} />
      </div>
      </div>
    </>
  )
}
