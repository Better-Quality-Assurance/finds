import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { User, Calendar, Package } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SellerRatingBadge } from '@/components/seller/seller-rating-badge'
import { SellerReviewsList } from '@/components/seller/seller-reviews-list'
import { FollowButton } from '@/components/seller/follow-button'
import { formatDistanceToNow } from 'date-fns'
import { enUS, ro } from 'date-fns/locale'
import { Users } from 'lucide-react'

interface SellerProfilePageProps {
  params: {
    locale: string
    id: string
  }
}

export async function generateMetadata({
  params,
}: SellerProfilePageProps) {
  const seller = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true },
  })

  if (!seller) {
    return {
      title: 'Seller Not Found',
    }
  }

  return {
    title: `${seller.name || 'Seller'} - Finds`,
    description: `View seller profile and reviews for ${seller.name || 'this seller'}`,
  }
}

export default async function SellerProfilePage({
  params,
}: SellerProfilePageProps) {
  const t = await getTranslations()
  const dateLocale = params.locale === 'ro' ? ro : enUS

  // Fetch seller data
  const seller = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      image: true,
      createdAt: true,
      averageRating: true,
      totalReviews: true,
      followerCount: true,
      _count: {
        select: {
          listings: true,
        },
      },
    },
  })

  if (!seller) {
    notFound()
  }

  // Fetch active listings count
  const activeListingsCount = await prisma.listing.count({
    where: {
      sellerId: seller.id,
      status: {
        in: ['ACTIVE', 'APPROVED'],
      },
    },
  })

  // Fetch active auctions
  const activeAuctions = await prisma.auction.findMany({
    where: {
      listing: {
        sellerId: seller.id,
      },
      status: {
        in: ['SCHEDULED', 'ACTIVE', 'EXTENDED'],
      },
    },
    include: {
      listing: {
        include: {
          media: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
    orderBy: {
      startTime: 'desc',
    },
    take: 6,
  })

  return (
    <div className="container py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar - Seller Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={seller.image || undefined}
                    alt={seller.name || 'Seller'}
                  />
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>

                <div>
                  <h1 className="text-2xl font-bold">
                    {seller.name || 'Seller'}
                  </h1>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t('reviews.memberSince')}{' '}
                      {formatDistanceToNow(new Date(seller.createdAt), {
                        addSuffix: false,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                </div>

                {seller.totalReviews > 0 && (
                  <div className="pt-2">
                    <SellerRatingBadge
                      averageRating={seller.averageRating}
                      totalReviews={seller.totalReviews}
                      size="lg"
                    />
                  </div>
                )}

                <div className="w-full pt-4">
                  <FollowButton sellerId={seller.id} className="w-full" />
                </div>

                <div className="w-full pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {t('seller.followers')}
                    </span>
                    <Badge variant="secondary">
                      {seller.followerCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('reviews.totalListings')}
                    </span>
                    <Badge variant="secondary">
                      {seller._count.listings}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t('reviews.activeListings')}
                    </span>
                    <Badge variant="secondary">
                      {activeListingsCount}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Auctions */}
          {activeAuctions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('reviews.activeAuctions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeAuctions.map((auction) => (
                    <Link
                      key={auction.id}
                      href={`/${params.locale}/auctions/${auction.id}`}
                      className="group"
                    >
                      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                        <div className="aspect-video relative bg-muted">
                          {auction.listing.media[0] && (
                            <img
                              src={auction.listing.media[0].publicUrl}
                              alt={auction.listing.title}
                              className="object-cover w-full h-full"
                            />
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {auction.listing.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {auction.listing.make} {auction.listing.model}
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
                {activeAuctions.length === 6 && (
                  <div className="text-center mt-4">
                    <Button variant="outline" asChild>
                      <Link href={`/${params.locale}/auctions`}>
                        {t('reviews.viewAllListings')}
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reviews.reviews')}</CardTitle>
            </CardHeader>
            <CardContent>
              <SellerReviewsList sellerId={seller.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
