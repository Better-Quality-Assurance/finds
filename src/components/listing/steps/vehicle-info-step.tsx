'use client'

import { UseFormReturn } from 'react-hook-form'
import { FormInput, FormSelect } from '@/components/ui/form-field'
import type { ListingFormData } from '@/lib/validation-schemas'
import { CATEGORIES, COMMON_MAKES } from '@/constants/listing-form'

type VehicleInfoStepProps = {
  form: UseFormReturn<ListingFormData>
}

export function VehicleInfoStep({ form }: VehicleInfoStepProps) {
  const { register, formState: { errors }, setValue, watch } = form

  return (
    <div className="space-y-6">
      <FormSelect
        label="Category"
        fieldName="category"
        value={watch('category')}
        onValueChange={(value) => setValue('category', value)}
        placeholder="Select category"
        options={CATEGORIES}
        error={errors.category}
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormSelect
          label="Make"
          fieldName="make"
          value={watch('make')}
          onValueChange={(value) => setValue('make', value)}
          placeholder="Select make"
          options={COMMON_MAKES.map((make) => ({ value: make, label: make }))}
          error={errors.make}
          required
        />

        <FormInput
          label="Model"
          registration={register('model')}
          placeholder="e.g., Mustang, 911, E-Type"
          error={errors.model}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          label="Year"
          registration={register('year')}
          type="number"
          min={1900}
          max={new Date().getFullYear() + 1}
          error={errors.year}
          required
        />

        <FormInput
          label="VIN"
          registration={register('vin')}
          placeholder="Vehicle Identification Number"
          error={errors.vin}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormInput
          label="Mileage"
          registration={register('mileage')}
          type="number"
          min={0}
          placeholder="Enter mileage"
          error={errors.mileage}
          wrapperClassName="md:col-span-2"
        />

        <FormSelect
          label="Unit"
          fieldName="mileageUnit"
          value={watch('mileageUnit')}
          onValueChange={(value) => setValue('mileageUnit', value as 'km' | 'miles')}
          options={[
            { value: 'km', label: 'Kilometers' },
            { value: 'miles', label: 'Miles' },
          ]}
        />
      </div>

      <FormInput
        label="Registration Country"
        registration={register('registrationCountry')}
        placeholder="e.g., Romania, Germany, UK"
      />
    </div>
  )
}
