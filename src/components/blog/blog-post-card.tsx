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
      <Card variant="premium" className="overflow-hidden h-full group cursor-pointer p-2">
        {post.featuredImage ? (
          <div className="relative h-56 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featuredImage}
              alt={post.featuredImageAlt || title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <Badge className="absolute top-4 left-4 backdrop-blur-sm bg-primary/90 text-primary-foreground border-primary/20">
              {categoryLabel}
            </Badge>
          </div>
        ) : (
          <div className="relative h-56 bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/10 flex items-center justify-center rounded-lg overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(49,101,74,0.1),transparent_50%)]" />
            <span className="text-5xl relative z-10">📰</span>
            <Badge className="absolute top-4 left-4 backdrop-blur-sm bg-primary/90 text-primary-foreground border-primary/20">
              {categoryLabel}
            </Badge>
          </div>
        )}

        <CardHeader className="pb-3 pt-5">
          <h2 className="font-heading text-xl font-bold line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h2>
        </CardHeader>

        <CardContent className="space-y-4 pb-6">
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 ring-2 ring-primary/10">
                <AvatarImage src={post.author.avatar || undefined} alt={post.author.name} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                  {post.author.name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{post.author.name}</span>
            </div>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {t('readingTime', { minutes: post.readingTime })}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {post.publishedAt?.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              {t('readMore')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
