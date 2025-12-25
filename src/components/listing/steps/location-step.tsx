'use client'

import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ListingFormData } from '../listing-form'

type LocationStepProps = {
  form: UseFormReturn<ListingFormData>
}

const EU_COUNTRIES = [
  { code: 'RO', name: 'Romania' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'NO', name: 'Norway' },
]

export function LocationStep({ form }: LocationStepProps) {
  const { register, formState: { errors }, setValue, watch } = form

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter the location where the vehicle is currently stored. This helps
        buyers plan for transport and inspection.
      </p>

      <div className="space-y-2">
        <Label htmlFor="locationCountry">Country *</Label>
        <Select
          value={watch('locationCountry')}
          onValueChange={(value) => setValue('locationCountry', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {EU_COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.locationCountry && (
          <p className="text-sm text-destructive">{errors.locationCountry.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="locationCity">City *</Label>
          <Input
            id="locationCity"
            placeholder="e.g., Bucharest, Munich, London"
            {...register('locationCity')}
          />
          {errors.locationCity && (
            <p className="text-sm text-destructive">{errors.locationCity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationRegion">Region/State (optional)</Label>
          <Input
            id="locationRegion"
            placeholder="e.g., Ilfov, Bavaria, Kent"
            {...register('locationRegion')}
          />
          {errors.locationRegion && (
            <p className="text-sm text-destructive">{errors.locationRegion.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
        <h4 className="font-medium text-blue-800 dark:text-blue-200">
          Transport Note
        </h4>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
          Buyers are responsible for arranging transport. Many vehicles sold on
          Finds are non-running and require flatbed transport. The exact pickup
          address will be shared with the winning buyer after payment.
        </p>
      </div>
    </div>
  )
}
