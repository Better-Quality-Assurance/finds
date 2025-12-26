import { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://finds.ro'

// Force dynamic generation - don't try to prerender at build time
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages for each locale
  const locales = ['en', 'ro']
  const staticPages = [
    '',
    '/auctions',
    '/sell',
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
    '/legal/buyer-terms',
    '/legal/seller-terms',
    '/login',
    '/register',
  ]

  const staticRoutes: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPages.map((page) => {
      let priority = 0.5
      let changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly'

      if (page === '') {
        priority = 1
        changeFrequency = 'daily'
      } else if (page === '/auctions') {
        priority = 0.9
        changeFrequency = 'daily'
      } else if (page === '/sell') {
        priority = 0.8
      } else if (page.startsWith('/legal/')) {
        priority = 0.3
        changeFrequency = 'monthly'
      } else if (page === '/login' || page === '/register') {
        priority = 0.6
      }

      return {
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
      }
    })
  )

  // Try to get auctions from database
  let auctionRoutes: MetadataRoute.Sitemap = []
  try {
    const auctions = await prisma.auction.findMany({
      where: {
        status: { in: ['ACTIVE', 'SOLD'] },
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    })

    auctionRoutes = locales.flatMap((locale) =>
      auctions.map((auction) => ({
        url: `${SITE_URL}/${locale}/auctions/${auction.id}`,
        lastModified: auction.updatedAt,
        changeFrequency: 'hourly' as const,
        priority: 0.8,
      }))
    )
  } catch {
    // Database not available during build, return static routes only
    console.log('Sitemap: Database not available, returning static routes only')
  }

  return [...staticRoutes, ...auctionRoutes]
}
