'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Badge } from '@/components/ui/badge'
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
import { useAuctionUpdates } from '@/hooks/use-pusher'
import { EVENTS, type NewBidEvent, type NewCommentEvent } from '@/lib/pusher'

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

interface BidEntry {
  id: string
  amount: number
  createdAt: string
  bidderNumber: number
  bidderCountry: string | null
}

type ActivityEntry =
  | { type: 'comment'; data: Comment; timestamp: Date }
  | { type: 'bid'; data: BidEntry; timestamp: Date }

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

  const [comments, setComments] = useState<Comment[]>([])
  const [bids, setBids] = useState<BidEntry[]>([])
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

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}/comments`)
      if (!response.ok) {
        throw new Error('Failed to load comments')
      }
      const data = await response.json()
      setComments(data.comments || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    }
  }, [listingId])

  // Fetch bids
  const fetchBids = useCallback(async () => {
    try {
      const response = await fetch(`/api/auctions/${auctionId}/bids?limit=50`)
      if (!response.ok) {
        throw new Error('Failed to load bids')
      }
      const data = await response.json()
      setBids(data.bids || [])
    } catch (err) {
      console.error('Error fetching bids:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bids')
    }
  }, [auctionId])

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      await Promise.all([fetchComments(), fetchBids()])
      setIsLoading(false)
    }

    fetchData()
  }, [fetchComments, fetchBids])

  // Real-time updates for new bids and comments
  useEffect(() => {
    if (!auctionId) {return}

    const pusher = new (window as any).Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })

    const channel = pusher.subscribe(`auction-${auctionId}`)

    // Handle new bid events
    channel.bind(EVENTS.NEW_BID, (data: NewBidEvent) => {
      const newBid: BidEntry = {
        id: data.bidId,
        amount: data.amount,
        createdAt: data.timestamp,
        bidderNumber: data.bidderNumber,
        bidderCountry: data.bidderCountry,
      }
      setBids((prev) => [newBid, ...prev])
    })

    // Handle new comment events
    channel.bind(EVENTS.NEW_COMMENT, (data: NewCommentEvent) => {
      // Only add if it's a top-level comment (not a reply)
      if (!data.parentId) {
        const newComment: Comment = {
          id: data.commentId,
          content: data.content,
          createdAt: data.timestamp,
          isHidden: false,
          isPinned: false,
          author: {
            id: '', // We don't expose author ID in the broadcast
            name: data.authorName,
            image: data.authorImage,
            createdAt: data.timestamp,
          },
          replies: [],
        }
        setComments((prev) => [newComment, ...prev])
      } else {
        // It's a reply - refresh comments to get the nested structure
        fetchComments()
      }
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`auction-${auctionId}`)
    }
  }, [auctionId, fetchComments])

  // Merge and sort activities
  const activities: ActivityEntry[] = useMemo(() => {
    const commentActivities: ActivityEntry[] = comments.map((comment) => ({
      type: 'comment' as const,
      data: comment,
      timestamp: new Date(comment.createdAt),
    }))

    const bidActivities: ActivityEntry[] = bids.map((bid) => ({
      type: 'bid' as const,
      data: bid,
      timestamp: new Date(bid.createdAt),
    }))

    return [...commentActivities, ...bidActivities].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
  }, [comments, bids])

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
            activities.map((activity) => {
              if (activity.type === 'bid') {
                const bid = activity.data
                return (
                  <div
                    key={`bid-${bid.id}`}
                    className="rounded-lg bg-primary/5 border border-primary/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Gavel className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary">
                          {formatBidderWithFlag(bid.bidderNumber, bid.bidderCountry)} bid{' '}
                          <span className="font-bold">
                            {formatCurrency(bid.amount, currency)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(bid.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              }

              // Comment entry
              const comment = activity.data
              return (
                <div key={`comment-${comment.id}`} className="space-y-3">
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
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
