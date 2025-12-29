import { useTranslations } from 'next-intl'
import { MapPin, Shield } from 'lucide-react'

type FeeBreakdownProps = {
  locationCity: string
  locationCountry: string
  buyerFeeRate: number
  isBusinessSeller?: boolean
}

export function FeeBreakdown({
  locationCity,
  locationCountry,
  buyerFeeRate,
  isBusinessSeller = false,
}: FeeBreakdownProps) {
  const t = useTranslations('auction.feeBreakdown')
  const buyerFeePercent = Math.round(buyerFeeRate * 100)

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">{t('title')}</h3>
      <div className="space-y-3">
        {/* Pickup Location */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium">{t('pickupRequired')}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('pickupLocation', { city: locationCity, country: locationCountry })}
            </p>
          </div>
        </div>

        {/* Buyer Fee */}
        <div className="flex gap-3 pt-3 border-t">
          <div className="flex-shrink-0 mt-0.5">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium">{t('buyerFee', { percent: buyerFeePercent })}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{t('buyerFeeDescription')}</p>
          </div>
        </div>

        {/* Private Seller Disclaimer */}
        {!isBusinessSeller && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {t('privateSellerDisclaimer')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
