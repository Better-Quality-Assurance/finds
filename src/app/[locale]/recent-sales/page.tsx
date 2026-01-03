import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Calendar, MapPin, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { SalesStatistics } from '@/components/sales/sales-statistics'

export async function generateMetadata() {
  return {
    title: 'Recent Sales - Classic Car Auction Results | Finds',
    description: 'See what classic cars sold for at auctions worldwide. Real prices from Bring a Trailer, Catawiki, Collecting Cars, and more.',
  }
}

type SearchParams = {
  make?: string
  min_price?: string
  max_price?: string
  days?: string
}

async function getRecentSales(searchParams: SearchParams) {
  const daysBack = Math.min(parseInt(searchParams.days || '30'), 90)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  const where: Record<string, unknown> = {
    saleDate: { gte: cutoffDate },
  }

  if (searchParams.make) {
    where.make = { contains: searchParams.make, mode: 'insensitive' }
  }

  if (searchParams.min_price) {
    where.priceEur = { ...where.priceEur as object, gte: parseInt(searchParams.min_price) }
  }

  if (searchParams.max_price) {
    where.priceEur = { ...where.priceEur as object, lte: parseInt(searchParams.max_price) }
  }

  return prisma.externalAuctionSale.findMany({
    where,
    orderBy: { saleDate: 'desc' },
    take: 50,
  })
}

async function getSalesStatistics() {
  try {
    // Use NEXTAUTH_URL for production, or construct from headers
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://finds.ro'
    const response = await fetch(
      `${baseUrl}/api/global-sales/stats`,
      {
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch statistics')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching sales statistics:', error)
    return null
  }
}

function SaleCard({ sale }: { sale: Awaited<ReturnType<typeof getRecentSales>>[0] }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {sale.imageUrl && (
        <div className="relative h-48 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sale.imageUrl}
            alt={sale.title}
            className="w-full h-full object-cover"
          />
          <Badge className="absolute top-2 right-2" variant="secondary">
            {sale.source}
          </Badge>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{sale.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(Number(sale.priceEur), 'EUR')}
          </span>
          {sale.currency !== 'EUR' && (
            <span className="text-sm text-muted-foreground">
              ({formatCurrency(Number(sale.soldPrice), sale.currency)})
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(sale.saleDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          {sale.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {sale.location}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {sale.condition && (
            <Badge variant="outline">{sale.condition}</Badge>
          )}
          {sale.mileage && (
            <Badge variant="outline">{sale.mileage.toLocaleString()} km</Badge>
          )}
        </div>

        <div className="pt-2 border-t">
          <a
            href={sale.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View on {sale.source}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

function SalesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

async function RecentSalesContent({ searchParams }: { searchParams: SearchParams }) {
  const sales = await getRecentSales(searchParams)

  if (sales.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No sales data yet</h3>
        <p className="text-muted-foreground">
          We&apos;re collecting auction results from Bring a Trailer, Catawiki, and other sources.
          Check back soon!
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sales.map(sale => (
        <SaleCard key={sale.id} sale={sale} />
      ))}
    </div>
  )
}

async function StatisticsContent() {
  const stats = await getSalesStatistics()

  if (!stats || stats.totalSales === 0) {
    return null
  }

  return <SalesStatistics data={stats} />
}

export default async function RecentSalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recent Auction Sales</h1>
        <p className="text-muted-foreground">
          What classic cars sold for at auctions worldwide. Data from Bring a Trailer, Catawiki, Collecting Cars, and more.
        </p>
      </div>

      {/* Statistics Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Market Overview</h2>
        <Suspense fallback={<StatisticsSkeleton />}>
          <StatisticsContent />
        </Suspense>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Make:</label>
          <input
            type="text"
            placeholder="e.g., Porsche"
            defaultValue={params.make}
            className="px-3 py-1.5 border rounded-md text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Time period:</label>
          <select
            defaultValue={params.days || '30'}
            className="px-3 py-1.5 border rounded-md text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Individual Sales</h2>
      </div>
      <Suspense fallback={<SalesSkeleton />}>
        <RecentSalesContent searchParams={params} />
      </Suspense>

      {/* CTA */}
      <div className="mt-12 p-8 bg-primary/5 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-2">Have a classic car to sell?</h2>
        <p className="text-muted-foreground mb-4">
          List it on Finds and reach thousands of enthusiasts across Europe.
        </p>
        <Link
          href="/sell"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90"
        >
          Start Selling
        </Link>
      </div>
    </div>
  )
}
