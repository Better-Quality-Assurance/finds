'use client'

import { useState, useTransition, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePusher } from '@/hooks/use-pusher'
import { EVENTS } from '@/lib/pusher'
import type { WatchlistCountUpdatedEvent } from '@/lib/pusher'

type WatchlistButtonProps = {
  auctionId: string
  initialIsWatching?: boolean
  initialWatchlistCount: number
  className?: string
  showCount?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function WatchlistButton({
  auctionId,
  initialIsWatching = false,
  initialWatchlistCount,
  className,
  showCount = true,
  variant = 'outline',
  size = 'default',
}: WatchlistButtonProps) {
  const { data: session, status } = useSession()
  const [isWatching, setIsWatching] = useState(initialIsWatching)
  const [watchlistCount, setWatchlistCount] = useState(initialWatchlistCount)
  const [isPending, startTransition] = useTransition()

  // Subscribe to watchlist count updates via Pusher
  const { channel } = usePusher(auctionId)

  useEffect(() => {
    if (!channel) {return}

    const handleWatchlistCountUpdate = (data: WatchlistCountUpdatedEvent) => {
      setWatchlistCount(data.watchlistCount)
    }

    channel.bind(EVENTS.WATCHLIST_COUNT_UPDATED, handleWatchlistCountUpdate)

    return () => {
      channel.unbind(EVENTS.WATCHLIST_COUNT_UPDATED, handleWatchlistCountUpdate)
    }
  }, [channel])

  const handleToggleWatchlist = async () => {
    if (status === 'loading') {
      return
    }

    if (!session) {
      toast.error('Please log in to add to watchlist')
      return
    }

    startTransition(async () => {
      try {
        if (isWatching) {
          // Remove from watchlist
          const response = await fetch(`/api/watchlist?auctionId=${auctionId}`, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error('Failed to remove from watchlist')
          }

          setIsWatching(false)
          setWatchlistCount((prev) => Math.max(0, prev - 1))
          toast.success('Removed from watchlist')
        } else {
          // Add to watchlist
          const response = await fetch('/api/watchlist', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ auctionId }),
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Failed to add to watchlist')
          }

          setIsWatching(true)
          setWatchlistCount((prev) => prev + 1)
          toast.success('Added to watchlist')
        }
      } catch (error) {
        console.error('Watchlist error:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to update watchlist')
      }
    })
  }

  const isLoading = isPending || status === 'loading'

  return (
    <Button
      variant={isWatching ? 'default' : variant}
      size={size}
      onClick={handleToggleWatchlist}
      disabled={isLoading}
      className={cn(
        'gap-2 transition-colors',
        isWatching && 'bg-red-500 hover:bg-red-600 text-white',
        className
      )}
      aria-label={isWatching ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all',
          isWatching && 'fill-current'
        )}
      />
      {showCount && (
        <span className="font-medium">
          {watchlistCount > 0 ? watchlistCount.toLocaleString() : ''}
        </span>
      )}
    </Button>
  )
}
