'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

interface FollowButtonProps {
  sellerId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showText?: boolean
  className?: string
  onFollowChange?: (isFollowing: boolean) => void
}

export function FollowButton({
  sellerId,
  variant = 'outline',
  size = 'default',
  showText = true,
  className,
  onFollowChange,
}: FollowButtonProps) {
  const { data: session, status } = useSession()
  const t = useTranslations('seller')
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Check follow status on mount
  useEffect(() => {
    async function checkFollowStatus() {
      if (status === 'loading') {return}

      if (!session?.user) {
        setIsCheckingStatus(false)
        return
      }

      try {
        const response = await fetch(`/api/sellers/${sellerId}/follow`)
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(data.isFollowing)
        }
      } catch (error) {
        console.error('Error checking follow status:', error)
      } finally {
        setIsCheckingStatus(false)
      }
    }

    checkFollowStatus()
  }, [sellerId, session, status])

  const handleClick = async () => {
    // Redirect to login if not authenticated
    if (!session?.user) {
      router.push('/en/login?callbackUrl=' + encodeURIComponent(window.location.pathname))
      return
    }

    // Prevent clicking on own profile
    if (session.user.id === sellerId) {
      return
    }

    setIsLoading(true)

    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/sellers/${sellerId}/follow`, {
        method,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update follow status')
      }

      const data = await response.json()

      // Optimistic update
      setIsFollowing(data.isFollowing)

      // Notify parent component
      onFollowChange?.(data.isFollowing)

      // Refresh the page data to update follower count
      router.refresh()
    } catch (error) {
      console.error('Error updating follow status:', error)
      // Revert optimistic update on error
      setIsFollowing(!isFollowing)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show button on own profile
  if (session?.user?.id === sellerId) {
    return null
  }

  const isDisabled = isLoading || isCheckingStatus

  if (showText) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isDisabled}
        className={cn('gap-2', className)}
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-all',
            isFollowing && 'fill-current text-red-500'
          )}
        />
        {isLoading
          ? t('following.loading')
          : isFollowing
          ? t('following.following')
          : t('following.follow')}
      </Button>
    )
  }

  // Icon-only button
  return (
    <Button
      variant={variant}
      size={size || 'icon'}
      onClick={handleClick}
      disabled={isDisabled}
      className={cn('relative', className)}
      aria-label={isFollowing ? t('following.unfollow') : t('following.follow')}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-all',
          isFollowing && 'fill-current text-red-500'
        )}
      />
    </Button>
  )
}
