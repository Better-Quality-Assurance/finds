import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { Link } from '@/i18n/routing'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Calendar, Clock, Linkedin, Twitter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BlogPostCard } from '@/components/blog/blog-post-card'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

async function getBlogPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: { author: true },
  })
}

async function getRelatedPosts(category: string, excludeId: string, limit = 3) {
  return prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
      category,
      id: { not: excludeId },
      publishedAt: { lte: new Date() },
    },
    include: { author: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params
  const post = await getBlogPost(slug)

  if (!post) {
    return { title: 'Article Not Found | Finds' }
  }

  const title = locale === 'ro' ? post.titleRo : post.titleEn
  const description = locale === 'ro' ? post.metaDescriptionRo || post.excerptRo : post.metaDescriptionEn || post.excerptEn

  return {
    title: `${title} | Finds Journal`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.name],
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: 'blog' })
  const post = await getBlogPost(slug)

  if (!post) {
    notFound()
  }

  const title = locale === 'ro' ? post.titleRo : post.titleEn
  const content = locale === 'ro' ? post.contentRo : post.contentEn
  const excerpt = locale === 'ro' ? post.excerptRo : post.excerptEn
  const categoryLabel = t(`categories.${post.category}`)

  const relatedPosts = await getRelatedPosts(post.category, post.id)

  const shareUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://finds.ro/${locale}/blog/${slug}`

  // Structure data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    image: post.featuredImage || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: post.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Finds',
      logo: {
        '@type': 'ImageObject',
        url: 'https://finds.ro/logo.png',
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <article className="flex flex-col">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 md:py-16">
          {/* Decorative blur orbs */}
          <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full bg-secondary/15 blur-3xl" />

          <div className="container relative mx-auto px-4">
            {/* Back Button */}
            <div className="mb-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('backToBlog')}
              </Link>
            </div>

            {/* Article Header */}
            <header className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Badge className="backdrop-blur-sm bg-primary/90 text-primary-foreground border-primary/20">
                  {categoryLabel}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {t('readingTime', { minutes: post.readingTime })}
                </span>
              </div>

              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {title}
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                {excerpt}
              </p>

              {/* Author & Date */}
              <div className="flex items-center justify-between flex-wrap gap-6 pb-8">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {post.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{post.author.name}</p>
                    <p className="text-sm text-muted-foreground">{post.author.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {post.publishedAt?.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </header>
          </div>
        </section>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="container mx-auto px-4 -mt-16 md:-mt-24 mb-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.featuredImage}
                  alt={post.featuredImageAlt || title}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-2xl" />
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 pb-16">
        {/* Article Content */}
        <div className="max-w-3xl mx-auto">
          <div
            className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-heading prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
              prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4
              prose-h4:text-xl prose-h4:mt-8 prose-h4:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-base
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:transition-all
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:text-muted-foreground prose-ol:text-muted-foreground
              prose-li:marker:text-primary prose-li:mb-2
              prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-4
              prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-muted prose-pre:border prose-pre:border-border
              prose-img:rounded-xl prose-img:shadow-lg"
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t">
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm font-medium mb-3">{t('shareArticle')}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            </div>
          </div>

          {/* Author Bio */}
          {post.author.bio && (
            <div className="mt-12">
              <Card variant="premium" className="p-8">
                <div className="flex items-start gap-6">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                    <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                      {post.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-heading text-xl font-bold mb-1">{post.author.name}</p>
                    <p className="text-sm text-muted-foreground mb-3">{post.author.role}</p>
                    <p className="text-muted-foreground leading-relaxed">{post.author.bio}</p>
                    <div className="flex gap-3 mt-4">
                      {post.author.linkedIn && (
                        <a
                          href={post.author.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Linkedin className="h-5 w-5" />
                          LinkedIn
                        </a>
                      )}
                      {post.author.twitter && (
                        <a
                          href={post.author.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Twitter className="h-5 w-5" />
                          Twitter
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="container mx-auto px-4 mt-20">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl font-bold tracking-tight mb-3">
                {t('relatedArticles')}
              </h2>
              <p className="text-muted-foreground">
                Continue exploring classic car insights
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {relatedPosts.map(relatedPost => (
                <BlogPostCard key={relatedPost.id} post={relatedPost} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* BetterQA Attribution */}
        <div className="container mx-auto px-4 mt-16">
          <Card variant="glass" className="max-w-2xl mx-auto">
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">
                {t('betterQA.about')} ·{' '}
                <a
                  href="https://betterqa.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  betterqa.co
                </a>
              </p>
            </div>
          </Card>
        </div>
        </div>
      </article>
    </>
  )
}
