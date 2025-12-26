'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Mail, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error'

export default function VerifyEmailPage() {
  const t = useTranslations('auth')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const token = searchParams.get('token')
  const required = searchParams.get('required') === 'true'
  const callbackUrl = searchParams.get('callbackUrl')

  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [resending, setResending] = useState(false)

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setStatus('verifying')
    setErrorMessage('')

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setUserEmail(data.email || '')
        toast.success(t('verificationSuccess'))

        // Redirect to callback URL or login after 3 seconds
        setTimeout(() => {
          if (callbackUrl) {
            router.push(callbackUrl)
          } else {
            router.push('/login?verified=true')
          }
        }, 3000)
      } else {
        setStatus('error')
        setErrorMessage(data.message || tErrors('serverError'))
        toast.error(data.message || tErrors('serverError'))
      }
    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setErrorMessage(tErrors('serverError'))
      toast.error(tErrors('serverError'))
    }
  }, [t, tErrors, callbackUrl, router])

  useEffect(() => {
    // If we have a token in the URL, automatically verify it
    if (token) {
      verifyEmail(token)
    }
  }, [token, verifyEmail])

  const handleResendEmail = async () => {
    if (resending) return

    setResending(true)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Verification email sent successfully')
      } else {
        toast.error(data.message || 'Failed to resend verification email')
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      toast.error('Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  // Show verification pending message if no token
  if (!token) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('verifyEmail')}</CardTitle>
            <CardDescription>
              {required
                ? 'You need to verify your email to access this feature'
                : t('verifyEmailSent')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {required && (
              <Alert variant="default" className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">
                  Email Verification Required
                </AlertTitle>
                <AlertDescription className="text-warning/90">
                  {callbackUrl
                    ? 'To continue, please verify your email address by clicking the link we sent to your inbox.'
                    : 'Some features require a verified email address. Please check your inbox for the verification link.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t('checkEmailInstructions')}
              </p>
              {session?.user?.email && (
                <p className="mt-2 text-sm font-medium">{session.user.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('emailNotReceived')}
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                <li>{t('checkSpamFolder')}</li>
                <li>{t('verifyEmailCorrect')}</li>
                <li>{t('waitFewMinutes')}</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            {session?.user && (
              <Button
                onClick={handleResendEmail}
                disabled={resending}
                className="w-full"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
            )}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">{t('backToLogin')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Show verifying state
  if (status === 'verifying') {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('verifyingEmail')}</CardTitle>
            <CardDescription>{t('pleaseWait')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show success state
  if (status === 'success') {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <CardTitle className="text-2xl">{t('verificationSuccess')}</CardTitle>
            <CardDescription>{t('emailVerifiedMessage')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userEmail && (
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm font-medium">{userEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {t('verifiedAccount')}
                </p>
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {t('redirectingToLogin')}
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/login">{t('continueToLogin')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Show error state
  if (status === 'error') {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl">{t('verificationFailed')}</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                {t('verificationFailedInstructions')}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" asChild>
              <Link href="/register">{t('registerAgain')}</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">{t('backToLogin')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return null
}
