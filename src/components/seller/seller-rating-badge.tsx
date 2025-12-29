'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SellerRatingBadgeProps {
  averageRating: number | null
  totalReviews: number
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

export function SellerRatingBadge({
  averageRating,
  totalReviews,
  size = 'md',
  showCount = true,
  className,
}: SellerRatingBadgeProps) {
  if (totalReviews === 0 || !averageRating) {
    return null
  }

  const sizeClasses = {
    sm: 'text-xs gap-0.5',
    md: 'text-sm gap-1',
    lg: 'text-base gap-1.5',
  }

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  }

  return (
    <div
      className={cn(
        'inline-flex items-center font-medium',
        sizeClasses[size],
        className
      )}
    >
      <Star
        className="fill-yellow-400 text-yellow-400"
        size={iconSizes[size]}
      />
      <span className="text-foreground">
        {averageRating.toFixed(1)}
      </span>
      {showCount && (
        <span className="text-muted-foreground">
          ({totalReviews})
        </span>
      )}
    </div>
  )
}
