'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Clock, Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type StickyBidBarProps = {
  auction: {
    id: string
    currentBid: number | null
    currentEndTime: string
    status: string
    listing: {
      startingPrice: number
      currency: string
      sellerId: string
    }
  }
  timeRemaining: string
  isActive: boolean
  isEndingSoon: boolean
  onPlaceBidClick: () => void
}

export function StickyBidBar({
  auction,
  timeRemaining,
  isActive,
  isEndingSoon,
  onPlaceBidClick,
}: StickyBidBarProps) {
  const { data: session } = useSession()
  const t = useTranslations('auction')
  const [isVisible, setIsVisible] = useState(false)
  const isSeller = session?.user?.id === auction.listing.sellerId

  // Show bar when user scrolls down past initial bid panel
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px down
      const shouldShow = window.scrollY > 300
      setIsVisible(shouldShow)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Don't show on desktop, ended auctions, or for sellers
  if (!isActive || isSeller) {
    return null
  }

  const currentBid = auction.currentBid || auction.listing.startingPrice
  const currency = auction.listing.currency

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 md:hidden',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-2xl shadow-blue-900/50">
        <div className="container px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left side - Current bid info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-blue-100">
                  {auction.currentBid ? t('currentBid') : t('startingBid')}
                </p>
                {isEndingSoon && (
                  <div className="flex items-center gap-1 text-white">
                    <Clock className="h-3 w-3 animate-bounce" aria-hidden="true" />
                    <span className="text-[10px] font-semibold">{timeRemaining}</span>
                  </div>
                )}
              </div>
              <p className="font-mono text-xl font-bold text-white truncate">
                {formatCurrency(currentBid, currency)}
              </p>
            </div>

            {/* Right side - Place bid button */}
            <Button
              onClick={onPlaceBidClick}
              variant="secondary"
              size="lg"
              className="h-12 min-w-[120px] flex-shrink-0 bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-lg"
            >
              <Gavel className="h-4 w-4 mr-2" aria-hidden="true" />
              {t('placeBid')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
