import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  Gavel,
  FileText,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

export const metadata = {
  title: 'Admin Dashboard - Finds',
}

async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalUsers,
    newUsersToday,
    activeAuctions,
    endingSoon,
    pendingListings,
    openFraudAlerts,
    soldToday,
    totalBidsToday,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.auction.count({ where: { status: 'ACTIVE' } }),
    prisma.auction.count({
      where: {
        status: 'ACTIVE',
        currentEndTime: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      },
    }),
    prisma.listing.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.fraudAlert.count({ where: { status: 'OPEN' } }),
    prisma.auction.count({
      where: {
        status: 'SOLD',
        updatedAt: { gte: today },
      },
    }),
    prisma.bid.count({ where: { createdAt: { gte: today } } }),
  ])

  return {
    totalUsers,
    newUsersToday,
    activeAuctions,
    endingSoon,
    pendingListings,
    openFraudAlerts,
    soldToday,
    totalBidsToday,
  }
}

export default async function AdminDashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true },
  })

  if (!user || !['ADMIN', 'MODERATOR', 'REVIEWER'].includes(user.role)) {
    redirect('/')
  }

  const stats = await getDashboardStats()

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user.name || 'Admin'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Auctions</CardTitle>
            <Gavel className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.activeAuctions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.endingSoon} ending soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.pendingListings}</div>
            <p className="text-xs text-muted-foreground">
              listings awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.openFraudAlerts}</div>
            <p className="text-xs text-muted-foreground">
              open alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{stats.soldToday}</div>
            <p className="text-xs text-muted-foreground">
              successful auctions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bids Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.totalBidsToday}</div>
            <p className="text-xs text-muted-foreground">
              total bids placed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <h2 className="mb-4 text-xl font-semibold">Quick Access</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/listings">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900">
                  <FileText className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Listings</h3>
                  <p className="text-sm text-muted-foreground">
                    Review and approve listings
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/auctions">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <Gavel className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Auctions</h3>
                  <p className="text-sm text-muted-foreground">
                    Monitor active auctions
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/users">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Users</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage user accounts
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/fraud">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <h3 className="font-semibold">Fraud Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    Review suspicious activity
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {user.role === 'ADMIN' && (
          <Link href="/admin/audit">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900">
                    <ShieldAlert className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Audit Log</h3>
                    <p className="text-sm text-muted-foreground">
                      System activity history
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
