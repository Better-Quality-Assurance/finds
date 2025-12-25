'use client'

import { UseFormReturn } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ListingFormData } from '../listing-form'

type ConditionStepProps = {
  form: UseFormReturn<ListingFormData>
}

const CONDITION_RATINGS = [
  { value: 1, label: '1 - Parts only' },
  { value: 2, label: '2 - Heavily deteriorated' },
  { value: 3, label: '3 - Major restoration needed' },
  { value: 4, label: '4 - Restoration project' },
  { value: 5, label: '5 - Running but needs work' },
  { value: 6, label: '6 - Driver quality' },
  { value: 7, label: '7 - Good condition' },
  { value: 8, label: '8 - Very good condition' },
  { value: 9, label: '9 - Excellent condition' },
  { value: 10, label: '10 - Concours/Show quality' },
]

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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Non-running vehicles are welcome on Finds. Barn finds and project
            cars are a significant part of our community. Be sure to describe
            what is known about why the vehicle does not run.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="conditionRating">Overall Condition Rating (optional)</Label>
        <Select
          value={watch('conditionRating')?.toString()}
          onValueChange={(value) => setValue('conditionRating', parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select condition rating" />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_RATINGS.map((rating) => (
              <SelectItem key={rating.value} value={rating.value.toString()}>
                {rating.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Be honest about the condition. Buyers appreciate transparency.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="conditionNotes">Condition Notes (optional)</Label>
        <Textarea
          id="conditionNotes"
          placeholder="Describe the overall condition of the vehicle. Include details about bodywork, interior, mechanics, etc."
          rows={4}
          {...register('conditionNotes')}
        />
        {errors.conditionNotes && (
          <p className="text-sm text-destructive">{errors.conditionNotes.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="knownIssues">Known Issues *</Label>
        <Textarea
          id="knownIssues"
          placeholder="List all known issues, defects, or problems with the vehicle. Be thorough - this protects both you and the buyer."
          rows={4}
          {...register('knownIssues')}
        />
        {errors.knownIssues && (
          <p className="text-sm text-destructive">{errors.knownIssues.message}</p>
        )}
        <p className="text-sm text-muted-foreground">
          If there are no known issues, you can write &quot;No known issues&quot;.
          However, for project cars and barn finds, there are usually multiple
          items to disclose.
        </p>
      </div>
    </div>
  )
}
