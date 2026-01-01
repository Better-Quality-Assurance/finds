import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  BarChart3,
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
            <Gavel className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeAuctions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.endingSoon} ending soon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingListings}</div>
            <p className="text-xs text-muted-foreground">
              listings awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fraud Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.openFraudAlerts}</div>
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
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.soldToday}</div>
            <p className="text-xs text-muted-foreground">
              successful auctions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bids Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalBidsToday}</div>
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
                <div className="rounded-lg bg-warning/10 p-3">
                  <FileText className="h-6 w-6 text-warning" />
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
                <div className="rounded-lg bg-success/10 p-3">
                  <Gavel className="h-6 w-6 text-success" />
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
                <div className="rounded-lg bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
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
                <div className="rounded-lg bg-destructive/10 p-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
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

        <Link href="/admin/analytics">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Detailed statistics & trends
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
                  <div className="rounded-lg bg-secondary/10 p-3">
                    <ShieldAlert className="h-6 w-6 text-secondary" />
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
