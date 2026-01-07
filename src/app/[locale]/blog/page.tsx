import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogCategoryFilter } from '@/components/blog/blog-category-filter'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })

  return {
    title: `${t('title')} - Classic Car Auction Insights | Finds`,
    description: t('subtitle'),
    openGraph: {
      title: `${t('title')} | Finds`,
      description: t('subtitle'),
    },
  }
}

type SearchParams = {
  category?: string
}

async function getBlogPosts(category?: string) {
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    publishedAt: { lte: new Date() },
  }

  if (category && category !== 'all') {
    where.category = category
  }

  return prisma.blogPost.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    include: {
      author: true,
    },
  })
}

function BlogSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

async function BlogContent({
  category,
  locale
}: {
  category?: string
  locale: string
}) {
  const t = await getTranslations({ locale, namespace: 'blog' })
  const posts = await getBlogPosts(category)

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">{t('noArticles')}</h3>
        <p className="text-muted-foreground">
          {t('noArticlesDescription')}
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map(post => (
        <BlogPostCard key={post.id} post={post} locale={locale} />
      ))}
    </div>
  )
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  const { category } = await searchParams
  const t = await getTranslations({ locale, namespace: 'blog' })

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
            {t('betterQA.badge')}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <BlogCategoryFilter currentCategory={category} />
      </div>

      {/* Blog Posts */}
      <Suspense fallback={<BlogSkeleton />}>
        <BlogContent category={category} locale={locale} />
      </Suspense>

      {/* BetterQA Attribution */}
      <div className="mt-12 p-6 bg-muted/50 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          {t('betterQA.footer')}
        </p>
        <a
          href="https://betterqa.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          betterqa.co
        </a>
      </div>
    </div>
  )
}
