'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Activity,
  Eye,
  UserPlus,
  Globe,
  Monitor,
  LogIn,
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

interface AnalyticsDashboard {
  pageViews: {
    totalViews: number
    uniqueVisitors: number
    uniqueUsers: number
    viewsByPage: Array<{ path: string; pageType: string; count: number }>
    viewsByDevice: Array<{ device: string; count: number }>
    viewsByCountry: Array<{ country: string; count: number }>
    topReferrers: Array<{ referrer: string; count: number }>
    viewsOverTime: Array<{ date: string; count: number }>
  }
  activeUsers: {
    activeNow: number
    activeToday: number
    activeThisWeek: number
    activeThisMonth: number
    recentUsers: Array<{
      id: string
      email: string
      name: string | null
      lastSeenAt: string | null
      currentPage?: string
    }>
  }
  newUsers: {
    today: number
    thisWeek: number
    thisMonth: number
    recentRegistrations: Array<{
      id: string
      email: string
      name: string | null
      createdAt: string
      emailVerified: string | null
      country: string | null
    }>
    registrationsOverTime: Array<{ date: string; count: number }>
  }
  engagement: {
    averageSessionDuration: number
    averagePagesPerSession: number
    bounceRate: number
    returningVisitorRate: number
    topAuctions: Array<{ auctionId: string; title: string; views: number }>
    topListings: Array<{ listingId: string; title: string; views: number }>
  }
}

interface UserActivity {
  id: string
  activityType: string
  description: string | null
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, analyticsRes, activitiesRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/analytics'),
          fetch('/api/admin/analytics/activity?limit=20'),
        ])

        if (!statsRes.ok) {
          throw new Error('Failed to fetch stats')
        }

        const statsData = await statsRes.json()
        setStats(statsData)

        // Analytics might not have data yet, so handle gracefully
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json()
          setAnalytics(analyticsData)
        }

        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json()
          setActivities(activitiesData.activities || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
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
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
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

      {/* User Analytics Section */}
      {analytics && (
        <>
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Analytics
            </h2>

            {/* Active Users Stats */}
            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Active Now"
                value={analytics.activeUsers.activeNow.toString()}
                subtitle="Last 5 minutes"
                icon={Eye}
                trend="up"
              />
              <StatCard
                title="Active Today"
                value={analytics.activeUsers.activeToday.toString()}
                subtitle="Since midnight"
                icon={Users}
              />
              <StatCard
                title="New This Week"
                value={analytics.newUsers.thisWeek.toString()}
                subtitle={`+${analytics.newUsers.today} today`}
                icon={UserPlus}
                trend="up"
              />
              <StatCard
                title="Page Views"
                value={analytics.pageViews.totalViews.toLocaleString()}
                subtitle={`${analytics.pageViews.uniqueVisitors} unique visitors`}
                icon={Eye}
              />
            </div>

            {/* Detailed User Stats */}
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="active">Active Users</TabsTrigger>
                <TabsTrigger value="new">New Users</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
                <TabsTrigger value="pages">Page Views</TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-green-500" />
                      Currently Active Users
                    </CardTitle>
                    <CardDescription>
                      Users active in the last 5 minutes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.activeUsers.recentUsers.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No users currently active
                      </p>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {analytics.activeUsers.recentUsers.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <p className="font-medium">{user.name || user.email}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                              <div className="text-right">
                                {user.currentPage && (
                                  <Badge variant="outline" className="mb-1">
                                    {user.currentPage}
                                  </Badge>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {user.lastSeenAt && formatRelativeTime(user.lastSeenAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="new">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                      Recent Registrations
                    </CardTitle>
                    <CardDescription>
                      New accounts created in the last 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.newUsers.recentRegistrations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No recent registrations
                      </p>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {analytics.newUsers.recentRegistrations.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <p className="font-medium">{user.name || 'No name'}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={user.emailVerified ? 'success' : 'warning'}
                                >
                                  {user.emailVerified ? 'Verified' : 'Unverified'}
                                </Badge>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </p>
                                {user.country && (
                                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                    <Globe className="h-3 w-3" />
                                    {user.country}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-500" />
                      Recent Activity
                    </CardTitle>
                    <CardDescription>
                      User actions and events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No recent activity
                      </p>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {activities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-full bg-muted p-2">
                                  {getActivityIcon(activity.activityType)}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {formatActivityType(activity.activityType)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {activity.description || activity.resourceType}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {formatRelativeTime(activity.createdAt)}
                                </p>
                                {activity.ipAddress && (
                                  <p className="text-xs text-muted-foreground">
                                    {activity.ipAddress}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pages">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Monitor className="h-5 w-5" />
                        Top Pages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.pageViews.viewsByPage.slice(0, 8).map((page, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm truncate max-w-[200px]">{page.path}</span>
                            <Badge variant="secondary">{page.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        By Country
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.pageViews.viewsByCountry.slice(0, 8).map((country, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-sm">{country.country || 'Unknown'}</span>
                            <Badge variant="outline">{country.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Engagement Stats */}
          <div className="grid gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">{analytics.engagement.averageSessionDuration}s</p>
                <p className="text-sm text-muted-foreground">Avg Session Duration</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">{analytics.engagement.averagePagesPerSession}</p>
                <p className="text-sm text-muted-foreground">Pages per Session</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">{analytics.engagement.bounceRate}%</p>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">{analytics.engagement.returningVisitorRate}%</p>
                <p className="text-sm text-muted-foreground">Returning Visitors</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'just now'
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  return date.toLocaleDateString()
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'LOGIN':
      return <LogIn className="h-4 w-4 text-green-500" />
    case 'LOGOUT':
      return <LogIn className="h-4 w-4 text-gray-500 rotate-180" />
    case 'REGISTER':
      return <UserPlus className="h-4 w-4 text-blue-500" />
    case 'BID_PLACED':
      return <Gavel className="h-4 w-4 text-amber-500" />
    case 'LISTING_CREATED':
    case 'LISTING_SUBMITTED':
      return <FileText className="h-4 w-4 text-purple-500" />
    case 'WATCHLIST_ADD':
      return <Eye className="h-4 w-4 text-pink-500" />
    case 'USER_BANNED':
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />
  }
}

function formatActivityType(activityType: string): string {
  const labels: Record<string, string> = {
    LOGIN: 'User Login',
    LOGIN_FAILED: 'Failed Login',
    LOGOUT: 'User Logout',
    REGISTER: 'New Registration',
    PASSWORD_RESET: 'Password Reset',
    EMAIL_VERIFIED: 'Email Verified',
    PHONE_VERIFIED: 'Phone Verified',
    BID_PLACED: 'Bid Placed',
    BID_RETRACTED: 'Bid Retracted',
    DEPOSIT_HELD: 'Deposit Held',
    DEPOSIT_RELEASED: 'Deposit Released',
    AUCTION_WON: 'Auction Won',
    LISTING_CREATED: 'Listing Created',
    LISTING_SUBMITTED: 'Listing Submitted',
    LISTING_APPROVED: 'Listing Approved',
    LISTING_REJECTED: 'Listing Rejected',
    WATCHLIST_ADD: 'Added to Watchlist',
    WATCHLIST_REMOVE: 'Removed from Watchlist',
    COMMENT_POSTED: 'Comment Posted',
    SELLER_FOLLOWED: 'Seller Followed',
    PROFILE_UPDATED: 'Profile Updated',
    SETTINGS_CHANGED: 'Settings Changed',
    PAYMENT_METHOD_ADDED: 'Payment Method Added',
    USER_BANNED: 'User Banned',
    USER_UNBANNED: 'User Unbanned',
    ROLE_CHANGED: 'Role Changed',
  }
  return labels[activityType] || activityType.replace(/_/g, ' ')
}
