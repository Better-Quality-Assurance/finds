import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { Link } from '@/i18n/routing'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogCategoryFilter } from '@/components/blog/blog-category-filter'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, ChevronLeft } from 'lucide-react'

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
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
        {/* Decorative blur orbs */}
        <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-secondary/15 blur-3xl" />

        <div className="container relative mx-auto px-4">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('backToHome')}
          </Link>

          {/* Header */}
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
                <BookOpen className="h-4 w-4" />
                {t('betterQA.badge')}
              </span>
            </div>
            <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl mb-4">
              {t('title')}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Category Filter */}
        <div className="mb-12">
          <BlogCategoryFilter currentCategory={category} />
        </div>

        {/* Blog Posts */}
        <Suspense fallback={<BlogSkeleton />}>
          <BlogContent category={category} locale={locale} />
        </Suspense>

        {/* BetterQA Attribution */}
        <Card variant="glass" className="mt-16 mx-auto max-w-2xl">
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {t('betterQA.footer')}
            </p>
            <a
              href="https://betterqa.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              betterqa.co
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
