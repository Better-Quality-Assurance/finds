'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, formatDistanceToNow } from 'date-fns'
import { enUS, ro } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MessageSquare,
  Send,
  Reply,
  Pin,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Comment {
  id: string
  content: string
  createdAt: string
  isHidden: boolean
  isPinned: boolean
  author: {
    id: string
    name: string | null
    image: string | null
    createdAt: string
  }
  replies?: Comment[]
}

interface CommentsSectionProps {
  listingId: string
  locale?: string
  className?: string
}

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
})

type CommentFormData = z.infer<typeof commentSchema>

export function CommentsSection({
  listingId,
  locale = 'en',
  className,
}: CommentsSectionProps) {
  const { data: session } = useSession()
  const t = useTranslations('comments')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const dateLocale = locale === 'ro' ? ro : enUS

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  })

  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/listings/${listingId}/comments`)

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const data = await response.json()
      setComments(data.comments || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const onSubmit = async (data: CommentFormData) => {
    if (!session?.user) {
      toast.error(t('loginToComment'))
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(`/api/listings/${listingId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: data.content,
          parentId: replyingTo,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to post comment')
      }

      const result = await response.json()

      toast.success(t('commentPosted'))

      // Reset form
      reset()
      setReplyingTo(null)

      // Refresh comments
      await fetchComments()
    } catch (err) {
      console.error('Error posting comment:', err)
      toast.error(err instanceof Error ? err.message : t('commentPostFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = (commentId: string) => {
    if (!session?.user) {
      toast.error(t('loginToComment'))
      return
    }
    setReplyingTo(commentId)
  }

  const cancelReply = () => {
    setReplyingTo(null)
    reset()
  }

  const getInitials = (name: string | null) => {
    if (!name) {return '?'}
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })
    }

    return format(date, 'PPp', { locale: dateLocale })
  }

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR'

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('title')} ({comments.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Comment Form */}
        {session?.user ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {replyingTo && (
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Reply className="h-4 w-4" />
                  {t('replyingTo')}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelReply}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                {...register('content')}
                placeholder={t('writeComment')}
                rows={3}
                disabled={isSubmitting}
                className="resize-none"
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('characterLimit', { max: 2000 })}
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tCommon('loading')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {tCommon('submit')}
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">{t('loginToComment')}</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a href="/login">{t('login')}</a>
            </Button>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2 py-8 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{t('noComments')}</p>
              <p className="text-xs text-muted-foreground">{t('beTheFirst')}</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Top-level Comment */}
                <div
                  className={cn(
                    'rounded-lg border p-4',
                    comment.isPinned && 'border-primary bg-primary/5',
                    comment.isHidden && 'opacity-50'
                  )}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={comment.author.image || undefined} />
                      <AvatarFallback>
                        {getInitials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {comment.author.name || t('anonymous')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {comment.isPinned && (
                            <Pin className="h-4 w-4 text-primary" />
                          )}
                          {comment.isHidden && isAdmin && (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <p className="whitespace-pre-wrap text-sm">{comment.content}</p>

                      {session?.user && !comment.isHidden && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReply(comment.id)}
                          className="h-auto p-0 text-xs font-normal text-muted-foreground hover:text-foreground"
                        >
                          <Reply className="mr-1 h-3 w-3" />
                          {t('reply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-12 space-y-3">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={cn(
                          'rounded-lg border border-l-4 p-3',
                          reply.isHidden && 'opacity-50'
                        )}
                      >
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={reply.author.image || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(reply.author.name)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  {reply.author.name || t('anonymous')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(reply.createdAt)}
                                </p>
                              </div>

                              {reply.isHidden && isAdmin && (
                                <EyeOff className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>

                            <p className="whitespace-pre-wrap text-sm">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form (shown when replying to this comment) */}
                {replyingTo === comment.id && (
                  <div className="ml-12">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="space-y-2 rounded-lg border p-3"
                    >
                      <Textarea
                        {...register('content')}
                        placeholder={t('writeReply')}
                        rows={2}
                        disabled={isSubmitting}
                        className="resize-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={cancelReply}
                          disabled={isSubmitting}
                        >
                          {tCommon('cancel')}
                        </Button>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-3 w-3" />
                          )}
                          {t('postReply')}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
