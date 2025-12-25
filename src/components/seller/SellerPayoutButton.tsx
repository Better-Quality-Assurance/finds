'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Wallet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SellerPayoutButtonProps {
  variant?: 'default' | 'outline' | 'secondary'
  isSetup?: boolean
}

export function SellerPayoutButton({ variant = 'default', isSetup = false }: SellerPayoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations('seller')

  const handleSetupPayouts = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/seller/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set up payouts')
      }

      if (data.alreadyOnboarded) {
        toast.success(t('payoutButton.alreadySetup'))
        router.refresh()
        return
      }

      if (data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.onboardingUrl
      }
    } catch (error) {
      console.error('Failed to set up payouts:', error)
      toast.error(
        error instanceof Error ? error.message : t('payoutButton.setupFailed')
      )
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSetupPayouts}
      disabled={isLoading}
      variant={variant}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('payoutButton.loading')}
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          {isSetup ? t('payoutButton.completeSetup') : t('payoutButton.setupPayouts')}
        </>
      )}
    </Button>
  )
}
