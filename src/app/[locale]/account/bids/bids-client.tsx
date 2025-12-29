'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Gavel,
  Trophy,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { enUS, ro } from 'date-fns/locale'
import { useLocale } from 'next-intl'

type BidStatus = 'active' | 'won' | 'lost' | 'outbid'
type FilterStatus = 'all' | 'active' | 'won' | 'lost'

interface Bid {
  id: string
  amount: number
  currency: string
  createdAt: string
  status: BidStatus
  auction: {
    id: string
    status: string
    currentBid: number | null
    finalPrice: number | null
    endTime: string
  }
  listing: {
    id: string
    title: string
    make: string
    model: string
    year: number
    image: string | null
  }
}

interface BidsResponse {
  bids: Bid[]
  pagination: {
    page: number
    perPage: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export default function BidsClient() {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const dateLocale = locale === 'ro' ? ro : enUS

  const [status, setStatus] = useState<FilterStatus>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BidsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBids()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page])

  async function fetchBids() {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        status,
      })

      const response = await fetch(`/api/account/bids?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch bids')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching bids:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    } finally {
      setLoading(false)
    }
  }

  function handleStatusChange(newStatus: FilterStatus) {
    setStatus(newStatus)
    setPage(1) // Reset to first page when changing status
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat(locale === 'ro' ? 'ro-RO' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function getBidStatusBadge(bidStatus: BidStatus) {
    switch (bidStatus) {
      case 'active':
        return (
          <Badge className="bg-success text-success-foreground">
            <TrendingUp className="mr-1 h-3 w-3" />
            {t('bidStatus.winning')}
          </Badge>
        )
      case 'won':
        return (
          <Badge className="bg-success text-success-foreground">
            <Trophy className="mr-1 h-3 w-3" />
            {t('bidStatus.won')}
          </Badge>
        )
      case 'lost':
        return (
          <Badge variant="secondary">
            <XCircle className="mr-1 h-3 w-3" />
            {t('bidStatus.lost')}
          </Badge>
        )
      case 'outbid':
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            {t('bidStatus.outbid')}
          </Badge>
        )
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6">
        {/* Filter Tabs Skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-[400px]" />
        </div>

        {/* Bids Skeleton */}
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex gap-6">
                <Skeleton className="h-24 w-32 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <Tabs value={status} onValueChange={(val) => handleStatusChange(val as FilterStatus)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{t('bidFilters.all')}</TabsTrigger>
          <TabsTrigger value="active">{t('bidFilters.active')}</TabsTrigger>
          <TabsTrigger value="won">{t('bidFilters.won')}</TabsTrigger>
          <TabsTrigger value="lost">{t('bidFilters.lost')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Results Count */}
      {data && data.pagination.totalCount > 0 && (
        <div className="text-sm text-muted-foreground">
          {t('bidResultsCount', { count: data.pagination.totalCount })}
        </div>
      )}

      {/* Bids List */}
      {data && data.bids.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Gavel className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">{t('noBidsTitle')}</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {status === 'all'
                ? t('noBidsDescription')
                : t('noBidsFiltered', { filter: t(`bidFilters.${status}`) })}
            </p>
            <Button asChild className="mt-6" variant="premium">
              <Link href="/auctions">
                <Gavel className="mr-2 h-4 w-4" />
                {t('browseAuctions')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data?.bids.map((bid) => (
            <Card key={bid.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardContent className="p-0">
                <Link href={`/auctions/${bid.auction.id}`} className="block">
                  <div className="flex flex-col gap-4 p-6 sm:flex-row sm:gap-6">
                    {/* Thumbnail */}
                    <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-32">
                      {bid.listing.image ? (
                        <Image
                          src={bid.listing.image}
                          alt={bid.listing.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 128px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Gavel className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold leading-tight hover:text-primary">
                            {bid.listing.title}
                          </h3>
                          {getBidStatusBadge(bid.status)}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {bid.listing.year} {bid.listing.make} {bid.listing.model}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t('yourBid')}:</span>{' '}
                            <span className="font-semibold">
                              {formatCurrency(bid.amount, bid.currency)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('currentPrice')}:</span>{' '}
                            <span className="font-semibold">
                              {formatCurrency(
                                bid.auction.finalPrice || bid.auction.currentBid || bid.amount,
                                bid.currency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {['SCHEDULED', 'ACTIVE', 'EXTENDED'].includes(bid.auction.status) ? (
                            <span>
                              {t('endsIn')}{' '}
                              {formatDistanceToNow(new Date(bid.auction.endTime), {
                                addSuffix: false,
                                locale: dateLocale,
                              })}
                            </span>
                          ) : (
                            <span>
                              {t('bidPlacedAt')}{' '}
                              {formatDistanceToNow(new Date(bid.createdAt), {
                                addSuffix: true,
                                locale: dateLocale,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-6">
          <div className="text-sm text-muted-foreground">
            {t('paginationInfo', {
              from: (page - 1) * data.pagination.perPage + 1,
              to: Math.min(page * data.pagination.perPage, data.pagination.totalCount),
              total: data.pagination.totalCount,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={!data.pagination.hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
              {tCommon('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!data.pagination.hasNextPage}
            >
              {tCommon('next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
