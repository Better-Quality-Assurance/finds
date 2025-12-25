'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { stripe } from '@/lib/stripe'

interface StripeExpressDashboardButtonProps {
  accountId: string
}

export function StripeExpressDashboardButton({ accountId }: StripeExpressDashboardButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations('seller')

  const handleOpenDashboard = async () => {
    try {
      setIsLoading(true)

      // Call API to generate login link
      const response = await fetch('/api/seller/stripe-connect/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open dashboard')
      }

      if (data.url) {
        // Open in new tab
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Failed to open dashboard:', error)
      toast.error(
        error instanceof Error ? error.message : t('dashboard.dashboardOpenFailed')
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleOpenDashboard}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('dashboard.loading')}
        </>
      ) : (
        <>
          <ExternalLink className="h-4 w-4" />
          {t('dashboard.openDashboard')}
        </>
      )}
    </Button>
  )
}
