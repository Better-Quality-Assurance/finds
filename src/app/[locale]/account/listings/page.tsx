import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Plus, Car, Eye, Edit, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Lightbulb } from 'lucide-react'
import { RelistButton } from '@/components/listing/relist-button'

export async function generateMetadata() {
  const t = await getTranslations('sellerDashboard')
  return {
    title: t('title'),
    description: t('description'),
  }
}

type ListingStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SOLD' | 'WITHDRAWN' | 'EXPIRED'

const STATUS_CONFIG: Record<ListingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; icon: typeof Clock }> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: Edit },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'warning', icon: Clock },
  CHANGES_REQUESTED: { label: 'Changes Requested', variant: 'warning', icon: AlertCircle },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  ACTIVE: { label: 'Live Auction', variant: 'default', icon: Car },
  SOLD: { label: 'Sold', variant: 'success', icon: CheckCircle },
  WITHDRAWN: { label: 'Withdrawn', variant: 'secondary', icon: XCircle },
  EXPIRED: { label: 'Expired', variant: 'secondary', icon: Clock },
}

export default async function SellerDashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/account/listings')
  }

  const t = await getTranslations('sellerDashboard')

  const listings = await prisma.listing.findMany({
    where: { sellerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      media: {
        where: { type: 'PHOTO' },
        take: 1,
        orderBy: { position: 'asc' },
      },
      auction: {
        select: {
          id: true,
          status: true,
          currentBid: true,
          startTime: true,
          currentEndTime: true,
        },
      },
      aiImprovements: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          suggestedStartingPrice: true,
          suggestedReserve: true,
          avgMarketPrice: true,
          pricingReasoning: true,
          topPriorities: true,
          reason: true,
          localSalesCount: true,
          globalSalesCount: true,
        },
      },
    },
  })

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/sell">
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">{t('noListings')}</h2>
            <p className="mt-2 text-muted-foreground">
              Start by creating your first vehicle listing.
            </p>
            <Button asChild className="mt-6">
              <Link href="/sell">
                <Plus className="mr-2 h-4 w-4" />
                {t('createListing')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {listings.map((listing) => {
            const status = listing.status as ListingStatus
            const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
            const StatusIcon = statusConfig.icon
            const primaryPhoto = listing.media[0]

            return (
              <Card key={listing.id}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative h-48 w-full flex-shrink-0 md:h-auto md:w-64">
                      {primaryPhoto ? (
                        <div className="relative h-full w-full md:rounded-l-lg overflow-hidden">
                          <Image
                            src={primaryPhoto.publicUrl}
                            alt={listing.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 256px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted md:rounded-l-lg">
                          <Car className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge
                        variant={statusConfig.variant}
                        className="absolute left-2 top-2 z-10"
                      >
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {listing.title || `${listing.year} ${listing.make} ${listing.model}`}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {listing.locationCity}, {listing.locationCountry}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Starting Price:</span>{' '}
                            <span className="font-medium">
                              {formatCurrency(Number(listing.startingPrice), listing.currency)}
                            </span>
                          </div>
                          {listing.reservePrice && (
                            <div>
                              <span className="text-muted-foreground">Reserve:</span>{' '}
                              <span className="font-medium">
                                {formatCurrency(Number(listing.reservePrice), listing.currency)}
                              </span>
                            </div>
                          )}
                          {listing.auction?.currentBid && (
                            <div>
                              <span className="text-muted-foreground">Current Bid:</span>{' '}
                              <span className="font-medium text-primary">
                                {formatCurrency(Number(listing.auction.currentBid), listing.currency)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Status-specific messages */}
                        {status === 'CHANGES_REQUESTED' && listing.rejectionReason && (
                          <div className="mt-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
                            <strong>Changes requested:</strong> {listing.rejectionReason}
                          </div>
                        )}
                        {status === 'REJECTED' && listing.rejectionReason && (
                          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                            <strong>Rejection reason:</strong> {listing.rejectionReason}
                          </div>
                        )}
                        {(status === 'EXPIRED' || status === 'WITHDRAWN') && listing.aiImprovements[0] && (
                          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <Lightbulb className="h-4 w-4" />
                              {t('aiSuggestionsAvailable')}
                            </div>
                            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                              {listing.aiImprovements[0].topPriorities.slice(0, 2).map((tip, i) => (
                                <li key={i}>• {tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(status === 'DRAFT' || status === 'CHANGES_REQUESTED') && (
                          <Button asChild size="sm">
                            <Link href={`/sell?listing=${listing.id}`}>
                              <Edit className="mr-1 h-4 w-4" />
                              {t('editListing')}
                            </Link>
                          </Button>
                        )}
                        {(status === 'EXPIRED' || status === 'WITHDRAWN') && (
                          <RelistButton
                            listingId={listing.id}
                            listingTitle={listing.title || `${listing.year} ${listing.make} ${listing.model}`}
                            currentStartingPrice={Number(listing.startingPrice)}
                            currentReserve={listing.reservePrice ? Number(listing.reservePrice) : null}
                            currency={listing.currency}
                            improvement={listing.aiImprovements[0] ? {
                              id: listing.aiImprovements[0].id,
                              suggestedStartingPrice: listing.aiImprovements[0].suggestedStartingPrice
                                ? Number(listing.aiImprovements[0].suggestedStartingPrice)
                                : null,
                              suggestedReserve: listing.aiImprovements[0].suggestedReserve
                                ? Number(listing.aiImprovements[0].suggestedReserve)
                                : null,
                              avgMarketPrice: listing.aiImprovements[0].avgMarketPrice
                                ? Number(listing.aiImprovements[0].avgMarketPrice)
                                : null,
                              pricingReasoning: listing.aiImprovements[0].pricingReasoning,
                              topPriorities: listing.aiImprovements[0].topPriorities,
                              reason: listing.aiImprovements[0].reason,
                              localSalesCount: listing.aiImprovements[0].localSalesCount,
                              globalSalesCount: listing.aiImprovements[0].globalSalesCount,
                            } : null}
                          />
                        )}
                        {status === 'ACTIVE' && listing.auction && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/auctions/${listing.auction.id}`}>
                              <Eye className="mr-1 h-4 w-4" />
                              View Auction
                            </Link>
                          </Button>
                        )}
                        {status !== 'ACTIVE' && status !== 'SOLD' && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/listings/${listing.id}`}>
                              <Eye className="mr-1 h-4 w-4" />
                              {t('viewListing')}
                            </Link>
                          </Button>
                        )}
                        {status === 'DRAFT' && (
                          <Button size="sm" variant="destructive">
                            <Trash2 className="mr-1 h-4 w-4" />
                            {t('deleteListing')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
