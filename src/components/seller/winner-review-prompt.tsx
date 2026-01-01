'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Star, CheckCircle } from 'lucide-react'
import { LeaveReviewDialog } from './leave-review-dialog'

interface WinnerReviewPromptProps {
  auctionId: string
  sellerId: string
  sellerName: string | null
  vehicleInfo: {
    year: number
    make: string
    model: string
  }
  hasExistingReview: boolean
}

export function WinnerReviewPrompt({
  auctionId,
  sellerId,
  sellerName,
  vehicleInfo,
  hasExistingReview,
}: WinnerReviewPromptProps) {
  const t = useTranslations('reviews')

  if (hasExistingReview) {
    return (
      <Card className="border-success bg-success/5">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle className="h-5 w-5 text-success" />
          <div>
            <p className="font-medium text-success">{t('reviewSubmitted')}</p>
            <p className="text-sm text-muted-foreground">
              {t('thankYouForReview')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{t('congratulationsWinner')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('leaveReviewPrompt')}
            </p>
            <div className="mt-3">
              <LeaveReviewDialog
                sellerId={sellerId}
                sellerName={sellerName}
                auctionId={auctionId}
                vehicleInfo={vehicleInfo}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
