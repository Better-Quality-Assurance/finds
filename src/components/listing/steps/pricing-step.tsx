'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, calculateBuyerFee, calculateTotalWithFee } from '@/lib/utils'
import type { ListingFormData } from '../listing-form'

type PricingStepProps = {
  form: UseFormReturn<ListingFormData>
}

const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
]

export function PricingStep({ form }: PricingStepProps) {
  const { register, formState: { errors }, setValue, watch } = form
  const startingPrice = watch('startingPrice') || 0
  const currency = watch('currency') || 'EUR'

  const buyerFee = calculateBuyerFee(startingPrice)
  const total = calculateTotalWithFee(startingPrice)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Listing Title *</Label>
        <Input
          id="title"
          placeholder="e.g., 1969 Ford Mustang Mach 1 - Matching Numbers"
          {...register('title')}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          A good title includes year, make, model, and a key selling point.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Provide a detailed description of the vehicle. Include history, previous ownership, any restoration work done, documentation available, and any other relevant details."
          rows={8}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Minimum 100 characters. Be thorough - detailed descriptions get more
          bids.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="startingPrice">Starting Price *</Label>
          <Input
            id="startingPrice"
            type="number"
            min={100}
            max={10000000}
            {...register('startingPrice')}
          />
          {errors.startingPrice && (
            <p className="text-sm text-destructive">{errors.startingPrice.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={(value: 'EUR' | 'USD' | 'GBP' | 'RON') =>
              setValue('currency', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reservePrice">Reserve Price (optional)</Label>
        <Input
          id="reservePrice"
          type="number"
          min={100}
          max={10000000}
          placeholder="Leave empty for no reserve"
          {...register('reservePrice')}
        />
        {errors.reservePrice && (
          <p className="text-sm text-destructive">{errors.reservePrice.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          The minimum price at which you are willing to sell. If bidding does
          not reach this amount, the vehicle will not sell. No-reserve auctions
          often attract more bidders.
        </p>
      </div>

      {/* Fee Breakdown */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-medium">Fee Breakdown</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          The buyer pays a 5% fee on top of the hammer price. There is no seller
          commission.
        </p>
        {startingPrice >= 100 && (
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>If sold at starting price:</span>
              <span>{formatCurrency(startingPrice, currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Buyer fee (5%):</span>
              <span>+{formatCurrency(buyerFee, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Buyer pays:</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
