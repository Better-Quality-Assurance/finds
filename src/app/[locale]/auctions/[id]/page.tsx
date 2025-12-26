import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { BidPanel } from '@/components/auction/bid-panel'
import { ImageGallery } from './image-gallery'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { MapPin, Calendar, Gauge, Car, Wrench, FileText } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'

type PageProps = {
  params: Promise<{ id: string; locale: string }>
}

async function getAuction(id: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      listing: {
        include: {
          seller: {
            select: { id: true, name: true, createdAt: true },
          },
          media: {
            orderBy: { position: 'asc' },
          },
        },
      },
      bids: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          bidder: {
            select: { id: true, name: true },
          },
        },
      },
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
  const { id } = await params
  const auction = await getAuction(id)

  if (!auction) {
    notFound()
  }

  const { listing } = auction
  const photos = listing.media.filter((m) => m.type === 'PHOTO')

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
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Image Gallery */}
          <ImageGallery
            images={photos.map((p) => ({
              id: p.id,
              url: p.publicUrl,
              category: p.category,
            }))}
          />

          {/* Title and badges */}
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">{listing.title}</h1>
            <p className="mt-1.5 text-base text-muted-foreground sm:mt-2 sm:text-lg">
              {listing.year} {listing.make} {listing.model}
            </p>
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

          {/* Mobile Bid Summary - Shows above content on mobile */}
          <div className="lg:hidden">
            <BidPanel
              auction={{
                id: auction.id,
                currentBid: auction.currentBid ? Number(auction.currentBid) : null,
                bidCount: auction.bidCount,
                currentEndTime: auction.currentEndTime.toISOString(),
                reserveMet: auction.reserveMet,
                extensionCount: auction.extensionCount,
                status: auction.status,
                listing: {
                  startingPrice: Number(listing.startingPrice),
                  reservePrice: listing.reservePrice ? Number(listing.reservePrice) : null,
                  currency: listing.currency,
                  sellerId: listing.sellerId,
                },
              }}
              bids={auction.bids.map((b) => ({
                id: b.id,
                amount: Number(b.amount),
                createdAt: b.createdAt.toISOString(),
                bidder: b.bidder,
              }))}
            />
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

          {/* Condition */}
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

          {/* Seller info */}
          <div className="rounded-lg border p-3 sm:p-4">
            <h3 className="text-sm font-medium sm:text-base">Seller</h3>
            <div className="mt-2 flex items-center gap-3 sm:mt-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground sm:h-10 sm:w-10">
                {listing.seller.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium sm:text-base">{listing.seller.name || 'Seller'}</p>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Member since{' '}
                  {new Date(listing.seller.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Bid Panel (Desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-4">
            <BidPanel
              auction={{
                id: auction.id,
                currentBid: auction.currentBid ? Number(auction.currentBid) : null,
                bidCount: auction.bidCount,
                currentEndTime: auction.currentEndTime.toISOString(),
                reserveMet: auction.reserveMet,
                extensionCount: auction.extensionCount,
                status: auction.status,
                listing: {
                  startingPrice: Number(listing.startingPrice),
                  reservePrice: listing.reservePrice ? Number(listing.reservePrice) : null,
                  currency: listing.currency,
                  sellerId: listing.sellerId,
                },
              }}
              bids={auction.bids.map((b) => ({
                id: b.id,
                amount: Number(b.amount),
                createdAt: b.createdAt.toISOString(),
                bidder: b.bidder,
              }))}
            />
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
