'use client'

import { UseFormReturn } from 'react-hook-form'
import { FormInput, FormSelect } from '@/components/ui/form-field'
import type { ListingFormData } from '@/lib/validation-schemas'
import { EU_COUNTRIES } from '@/constants/listing-form'

type LocationStepProps = {
  form: UseFormReturn<ListingFormData>
}

export function LocationStep({ form }: LocationStepProps) {
  const { register, formState: { errors }, setValue, watch } = form

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Enter the location where the vehicle is currently stored. This helps
        buyers plan for transport and inspection.
      </p>

      <FormSelect
        label="Country"
        fieldName="locationCountry"
        value={watch('locationCountry')}
        onValueChange={(value) => setValue('locationCountry', value)}
        placeholder="Select country"
        options={EU_COUNTRIES.map((country) => ({
          value: country.code,
          label: country.name,
        }))}
        error={errors.locationCountry}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          label="City"
          registration={register('locationCity')}
          placeholder="e.g., Bucharest, Munich, London"
          error={errors.locationCity}
          required
        />

        <FormInput
          label="Region/State"
          registration={register('locationRegion')}
          placeholder="e.g., Ilfov, Bavaria, Kent"
          error={errors.locationRegion}
        />
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
        <h4 className="font-medium text-primary">
          Transport Note
        </h4>
        <p className="mt-1 text-sm text-primary/80">
          Buyers are responsible for arranging transport. Many vehicles sold on
          Finds are non-running and require flatbed transport. The exact pickup
          address will be shared with the winning buyer after payment.
        </p>
      </div>
    </div>
  )
}
