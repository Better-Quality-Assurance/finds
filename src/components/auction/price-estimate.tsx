'use client'

import { useTranslations } from 'next-intl'
import { Info } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type PriceEstimateProps = {
  estimateLow: number
  estimateHigh: number
  currency: string
}

export function PriceEstimate({ estimateLow, estimateHigh, currency }: PriceEstimateProps) {
  const t = useTranslations('auction')

  const formattedLow = formatCurrency(estimateLow, currency)
  const formattedHigh = formatCurrency(estimateHigh, currency)

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span>{t('estimateRange', { low: formattedLow, high: formattedHigh })}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{t('estimateTooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
