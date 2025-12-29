'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(100).optional().or(z.literal('')),
  content: z.string().min(10).max(2000).optional().or(z.literal('')),
})

type ReviewFormData = z.infer<typeof reviewSchema>

interface LeaveReviewDialogProps {
  sellerId: string
  sellerName: string | null
  auctionId: string
  vehicleInfo: {
    year: number
    make: string
    model: string
  }
  children?: React.ReactNode
}

export function LeaveReviewDialog({
  sellerId,
  sellerName,
  auctionId,
  vehicleInfo,
  children,
}: LeaveReviewDialogProps) {
  const t = useTranslations()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: '',
      content: '',
    },
  })

  const rating = watch('rating')

  const onSubmit = async (data: ReviewFormData) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/sellers/${sellerId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId,
          ...data,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit review')
      }

      toast.success(t('reviews.reviewSubmitted'))
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error submitting review:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : t('reviews.submitError')
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            {t('reviews.leaveReview')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('reviews.leaveReviewTitle')}</DialogTitle>
          <DialogDescription>
            {t('reviews.leaveReviewDescription', {
              seller: sellerName || 'Seller',
              vehicle: `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`,
            })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>{t('reviews.rating')}</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('rating', value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'h-8 w-8',
                      value <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-muted text-muted'
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0
                  ? t(`reviews.ratingLabels.${rating}`)
                  : t('reviews.selectRating')}
              </span>
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">
                {t('reviews.ratingRequired')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t('reviews.titleOptional')}</Label>
            <Input
              id="title"
              placeholder={t('reviews.titlePlaceholder')}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              {t('reviews.reviewOptional')}
            </Label>
            <Textarea
              id="content"
              placeholder={t('reviews.reviewPlaceholder')}
              rows={4}
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">
                {errors.content.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting || rating === 0}>
              {submitting
                ? t('reviews.submitting')
                : t('reviews.submitReview')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
