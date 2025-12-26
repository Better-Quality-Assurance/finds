'use client'

import * as React from 'react'
import { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type FormFieldWrapperProps = {
  label: string
  htmlFor: string
  required?: boolean
  error?: FieldError
  children: React.ReactNode
  className?: string
}

export function FormFieldWrapper({
  label,
  htmlFor,
  required = false,
  error,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor}>
        {label} {required && '*'}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error.message}</p>
      )}
    </div>
  )
}

type FormInputProps = React.ComponentProps<typeof Input> & {
  label: string
  error?: FieldError
  required?: boolean
  registration: UseFormRegisterReturn
  wrapperClassName?: string
}

export function FormInput({
  label,
  error,
  required = false,
  registration,
  wrapperClassName,
  ...inputProps
}: FormInputProps) {
  return (
    <FormFieldWrapper
      label={label}
      htmlFor={registration.name}
      required={required}
      error={error}
      className={wrapperClassName}
    >
      <Input
        id={registration.name}
        {...registration}
        {...inputProps}
      />
    </FormFieldWrapper>
  )
}

type SelectOption = {
  readonly value: string
  readonly label: string
}

type FormSelectProps = {
  label: string
  error?: FieldError
  required?: boolean
  fieldName: string
  value: string | undefined
  onValueChange: (value: string) => void
  placeholder?: string
  options: readonly SelectOption[]
  wrapperClassName?: string
}

export function FormSelect({
  label,
  error,
  required = false,
  fieldName,
  value,
  onValueChange,
  placeholder = 'Select an option',
  options,
  wrapperClassName,
}: FormSelectProps) {
  return (
    <FormFieldWrapper
      label={label}
      htmlFor={fieldName}
      required={required}
      error={error}
      className={wrapperClassName}
    >
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormFieldWrapper>
  )
}

type FormTextareaProps = React.ComponentProps<typeof Textarea> & {
  label: string
  error?: FieldError
  required?: boolean
  registration: UseFormRegisterReturn
  wrapperClassName?: string
}

export function FormTextarea({
  label,
  error,
  required = false,
  registration,
  wrapperClassName,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <FormFieldWrapper
      label={label}
      htmlFor={registration.name}
      required={required}
      error={error}
      className={wrapperClassName}
    >
      <Textarea
        id={registration.name}
        {...registration}
        {...textareaProps}
      />
    </FormFieldWrapper>
  )
}
