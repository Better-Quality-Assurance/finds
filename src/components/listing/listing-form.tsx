'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { VehicleInfoStep } from './steps/vehicle-info-step'
import { ConditionStep } from './steps/condition-step'
import { LocationStep } from './steps/location-step'
import { PricingStep } from './steps/pricing-step'
import { PhotosStep } from './steps/photos-step'
import { ReviewStep } from './steps/review-step'

const listingSchema = z.object({
  // Vehicle Info
  category: z.string().min(1, 'Category is required'),
  make: z.string().min(1, 'Make is required').max(50),
  model: z.string().min(1, 'Model is required').max(50),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().int().min(0).optional(),
  mileageUnit: z.enum(['km', 'miles']).default('km'),
  vin: z.string().max(20).optional(),
  registrationCountry: z.string().max(50).optional(),

  // Condition
  conditionRating: z.coerce.number().int().min(1).max(10).optional(),
  conditionNotes: z.string().max(5000).optional(),
  knownIssues: z.string().max(5000).optional(),
  isRunning: z.boolean(),

  // Location
  locationCountry: z.string().min(2, 'Country is required').max(50),
  locationCity: z.string().min(2, 'City is required').max(100),
  locationRegion: z.string().max(100).optional(),

  // Pricing
  startingPrice: z.coerce.number().min(100).max(10000000),
  reservePrice: z.coerce.number().min(100).max(10000000).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'RON']).default('EUR'),

  // Description
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(100, 'Description must be at least 100 characters').max(10000),
})

export type ListingFormData = z.infer<typeof listingSchema>

const STEPS = [
  { id: 'vehicle', title: 'Vehicle Info' },
  { id: 'condition', title: 'Condition' },
  { id: 'location', title: 'Location' },
  { id: 'pricing', title: 'Pricing' },
  { id: 'photos', title: 'Photos' },
  { id: 'review', title: 'Review' },
]

type ListingFormProps = {
  listingId?: string
  initialData?: Partial<ListingFormData>
}

export function ListingForm({ listingId, initialData }: ListingFormProps) {
  const t = useTranslations()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdListingId, setCreatedListingId] = useState<string | null>(listingId || null)

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      category: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      mileage: undefined,
      mileageUnit: 'km',
      vin: '',
      registrationCountry: '',
      conditionRating: 5,
      conditionNotes: '',
      knownIssues: '',
      isRunning: true,
      locationCountry: 'RO',
      locationCity: '',
      locationRegion: '',
      startingPrice: 1000,
      reservePrice: undefined,
      currency: 'EUR',
      title: '',
      description: '',
      ...initialData,
    },
  })

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const handleNext = async () => {
    // Validate current step fields
    const fieldsToValidate = getFieldsForStep(currentStep)
    const isValid = await form.trigger(fieldsToValidate as any)

    if (!isValid) return

    // On first step completion, save draft
    if (currentStep === 0 && !createdListingId) {
      await saveDraft()
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const saveDraft = async () => {
    try {
      setIsSubmitting(true)
      const values = form.getValues()

      // Generate title if not set
      if (!values.title) {
        values.title = `${values.year} ${values.make} ${values.model}`
      }

      // Set default description if not set
      if (!values.description) {
        values.description = `${values.year} ${values.make} ${values.model}. ${values.isRunning ? 'Running condition.' : 'Non-running, project car.'} Located in ${values.locationCity}, ${values.locationCountry}.`
      }

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save draft')
      }

      const listing = await response.json()
      setCreatedListingId(listing.id)
      toast.success('Draft saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!createdListingId) {
      toast.error('Please complete all steps first')
      return
    }

    try {
      setIsSubmitting(true)

      // Update listing with final data
      const values = form.getValues()
      await fetch(`/api/listings/${createdListingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      // Submit for review
      const response = await fetch(`/api/listings/${createdListingId}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit')
      }

      toast.success('Listing submitted for review!')
      router.push('/account/listings')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 0:
        return ['category', 'make', 'model', 'year']
      case 1:
        return ['isRunning']
      case 2:
        return ['locationCountry', 'locationCity']
      case 3:
        return ['startingPrice', 'title', 'description']
      default:
        return []
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-sm">
          <span>{STEPS[currentStep].title}</span>
          <span>Step {currentStep + 1} of {STEPS.length}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Navigation */}
      <div className="mb-8 flex justify-between">
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            onClick={() => index <= currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={`flex items-center gap-2 text-sm ${
              index === currentStep
                ? 'font-medium text-primary'
                : index < currentStep
                  ? 'text-muted-foreground hover:text-primary'
                  : 'text-muted-foreground/50'
            }`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                index === currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : index < currentStep
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted'
              }`}
            >
              {index < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className="hidden md:inline">{step.title}</span>
          </button>
        ))}
      </div>

      {/* Form Steps */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && <VehicleInfoStep form={form} />}
          {currentStep === 1 && <ConditionStep form={form} />}
          {currentStep === 2 && <LocationStep form={form} />}
          {currentStep === 3 && <PricingStep form={form} />}
          {currentStep === 4 && (
            <PhotosStep listingId={createdListingId} />
          )}
          {currentStep === 5 && (
            <ReviewStep form={form} listingId={createdListingId} />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.next')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmitForReview} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Review
          </Button>
        )}
      </div>
    </div>
  )
}
