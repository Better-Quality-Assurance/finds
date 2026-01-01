'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Gavel,
  Trophy,
  Eye,
  CreditCard,
  Calendar,
  Star,
  Package,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useUserStats } from '@/hooks/use-stats'

export function UserActivityStats() {
  const t = useTranslations('stats.userStats')
  const { stats, loading, error } = useUserStats()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error || !stats) {
    return null
  }

  const memberSinceDate = new Date(stats.memberSince).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'long' }
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Member Since */}
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {t('memberSince')}
          </span>
          <span className="font-medium">{memberSinceDate}</span>
        </div>

        <Separator />

        {/* Buyer Stats */}
        <div className="space-y-3">
          <StatRow
            icon={Gavel}
            label={t('bidsPlaced')}
            value={stats.buyerStats.bidsPlaced.toLocaleString()}
          />
          <StatRow
            icon={Trophy}
            label={t('auctionsWon')}
            value={stats.buyerStats.auctionsWon.toLocaleString()}
            highlight
          />
          <StatRow
            icon={Eye}
            label={t('watchlistItems')}
            value={stats.buyerStats.watchlistCount.toLocaleString()}
          />
          {stats.buyerStats.totalSpent > 0 && (
            <StatRow
              icon={CreditCard}
              label={t('totalSpent')}
              value={formatCurrency(stats.buyerStats.totalSpent, 'EUR')}
            />
          )}
        </div>

        {/* Seller Stats */}
        {stats.sellerStats && (
          <>
            <Separator />
            <div>
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                {t('sellerStats')}
              </h4>
              <div className="space-y-3">
                <StatRow
                  icon={Package}
                  label={t('listingsCreated')}
                  value={stats.sellerStats.listingsCreated.toLocaleString()}
                />
                <StatRow
                  icon={Trophy}
                  label={t('auctionsSold')}
                  value={stats.sellerStats.auctionsSold.toLocaleString()}
                  highlight
                />
                {stats.sellerStats.totalEarned > 0 && (
                  <StatRow
                    icon={TrendingUp}
                    label={t('totalEarned')}
                    value={formatCurrency(stats.sellerStats.totalEarned, 'EUR')}
                  />
                )}
                {stats.sellerStats.averageRating && (
                  <StatRow
                    icon={Star}
                    label={t('averageRating')}
                    value={`${stats.sellerStats.averageRating.toFixed(1)} / 5 (${stats.sellerStats.totalReviews})`}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatRow({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className={highlight ? 'font-semibold text-primary' : 'font-medium'}>
        {value}
      </span>
    </div>
  )
}
