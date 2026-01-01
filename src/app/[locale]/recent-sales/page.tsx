import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Calendar, MapPin, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export async function generateMetadata() {
  return {
    title: 'Recent Sales - Classic Car Auction Results | Finds',
    description: 'See what classic cars sold for at auctions across Europe. Real prices from Bring a Trailer, Catawiki, and more.',
  }
}

type SearchParams = {
  make?: string
  min_price?: string
  max_price?: string
  days?: string
}

// EU-only sources that don't need location filtering
const EU_ONLY_SOURCES = ['Catawiki', 'Artcurial', 'Collecting Cars']

// EU countries/cities for location filtering
const EU_LOCATIONS = ['austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech',
  'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary',
  'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 'netherlands',
  'poland', 'portugal', 'romania', 'slovakia', 'slovenia', 'spain', 'sweden',
  'uk', 'united kingdom', 'switzerland', 'norway', 'monaco', 'paris', 'london',
  'amsterdam', 'munich', 'berlin', 'milan', 'rome', 'barcelona', 'madrid']

function isEuropeanSale(sale: { source: string; location: string | null }): boolean {
  if (EU_ONLY_SOURCES.includes(sale.source)) {return true}
  if (!sale.location) {return false}
  const loc = sale.location.toLowerCase()
  return EU_LOCATIONS.some(country => loc.includes(country))
}

async function getRecentSales(searchParams: SearchParams) {
  const daysBack = Math.min(parseInt(searchParams.days || '30'), 90)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  const where: Record<string, unknown> = {
    saleDate: { gte: cutoffDate },
    // Include EU-only sources OR sources with location set
    OR: [
      { source: { in: EU_ONLY_SOURCES } },
      { source: { notIn: EU_ONLY_SOURCES }, location: { not: null } },
    ],
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

  const sales = await prisma.externalAuctionSale.findMany({
    where,
    orderBy: { saleDate: 'desc' },
    take: 100, // Fetch more to filter
  })

  // Filter to EU-only and limit
  return sales.filter(isEuropeanSale).slice(0, 50)
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

        <div className="flex justify-between items-center pt-2 border-t">
          <a
            href={sale.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View on {sale.source}
            <ExternalLink className="h-3 w-3" />
          </a>
          <Link
            href={`/auctions?make=${encodeURIComponent(sale.make)}&model=${encodeURIComponent(sale.model)}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            See similar on Finds
          </Link>
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

export default async function RecentSalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getTranslations('common')
  const params = await searchParams

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recent Auction Sales</h1>
        <p className="text-muted-foreground">
          What classic cars sold for at auctions across Europe. Data from Bring a Trailer, Catawiki, RM Sotheby&apos;s, and more.
        </p>
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
