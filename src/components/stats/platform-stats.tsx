'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Gavel, Users, TrendingUp, Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { usePublicStats } from '@/hooks/use-stats'

export function PlatformStats() {
  const t = useTranslations('stats')
  const { stats, loading, error } = usePublicStats()

  if (loading) {
    return (
      <section className="py-8 sm:py-12">
        <div className="container px-4 sm:px-6">
          <Skeleton className="mx-auto mb-6 h-8 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error || !stats) {
    return null
  }

  const statItems = [
    {
      label: t('activeAuctions'),
      value: stats.activeAuctions.toLocaleString(),
      icon: Gavel,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t('totalSold'),
      value: stats.totalSold.toLocaleString(),
      icon: Award,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: t('totalBids'),
      value: stats.totalBids.toLocaleString(),
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: t('communityMembers'),
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
  ]

  return (
    <section id="stats" className="py-8 sm:py-12">
      <div className="container px-4 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-bold sm:text-3xl">
          {t('platformTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item) => (
            <Card key={item.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-full p-3 ${item.bgColor}`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>
                      {item.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {stats.totalValueSold > 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('totalValueSold', {
              value: formatCurrency(stats.totalValueSold, 'EUR'),
            })}
          </p>
        )}
      </div>
    </section>
  )
}
