'use client'

import { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FormSelect, FormTextarea } from '@/components/ui/form-field'
import type { ListingFormData } from '@/lib/validation-schemas'
import { CONDITION_RATINGS } from '@/constants/listing-form'

type ConditionStepProps = {
  form: UseFormReturn<ListingFormData>
}

export function ConditionStep({ form }: ConditionStepProps) {
  const { register, formState: { errors }, setValue, watch } = form
  const isRunning = watch('isRunning')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="isRunning" className="text-base">
            Is the vehicle running?
          </Label>
          <p className="text-sm text-muted-foreground">
            Can the vehicle be driven under its own power?
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
            Non-running vehicles are welcome on Finds. Barn finds and project
            cars are a significant part of our community. Be sure to describe
            what is known about why the vehicle does not run.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <FormSelect
          label="Overall Condition Rating"
          fieldName="conditionRating"
          value={watch('conditionRating')?.toString()}
          onValueChange={(value) => setValue('conditionRating', parseInt(value))}
          placeholder="Select condition rating"
          options={CONDITION_RATINGS.map((rating) => ({
            value: rating.value.toString(),
            label: rating.label,
          }))}
          error={errors.conditionRating}
        />
        <p className="text-sm text-muted-foreground">
          Be honest about the condition. Buyers appreciate transparency.
        </p>
      </div>

      <FormTextarea
        label="Condition Notes"
        registration={register('conditionNotes')}
        placeholder="Describe the overall condition of the vehicle. Include details about bodywork, interior, mechanics, etc."
        rows={4}
        error={errors.conditionNotes}
      />

      <div className="space-y-2">
        <FormTextarea
          label="Known Issues"
          registration={register('knownIssues')}
          placeholder="List all known issues, defects, or problems with the vehicle. Be thorough - this protects both you and the buyer."
          rows={4}
          error={errors.knownIssues}
          required
        />
        <p className="text-sm text-muted-foreground">
          If there are no known issues, you can write &quot;No known issues&quot;.
          However, for project cars and barn finds, there are usually multiple
          items to disclose.
        </p>
      </div>
    </div>
  )
}
