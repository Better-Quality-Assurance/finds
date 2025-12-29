'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Star, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { enUS, ro } from 'date-fns/locale'
import { useLocale } from 'next-intl'

interface Review {
  id: string
  rating: number
  title?: string | null
  content?: string | null
  createdAt: string
  reviewer: {
    id: string
    name: string | null
    image: string | null
  }
  auction: {
    id: string
    listing: {
      title: string
      make: string
      model: string
      year: number
    }
  }
}

interface ReviewsResponse {
  reviews: Review[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    averageRating: number | null
    totalReviews: number
  }
}

interface SellerReviewsListProps {
  sellerId: string
}

export function SellerReviewsList({ sellerId }: SellerReviewsListProps) {
  const t = useTranslations()
  const locale = useLocale()
  const [data, setData] = useState<ReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/sellers/${sellerId}/reviews?page=${page}&limit=10`
        )
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error('Error fetching reviews:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [sellerId, page])

  const dateLocale = locale === 'ro' ? ro : enUS

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (!data || data.reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          {t('reviews.noReviews')}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {data.reviews.map((review) => (
          <Card key={review.id} className="p-6">
            <div className="flex gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={review.reviewer.image || undefined}
                  alt={review.reviewer.name || 'Reviewer'}
                />
                <AvatarFallback>
                  <UserIcon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {review.reviewer.name || 'Anonymous'}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-muted text-muted'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.createdAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </p>
                  </div>
                </div>

                {review.title && (
                  <h4 className="font-semibold text-foreground">
                    {review.title}
                  </h4>
                )}

                {review.content && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {review.content}
                  </p>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {t('reviews.reviewFor')}{' '}
                    <span className="font-medium text-foreground">
                      {review.auction.listing.year}{' '}
                      {review.auction.listing.make}{' '}
                      {review.auction.listing.model}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('common.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('common.page')} {page} {t('common.of')}{' '}
            {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) =>
                Math.min(data.pagination.totalPages, p + 1)
              )
            }
            disabled={page === data.pagination.totalPages}
          >
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  )
}
