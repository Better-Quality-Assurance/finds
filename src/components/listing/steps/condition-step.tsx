'use client'

import { UseFormReturn } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FormSelect, FormTextarea } from '@/components/ui/form-field'
import type { ListingFormData } from '@/lib/validation-schemas'
import { Wrench, Sparkles, Armchair, Shield, Cog, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type ConditionStepProps = {
  form: UseFormReturn<ListingFormData>
}

const CONDITION_RATINGS = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'VERY_GOOD', label: 'Very Good' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
]

export function ConditionStep({ form }: ConditionStepProps) {
  const { register, formState: { errors }, setValue, watch } = form
  const t = useTranslations('condition')
  const isRunning = watch('isRunning')

  return (
    <div className="space-y-6">
      {/* Running/Non-Running Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="isRunning" className="text-base">
            {t('isRunning.label')}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('isRunning.description')}
          </p>
        </div>
        <Switch
          id="isRunning"
          checked={isRunning}
          onCheckedChange={(checked) => setValue('isRunning', checked)}
        />
      </div>

      {!isRunning && (
        <div className="rounded-lg border border-warning/20 bg-warning/10 p-4">
          <p className="text-sm text-warning">
            {t('nonRunningNotice')}
          </p>
        </div>
      )}

      {/* Detailed Condition Grid Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t('gridIntro')}
        </AlertDescription>
      </Alert>

      {/* Condition Grid - 5 Categories */}
      <div className="space-y-6">
        {/* 1. Overall Condition */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">{t('categories.overall')}</h3>
          </div>
          <FormSelect
            label={t('rating')}
            fieldName="conditionOverall"
            value={watch('conditionOverall') || ''}
            onValueChange={(value) => setValue('conditionOverall', value as any)}
            placeholder={t('selectRating')}
            options={CONDITION_RATINGS.map((rating) => ({
              value: rating.value,
              label: t(`ratings.${rating.value}`),
            }))}
            error={errors.conditionOverall}
          />
          <FormTextarea
            label={t('notes')}
            registration={register('conditionOverallNotes')}
            placeholder={t('categories.overallPlaceholder')}
            rows={3}
            error={errors.conditionOverallNotes}
          />
        </div>

        {/* 2. Paint & Body */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">{t('categories.paintBody')}</h3>
          </div>
          <FormSelect
            label={t('rating')}
            fieldName="conditionPaintBody"
            value={watch('conditionPaintBody') || ''}
            onValueChange={(value) => setValue('conditionPaintBody', value as any)}
            placeholder={t('selectRating')}
            options={CONDITION_RATINGS.map((rating) => ({
              value: rating.value,
              label: t(`ratings.${rating.value}`),
            }))}
            error={errors.conditionPaintBody}
          />
          <FormTextarea
            label={t('notes')}
            registration={register('conditionPaintBodyNotes')}
            placeholder={t('categories.paintBodyPlaceholder')}
            rows={3}
            error={errors.conditionPaintBodyNotes}
          />
        </div>

        {/* 3. Interior */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">{t('categories.interior')}</h3>
          </div>
          <FormSelect
            label={t('rating')}
            fieldName="conditionInterior"
            value={watch('conditionInterior') || ''}
            onValueChange={(value) => setValue('conditionInterior', value as any)}
            placeholder={t('selectRating')}
            options={CONDITION_RATINGS.map((rating) => ({
              value: rating.value,
              label: t(`ratings.${rating.value}`),
            }))}
            error={errors.conditionInterior}
          />
          <FormTextarea
            label={t('notes')}
            registration={register('conditionInteriorNotes')}
            placeholder={t('categories.interiorPlaceholder')}
            rows={3}
            error={errors.conditionInteriorNotes}
          />
        </div>

        {/* 4. Frame & Underbody */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">{t('categories.frame')}</h3>
          </div>
          <FormSelect
            label={t('rating')}
            fieldName="conditionFrame"
            value={watch('conditionFrame') || ''}
            onValueChange={(value) => setValue('conditionFrame', value as any)}
            placeholder={t('selectRating')}
            options={CONDITION_RATINGS.map((rating) => ({
              value: rating.value,
              label: t(`ratings.${rating.value}`),
            }))}
            error={errors.conditionFrame}
          />
          <FormTextarea
            label={t('notes')}
            registration={register('conditionFrameNotes')}
            placeholder={t('categories.framePlaceholder')}
            rows={3}
            error={errors.conditionFrameNotes}
          />
        </div>

        {/* 5. Mechanical */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Cog className="h-5 w-5 text-primary" />
            <h3 className="text-base font-medium">{t('categories.mechanical')}</h3>
          </div>
          <FormSelect
            label={t('rating')}
            fieldName="conditionMechanical"
            value={watch('conditionMechanical') || ''}
            onValueChange={(value) => setValue('conditionMechanical', value as any)}
            placeholder={t('selectRating')}
            options={CONDITION_RATINGS.map((rating) => ({
              value: rating.value,
              label: t(`ratings.${rating.value}`),
            }))}
            error={errors.conditionMechanical}
          />
          <FormTextarea
            label={t('notes')}
            registration={register('conditionMechanicalNotes')}
            placeholder={t('categories.mechanicalPlaceholder')}
            rows={3}
            error={errors.conditionMechanicalNotes}
          />
        </div>
      </div>

      {/* Known Issues - Transparency Section */}
      <div className="space-y-2">
        <FormTextarea
          label={t('knownIssues.label')}
          registration={register('knownIssues')}
          placeholder={t('knownIssues.placeholder')}
          rows={4}
          error={errors.knownIssues}
          required
        />
        <p className="text-sm text-muted-foreground">
          {t('knownIssues.hint')}
        </p>
      </div>
    </div>
  )
}
