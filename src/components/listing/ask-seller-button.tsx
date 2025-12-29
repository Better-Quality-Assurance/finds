'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

type AskSellerButtonProps = {
  listingId: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function AskSellerButton({
  listingId,
  variant = 'outline',
  size = 'default',
  className,
}: AskSellerButtonProps) {
  const t = useTranslations('messages')
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    // Require authentication
    if (status === 'unauthenticated') {
      toast.error(t('loginRequired'))
      router.push('/login')
      return
    }

    if (!session?.user?.id) {
      return
    }

    setLoading(true)

    try {
      // Create or get existing conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })

      if (!response.ok) {
        const data = await response.json()

        if (response.status === 400 && data.error === 'Cannot message your own listing') {
          toast.error(t('cannotMessageOwnListing'))
          return
        }

        throw new Error(data.error || 'Failed to start conversation')
      }

      const data = await response.json()

      // Redirect to messages page with the conversation selected
      router.push(`/account/messages?conversation=${data.conversation.id}`)
    } catch (error) {
      console.error('Error starting conversation:', error)
      toast.error(t('startConversationError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading || status === 'loading'}
      variant={variant}
      size={size}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-4 w-4" />
      )}
      {t('askSeller')}
    </Button>
  )
}
