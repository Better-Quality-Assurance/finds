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

const CATEGORIES = [
  { value: 'CLASSIC_CAR', label: 'Classic Car' },
  { value: 'RETRO_CAR', label: 'Retro Car' },
  { value: 'BARN_FIND', label: 'Barn Find' },
  { value: 'PROJECT_CAR', label: 'Project Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'PARTS', label: 'Parts' },
  { value: 'MEMORABILIA', label: 'Memorabilia' },
]

const COMMON_MAKES = [
  'Alfa Romeo', 'Aston Martin', 'Audi', 'Austin', 'BMW', 'Bentley',
  'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Citroën', 'Dacia',
  'Datsun', 'Dodge', 'Fiat', 'Ford', 'Honda', 'Jaguar', 'Jeep',
  'Lada', 'Lancia', 'Land Rover', 'Lincoln', 'Lotus', 'Maserati',
  'Mazda', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi', 'Morgan',
  'Moskvitch', 'Nissan', 'Oldsmobile', 'Opel', 'Peugeot', 'Plymouth',
  'Pontiac', 'Porsche', 'Renault', 'Rolls-Royce', 'Rover', 'Saab',
  'Seat', 'Skoda', 'Studebaker', 'Subaru', 'Sunbeam', 'Suzuki',
  'Toyota', 'Trabant', 'Triumph', 'Vauxhall', 'Volkswagen', 'Volvo',
  'Wartburg', 'Zastava', 'Other',
]

type VehicleInfoStepProps = {
  form: UseFormReturn<ListingFormData>
}

export function VehicleInfoStep({ form }: VehicleInfoStepProps) {
  const { register, formState: { errors }, setValue, watch } = form

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select
          value={watch('category')}
          onValueChange={(value) => setValue('category', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-sm text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="make">Make *</Label>
          <Select
            value={watch('make')}
            onValueChange={(value) => setValue('make', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select make" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_MAKES.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.make && (
            <p className="text-sm text-destructive">{errors.make.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            placeholder="e.g., Mustang, 911, E-Type"
            {...register('model')}
          />
          {errors.model && (
            <p className="text-sm text-destructive">{errors.model.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="year">Year *</Label>
          <Input
            id="year"
            type="number"
            min={1900}
            max={new Date().getFullYear() + 1}
            {...register('year')}
          />
          {errors.year && (
            <p className="text-sm text-destructive">{errors.year.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vin">VIN (optional)</Label>
          <Input
            id="vin"
            placeholder="Vehicle Identification Number"
            {...register('vin')}
          />
          {errors.vin && (
            <p className="text-sm text-destructive">{errors.vin.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="mileage">Mileage (optional)</Label>
          <Input
            id="mileage"
            type="number"
            min={0}
            placeholder="Enter mileage"
            {...register('mileage')}
          />
          {errors.mileage && (
            <p className="text-sm text-destructive">{errors.mileage.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mileageUnit">Unit</Label>
          <Select
            value={watch('mileageUnit')}
            onValueChange={(value: 'km' | 'miles') => setValue('mileageUnit', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="km">Kilometers</SelectItem>
              <SelectItem value="miles">Miles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationCountry">Registration Country (optional)</Label>
        <Input
          id="registrationCountry"
          placeholder="e.g., Romania, Germany, UK"
          {...register('registrationCountry')}
        />
      </div>
    </div>
  )
}
