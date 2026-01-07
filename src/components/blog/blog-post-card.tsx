'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, ArrowRight } from 'lucide-react'

type BlogPost = {
  id: string
  slug: string
  titleEn: string
  titleRo: string
  excerptEn: string
  excerptRo: string
  featuredImage: string | null
  featuredImageAlt: string | null
  category: string
  readingTime: number
  publishedAt: Date | null
  author: {
    name: string
    avatar: string | null
    role: string
  }
}

type Props = {
  post: BlogPost
  locale: string
}

export function BlogPostCard({ post, locale }: Props) {
  const t = useTranslations('blog')

  const title = locale === 'ro' ? post.titleRo : post.titleEn
  const excerpt = locale === 'ro' ? post.excerptRo : post.excerptEn
  const categoryLabel = t(`categories.${post.category}`)

  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="overflow-hidden h-full hover:shadow-lg transition-all group cursor-pointer">
        {post.featuredImage ? (
          <div className="relative h-48 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featuredImage}
              alt={post.featuredImageAlt || title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <Badge className="absolute top-3 left-3" variant="secondary">
              {categoryLabel}
            </Badge>
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <span className="text-4xl">📰</span>
            <Badge className="absolute top-3 left-3" variant="secondary">
              {categoryLabel}
            </Badge>
          </div>
        )}

        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h2>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                <AvatarFallback className="text-[10px]">{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <span>{post.author.name}</span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('readingTime', { minutes: post.readingTime })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {post.publishedAt?.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              {t('readMore')}
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
