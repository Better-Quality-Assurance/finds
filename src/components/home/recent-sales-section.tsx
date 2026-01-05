import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight, TrendingUp, ExternalLink, Calendar } from 'lucide-react'
import Link from 'next/link'

// Proxy external images to bypass hotlinking protection
function getProxiedImageUrl(url: string | null): string | null {
  if (!url) {
    return null
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

// EU-only sources that don't need location filtering
const EU_ONLY_SOURCES = ['Catawiki', 'Artcurial', 'Collecting Cars']

async function getRecentExternalSales(limit = 6) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 60)

  try {
    // Prioritize EU-only sources, then others with EU locations
    const sales = await prisma.externalAuctionSale.findMany({
      where: {
        saleDate: { gte: cutoffDate },
        OR: [
          // EU-only sources (no location check needed)
          { source: { in: EU_ONLY_SOURCES } },
          // Other sources must have EU location
          {
            AND: [
              { source: { notIn: EU_ONLY_SOURCES } },
              { location: { not: null } },
            ],
          },
        ],
      },
      orderBy: { saleDate: 'desc' },
      take: limit * 2, // Fetch extra to filter
    })

    // Double-check location for non-EU sources
    const euCountries = ['austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech',
      'denmark', 'estonia', 'finland', 'france', 'germany', 'greece', 'hungary',
      'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta', 'netherlands',
      'poland', 'portugal', 'romania', 'slovakia', 'slovenia', 'spain', 'sweden',
      'uk', 'united kingdom', 'switzerland', 'norway', 'monaco', 'paris', 'london',
      'amsterdam', 'munich', 'berlin', 'milan', 'rome', 'barcelona', 'madrid']

    return sales
      .filter(sale => {
        if (EU_ONLY_SOURCES.includes(sale.source)) {return true}
        if (!sale.location) {return false}
        const loc = sale.location.toLowerCase()
        return euCountries.some(country => loc.includes(country))
      })
      .slice(0, limit)
  } catch {
    // Table might not exist yet if migration hasn't run
    return []
  }
}

export async function RecentSalesSection() {
  const t = await getTranslations('home.recentSales')
  const sales = await getRecentExternalSales()

  // Don't render section if no sales yet
  if (sales.length === 0) {
    return null
  }

  return (
    <section className="py-24 bg-gradient-to-br from-muted/30 to-background">
      <div className="container mx-auto px-4">
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
              <TrendingUp className="h-4 w-4" />
              {t('badge')}
            </div>
            <h2 className="font-heading text-3xl font-bold tracking-tight md:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <Link href="/recent-sales">
            <Button variant="outline" className="group">
              {t('viewAll')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sales.map((sale) => (
            <Card key={sale.id} className="group overflow-hidden hover:shadow-lg transition-all">
              <div className="relative h-48 bg-muted overflow-hidden">
                {sale.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={getProxiedImageUrl(sale.imageUrl) || ''}
                    alt={sale.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-4xl">🚗</span>
                  </div>
                )}
                <Badge className="absolute top-3 left-3" variant="secondary">
                  {sale.source}
                </Badge>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                  {sale.title}
                </h3>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(Number(sale.priceEur), 'EUR')}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(sale.saleDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t">
                  <a
                    href={sale.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    {t('viewOnSource')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Link
                    href={`/auctions?make=${encodeURIComponent(sale.make)}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('findSimilar')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sell CTA */}
        <div className="mt-12 text-center">
          <p className="text-lg text-muted-foreground mb-4">
            {t('sellPrompt')}
          </p>
          <Link href="/sell">
            <Button size="lg" className="group">
              {t('startSelling')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
