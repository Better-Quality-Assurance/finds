'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { resetPasswordFormSchema, type ResetPasswordFormData } from '@/lib/validation-schemas'

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [isLoading, setIsLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
  })

  useEffect(() => {
    if (!token) {
      setTokenError(true)
    }
  }, [token])

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error(t('invalidResetToken'))
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: data.password,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setResetSuccess(true)
        toast.success(t('passwordResetSuccess'))

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        if (result.message.includes('expired')) {
          toast.error(t('resetTokenExpired'))
          setTokenError(true)
        } else if (result.message.includes('Invalid')) {
          toast.error(t('invalidResetToken'))
          setTokenError(true)
        } else {
          toast.error(result.message || tErrors('serverError'))
        }
      }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error(tErrors('serverError'))
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenError) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">{t('invalidResetTokenTitle')}</CardTitle>
            <CardDescription className="text-base">
              {t('invalidResetTokenDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">
                {t('requestNewResetLink')}
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">
                {t('backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (resetSuccess) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">{t('passwordResetSuccessTitle')}</CardTitle>
            <CardDescription className="text-base">
              {t('passwordResetSuccessDescription')}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Link href="/login" className="w-full">
              <Button className="w-full">
                {t('continueToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('resetPasswordTitle')}</CardTitle>
          <CardDescription>
            {t('resetPasswordDescription')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('newPassword')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {tErrors('passwordTooShort')}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('passwordRequirements')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {tErrors('passwordMismatch')}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('resetPassword')}
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                {t('backToLogin')}
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
