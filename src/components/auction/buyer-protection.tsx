import { useTranslations } from 'next-intl'
import { Shield, Star } from 'lucide-react'
import Link from 'next/link'

type BuyerProtectionProps = {
  locale: string
}

export function BuyerProtection({ locale }: BuyerProtectionProps) {
  const t = useTranslations('auction.buyerProtection')

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">{t('title')}</h3>
      <div className="space-y-3">
        {/* Finds Buyer Protection */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
              <Shield className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-medium">{t('protectionTitle')}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{t('protectionDescription')}</p>
              </div>
              <Link
                href={`/${locale}/legal/buyer-terms`}
                className="text-xs text-primary hover:underline whitespace-nowrap flex-shrink-0"
              >
                {t('viewDetails')}
              </Link>
            </div>
          </div>
        </div>

        {/* Trustpilot Rating */}
        <div className="flex gap-3 pt-3 border-t">
          <div className="flex-shrink-0 mt-0.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-4 w-4 text-primary fill-primary" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium">{t('trustpilotTitle')}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{t('trustpilotDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
