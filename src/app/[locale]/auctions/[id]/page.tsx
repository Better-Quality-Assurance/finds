import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { BidPanel } from '@/components/auction/bid-panel'
import { ImageGallery } from './image-gallery'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { MapPin, Calendar, Gauge, Car, Wrench, FileText } from 'lucide-react'

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

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const auction = await getAuction(id)

  if (!auction) {
    return { title: 'Auction Not Found' }
  }

  return {
    title: `${auction.listing.title} - Finds`,
    description: auction.listing.description.slice(0, 160),
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

  return (
    <div className="container py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
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
            <h1 className="text-3xl font-bold">{listing.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {listing.year} {listing.make} {listing.model}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <Car className="h-4 w-4" />
                Vehicle Info
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Make</dt>
                  <dd>{listing.make}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Model</dt>
                  <dd>{listing.model}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Year</dt>
                  <dd>{listing.year}</dd>
                </div>
                {listing.mileage && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Mileage</dt>
                    <dd>
                      {listing.mileage.toLocaleString()} {listing.mileageUnit}
                    </dd>
                  </div>
                )}
                {listing.vin && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">VIN</dt>
                    <dd className="font-mono text-xs">{listing.vin}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">City</dt>
                  <dd>{listing.locationCity}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Country</dt>
                  <dd>{listing.locationCountry}</dd>
                </div>
                {listing.locationRegion && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Region</dt>
                    <dd>{listing.locationRegion}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-lg border p-4">
            <h3 className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4" />
              Description
            </h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* Condition */}
          {(listing.conditionNotes || listing.knownIssues) && (
            <div className="rounded-lg border p-4">
              <h3 className="flex items-center gap-2 font-medium">
                <Wrench className="h-4 w-4" />
                Condition Details
              </h3>
              {listing.conditionNotes && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Condition Notes
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {listing.conditionNotes}
                  </p>
                </div>
              )}
              {listing.knownIssues && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Known Issues
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {listing.knownIssues}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Seller info */}
          <div className="rounded-lg border p-4">
            <h3 className="font-medium">Seller</h3>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {listing.seller.name?.[0]?.toUpperCase() || 'S'}
              </div>
              <div>
                <p className="font-medium">{listing.seller.name || 'Seller'}</p>
                <p className="text-sm text-muted-foreground">
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

        {/* Sidebar - Bid Panel */}
        <div className="lg:col-span-1">
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
  )
}
