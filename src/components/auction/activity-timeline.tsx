'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDistanceToNow } from 'date-fns'
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
  Gavel,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { formatBidderWithFlag } from '@/utils/country-flag'
import { toast } from 'sonner'
import {
  useActivityTimeline,
  type Comment,
  type BidEntry,
  type ActivityEntry,
} from '@/hooks/use-activity-timeline'

interface ActivityTimelineProps {
  auctionId: string
  listingId: string
  currency: string
  locale?: string
  className?: string
}

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
})

type CommentFormData = z.infer<typeof commentSchema>

export function ActivityTimeline({
  auctionId,
  listingId,
  currency,
  locale = 'en',
  className,
}: ActivityTimelineProps) {
  const { data: session } = useSession()
  const t = useTranslations('comments')
  const tCommon = useTranslations('common')

  const { activities, isLoading, error, refetchComments } = useActivityTimeline(
    auctionId,
    listingId
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  const dateLocale = locale === 'ro' ? ro : enUS

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  })

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

      toast.success(t('commentPosted'))
      reset()
      setReplyingTo(null)
      await refetchComments()
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

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })
    }

    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR'

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('activityTitle')} ({activities.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Comment Form */}
        <CommentForm
          session={session}
          replyingTo={replyingTo}
          isSubmitting={isSubmitting}
          errors={errors}
          register={register}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          cancelReply={cancelReply}
          t={t}
          tCommon={tCommon}
        />

        {/* Activity Timeline */}
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
          ) : activities.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">{t('noActivity')}</p>
              <p className="text-xs text-muted-foreground">{t('beTheFirstActivity')}</p>
            </div>
          ) : (
            activities.map((activity) =>
              activity.type === 'bid' ? (
                <BidActivityEntry
                  key={`bid-${activity.data.id}`}
                  bid={activity.data}
                  currency={currency}
                  formatDate={formatDate}
                />
              ) : (
                <CommentActivityEntry
                  key={`comment-${activity.data.id}`}
                  comment={activity.data}
                  isAdmin={isAdmin}
                  session={session}
                  replyingTo={replyingTo}
                  isSubmitting={isSubmitting}
                  errors={errors}
                  register={register}
                  handleSubmit={handleSubmit}
                  onSubmit={onSubmit}
                  handleReply={handleReply}
                  cancelReply={cancelReply}
                  getInitials={getInitials}
                  formatDate={formatDate}
                  t={t}
                  tCommon={tCommon}
                />
              )
            )
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Extracted components for better SRP

interface CommentFormProps {
  session: ReturnType<typeof useSession>['data']
  replyingTo: string | null
  isSubmitting: boolean
  errors: Record<string, { message?: string }>
  register: ReturnType<typeof useForm<CommentFormData>>['register']
  handleSubmit: ReturnType<typeof useForm<CommentFormData>>['handleSubmit']
  onSubmit: (data: CommentFormData) => Promise<void>
  cancelReply: () => void
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function CommentForm({
  session,
  replyingTo,
  isSubmitting,
  errors,
  register,
  handleSubmit,
  onSubmit,
  cancelReply,
  t,
  tCommon,
}: CommentFormProps) {
  if (!session?.user) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">{t('loginToComment')}</p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <a href="/login">{t('login')}</a>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {replyingTo && (
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Reply className="h-4 w-4" />
            {t('replyingTo')}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={cancelReply}>
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
        <p className="text-xs text-muted-foreground">{t('characterLimit', { max: 2000 })}</p>
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
  )
}

interface BidActivityEntryProps {
  bid: BidEntry
  currency: string
  formatDate: (date: string | Date) => string
}

function BidActivityEntry({ bid, currency, formatDate }: BidActivityEntryProps) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Gavel className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-primary">
            {formatBidderWithFlag(bid.bidderNumber, bid.bidderCountry)} bid{' '}
            <span className="font-bold">{formatCurrency(bid.amount, currency)}</span>
          </p>
          <p className="text-xs text-muted-foreground">{formatDate(bid.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

interface CommentActivityEntryProps {
  comment: Comment
  isAdmin: boolean
  session: ReturnType<typeof useSession>['data']
  replyingTo: string | null
  isSubmitting: boolean
  errors: Record<string, { message?: string }>
  register: ReturnType<typeof useForm<CommentFormData>>['register']
  handleSubmit: ReturnType<typeof useForm<CommentFormData>>['handleSubmit']
  onSubmit: (data: CommentFormData) => Promise<void>
  handleReply: (commentId: string) => void
  cancelReply: () => void
  getInitials: (name: string | null) => string
  formatDate: (date: string | Date) => string
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}

function CommentActivityEntry({
  comment,
  isAdmin,
  session,
  replyingTo,
  isSubmitting,
  errors,
  register,
  handleSubmit,
  onSubmit,
  handleReply,
  cancelReply,
  getInitials,
  formatDate,
  t,
  tCommon,
}: CommentActivityEntryProps) {
  return (
    <div className="space-y-3">
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
            <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{comment.author.name || t('anonymous')}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                {comment.isPinned && <Pin className="h-4 w-4 text-primary" />}
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
              key={`reply-${reply.id}`}
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

                  <p className="whitespace-pre-wrap text-sm">{reply.content}</p>
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
  )
}
