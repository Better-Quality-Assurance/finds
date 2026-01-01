'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  Gavel,
  FileText,
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  Clock,
  BarChart3,
  Car,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AdminStats {
  overview: {
    totalUsers: number
    totalAuctions: number
    totalListings: number
    totalBids: number
  }
  todayActivity: {
    newUsers: number
    bids: number
    auctionsEnded: number
    listingsSubmitted: number
  }
  status: {
    activeAuctions: number
    pendingListings: number
    openFraudAlerts: number
  }
  revenue: {
    last30Days: {
      salesVolume: number
      estimatedRevenue: number
      salesCount: number
    }
  }
  auctionOutcomes: {
    sold: number
    unsold: number
    successRate: number
  }
  popularMakes: Array<{ make: string; count: number }>
  trends: {
    users: Array<{ date: string; count: number }>
    bids: Array<{ date: string; count: number }>
  }
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats')
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="container py-8">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">Failed to load analytics: {error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Comprehensive platform statistics and trends
        </p>
      </div>

      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.overview.totalUsers.toLocaleString()}
          subtitle={`+${stats.todayActivity.newUsers} today`}
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Total Auctions"
          value={stats.overview.totalAuctions.toLocaleString()}
          subtitle={`${stats.status.activeAuctions} active`}
          icon={Gavel}
        />
        <StatCard
          title="Total Listings"
          value={stats.overview.totalListings.toLocaleString()}
          subtitle={`${stats.status.pendingListings} pending`}
          icon={FileText}
        />
        <StatCard
          title="Total Bids"
          value={stats.overview.totalBids.toLocaleString()}
          subtitle={`+${stats.todayActivity.bids} today`}
          icon={TrendingUp}
          trend="up"
        />
      </div>

      {/* Revenue & Outcomes */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sales Volume</span>
              <span className="text-xl font-bold">
                {formatCurrency(stats.revenue.last30Days.salesVolume, 'EUR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated Revenue (5% fee)</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(stats.revenue.last30Days.estimatedRevenue, 'EUR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Completed Sales</span>
              <span className="font-semibold">
                {stats.revenue.last30Days.salesCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Auction Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={stats.auctionOutcomes.successRate} className="h-3" />
              </div>
              <span className="text-2xl font-bold">
                {stats.auctionOutcomes.successRate}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sold</span>
                <Badge variant="success">{stats.auctionOutcomes.sold}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unsold</span>
                <Badge variant="secondary">{stats.auctionOutcomes.unsold}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends & Popular Makes */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Activity Trends (7 Days)
            </CardTitle>
            <CardDescription>Daily user registrations and bids</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 text-sm font-medium">New Users</h4>
                <div className="flex items-end gap-1 h-20">
                  {stats.trends.users.map((day, i) => {
                    const maxCount = Math.max(...stats.trends.users.map(d => d.count), 1)
                    const height = (day.count / maxCount) * 100
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/20 rounded-t hover:bg-primary/40 transition-colors relative group"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium">Bids</h4>
                <div className="flex items-end gap-1 h-20">
                  {stats.trends.bids.map((day, i) => {
                    const maxCount = Math.max(...stats.trends.bids.map(d => d.count), 1)
                    const height = (day.count / maxCount) * 100
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-success/20 rounded-t hover:bg-success/40 transition-colors relative group"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          {day.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Popular Makes
            </CardTitle>
            <CardDescription>Most listed vehicle makes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.popularMakes.slice(0, 8).map((make, index) => {
                const maxCount = stats.popularMakes[0]?.count || 1
                const percentage = (make.count / maxCount) * 100
                return (
                  <div key={make.make} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {index + 1}. {make.make}
                      </span>
                      <span className="text-muted-foreground">{make.count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity & Alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today&apos;s Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{stats.todayActivity.newUsers}</p>
                <p className="text-sm text-muted-foreground">New Users</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{stats.todayActivity.bids}</p>
                <p className="text-sm text-muted-foreground">Bids Placed</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{stats.todayActivity.auctionsEnded}</p>
                <p className="text-sm text-muted-foreground">Auctions Ended</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-2xl font-bold">{stats.todayActivity.listingsSubmitted}</p>
                <p className="text-sm text-muted-foreground">New Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.status.openFraudAlerts > 0 ? 'border-destructive' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span>Pending Listings</span>
                <Badge variant={stats.status.pendingListings > 0 ? 'warning' : 'secondary'}>
                  {stats.status.pendingListings}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span>Open Fraud Alerts</span>
                <Badge variant={stats.status.openFraudAlerts > 0 ? 'destructive' : 'secondary'}>
                  {stats.status.openFraudAlerts}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span>Active Auctions</span>
                <Badge variant="success">{stats.status.activeAuctions}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  trend?: 'up' | 'down'
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className={`mt-1 text-xs ${trend === 'up' ? 'text-success' : 'text-muted-foreground'}`}>
              {subtitle}
            </p>
          </div>
          <div className="rounded-full bg-muted p-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
