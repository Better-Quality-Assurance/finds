'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Heart,
  Clock,
  Gavel,
  Bell,
  BellOff,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

function getTimeRemaining(endTime: Date): string {
  const now = new Date()
  const diff = endTime.getTime() - now.getTime()

  if (diff <= 0) {return 'Ended'}

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

interface WatchlistItem {
  id: string
  auctionId: string
  notifyOnBid: boolean
  notifyOnEnd: boolean
  createdAt: string
  auction: {
    id: string
    currentBid: number | null
    currentEndTime: string
    status: string
    listing: {
      id: string
      title: string
      year: number
      make: string
      model: string
      startingPrice: number
      currency: string
      media: Array<{
        id: string
        publicUrl: string
        type: string
      }>
    }
    _count: {
      bids: number
    }
  }
}

export default function WatchlistClient() {
  const t = useTranslations('account')
  const tCommon = useTranslations('common')
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const fetchWatchlist = async () => {
    try {
      const response = await fetch('/api/watchlist', {
        credentials: 'include',
      })
      if (!response.ok) {throw new Error('Failed to fetch watchlist')}
      const result = await response.json()
      // API returns { success: true, data: { watchlist: [...] } }
      setWatchlist(result.data?.watchlist || [])
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      toast.error(t('watchlistFetchError'))
    } finally {
      setLoading(false)
    }
  }

  const updateNotifications = async (
    auctionId: string,
    field: 'notifyOnBid' | 'notifyOnEnd',
    value: boolean
  ) => {
    setUpdatingId(auctionId)
    try {
      const response = await fetch('/api/watchlist', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId,
          [field]: value,
        }),
      })

      if (!response.ok) {throw new Error('Failed to update preferences')}

      setWatchlist((prev) =>
        prev.map((item) =>
          item.auctionId === auctionId ? { ...item, [field]: value } : item
        )
      )
      toast.success(t('preferencesUpdated'))
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast.error(t('preferencesUpdateError'))
    } finally {
      setUpdatingId(null)
    }
  }

  const removeFromWatchlist = async (auctionId: string) => {
    try {
      const response = await fetch(`/api/watchlist?auctionId=${auctionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {throw new Error('Failed to remove from watchlist')}

      setWatchlist((prev) => prev.filter((item) => item.auctionId !== auctionId))
      toast.success(t('removedFromWatchlist'))
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      toast.error(t('removeWatchlistError'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-32 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (watchlist.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Heart className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-2 text-lg font-semibold">{t('noWatchlistItems')}</h3>
          <p className="mb-4 text-muted-foreground">{t('noWatchlistDescription')}</p>
          <Button asChild>
            <Link href="/auctions">{t('browseAuctions')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activeItems = watchlist.filter(
    (item) => item.auction.status === 'ACTIVE' || item.auction.status === 'EXTENDED'
  )
  const endedItems = watchlist.filter(
    (item) => item.auction.status !== 'ACTIVE' && item.auction.status !== 'EXTENDED'
  )

  return (
    <div className="space-y-6">
      {activeItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">{t('activeWatched')}</h2>
          <div className="space-y-4">
            {activeItems.map((item) => (
              <WatchlistItemCard
                key={item.id}
                item={item}
                t={t}
                tCommon={tCommon}
                updatingId={updatingId}
                onUpdateNotifications={updateNotifications}
                onRemove={removeFromWatchlist}
              />
            ))}
          </div>
        </div>
      )}

      {endedItems.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">{t('endedWatched')}</h2>
          <div className="space-y-4">
            {endedItems.map((item) => (
              <WatchlistItemCard
                key={item.id}
                item={item}
                t={t}
                tCommon={tCommon}
                updatingId={updatingId}
                onUpdateNotifications={updateNotifications}
                onRemove={removeFromWatchlist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WatchlistItemCard({
  item,
  t,
  tCommon,
  updatingId,
  onUpdateNotifications,
  onRemove,
}: {
  item: WatchlistItem
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
  updatingId: string | null
  onUpdateNotifications: (
    auctionId: string,
    field: 'notifyOnBid' | 'notifyOnEnd',
    value: boolean
  ) => void
  onRemove: (auctionId: string) => void
}) {
  const { auction } = item
  const { listing } = auction
  const isActive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED'
  const imageUrl = listing.media[0]?.publicUrl || '/placeholder-car.jpg'
  const currentPrice = auction.currentBid ?? listing.startingPrice
  const isUpdating = updatingId === item.auctionId

  return (
    <Card className={!isActive ? 'opacity-75' : ''}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Image */}
          <Link href={`/auctions/${auction.id}`} className="shrink-0">
            <div className="relative h-24 w-full overflow-hidden rounded-lg sm:w-32">
              <Image
                src={imageUrl}
                alt={listing.title}
                fill
                className="object-cover"
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Badge variant="secondary">{t(`auctionStatus.${auction.status.toLowerCase()}`)}</Badge>
                </div>
              )}
            </div>
          </Link>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <Link href={`/auctions/${auction.id}`}>
              <h3 className="truncate font-semibold hover:text-primary">
                {listing.year} {listing.make} {listing.model}
              </h3>
            </Link>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5" />
                {formatCurrency(currentPrice, listing.currency)}
              </span>
              <span className="flex items-center gap-1">
                {auction._count.bids} {tCommon('bids')}
              </span>
              {isActive && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {getTimeRemaining(new Date(auction.currentEndTime))}
                </span>
              )}
            </div>

            {/* Notification toggles - only for active auctions */}
            {isActive && (
              <div className="mt-3 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`notify-bid-${item.id}`}
                    checked={item.notifyOnBid}
                    onCheckedChange={(checked) =>
                      onUpdateNotifications(item.auctionId, 'notifyOnBid', checked)
                    }
                    disabled={isUpdating}
                  />
                  <Label htmlFor={`notify-bid-${item.id}`} className="text-sm">
                    {item.notifyOnBid ? (
                      <span className="flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5" />
                        {t('notifyOnBid')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <BellOff className="h-3.5 w-3.5" />
                        {t('notifyOnBid')}
                      </span>
                    )}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`notify-end-${item.id}`}
                    checked={item.notifyOnEnd}
                    onCheckedChange={(checked) =>
                      onUpdateNotifications(item.auctionId, 'notifyOnEnd', checked)
                    }
                    disabled={isUpdating}
                  />
                  <Label htmlFor={`notify-end-${item.id}`} className="text-sm">
                    {item.notifyOnEnd ? (
                      <span className="flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5" />
                        {t('notifyOnEnd')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <BellOff className="h-3.5 w-3.5" />
                        {t('notifyOnEnd')}
                      </span>
                    )}
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:flex-col">
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
              <Link href={`/auctions/${auction.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                {tCommon('view')}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.auctionId)}
              className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon('remove')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
