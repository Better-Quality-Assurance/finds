import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/db'
import { Link } from '@/i18n/routing'
import { Badge } from '@/components/ui/badge'
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
      <article className="container py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToBlog')}
          </Link>
        </div>

        {/* Article Header */}
        <header className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary">{categoryLabel}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {t('readingTime', { minutes: post.readingTime })}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            {title}
          </h1>

          <p className="text-xl text-muted-foreground mb-6">
            {excerpt}
          </p>

          {/* Author & Date */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{post.author.name}</p>
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

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="max-w-4xl mx-auto mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featuredImage}
              alt={post.featuredImageAlt || title}
              className="w-full h-auto rounded-lg"
            />
          </div>
        )}

        {/* Article Content */}
        <div className="max-w-3xl mx-auto">
          <div
            className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-heading prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground
              prose-ul:text-muted-foreground prose-ol:text-muted-foreground
              prose-li:marker:text-primary"
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
            <div className="mt-8 p-6 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                  <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{post.author.name}</p>
                  <p className="text-sm text-muted-foreground mb-2">{post.author.role}</p>
                  <p className="text-sm text-muted-foreground">{post.author.bio}</p>
                  <div className="flex gap-2 mt-3">
                    {post.author.linkedIn && (
                      <a
                        href={post.author.linkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {post.author.twitter && (
                      <a
                        href={post.author.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Twitter className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-6">{t('relatedArticles')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map(relatedPost => (
                <BlogPostCard key={relatedPost.id} post={relatedPost} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* BetterQA Attribution */}
        <div className="mt-12 text-center">
          <p className="text-xs text-muted-foreground">
            {t('betterQA.about')} ·{' '}
            <a
              href="https://betterqa.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              betterqa.co
            </a>
          </p>
        </div>
      </article>
    </>
  )
}
