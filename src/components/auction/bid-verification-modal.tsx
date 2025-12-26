'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Check,
  Mail,
  Phone,
  CreditCard,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type VerificationStep = 'email' | 'phone' | 'payment' | 'complete'

interface BidVerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerificationComplete: () => void
}

interface VerificationStatus {
  emailVerified: boolean
  phoneVerified: boolean
  paymentMethodAdded: boolean
  biddingEnabled: boolean
}

export function BidVerificationModal({
  open,
  onOpenChange,
  onVerificationComplete,
}: BidVerificationModalProps) {
  const { data: session, update: updateSession } = useSession()
  const [currentStep, setCurrentStep] = useState<VerificationStep>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<VerificationStatus | null>(null)

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Fetch verification status on mount
  useEffect(() => {
    if (open) {
      fetchVerificationStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldownSeconds])

  const fetchVerificationStatus = async () => {
    try {
      const res = await fetch('/api/user/verification-status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)

        // Determine initial step based on status
        if (!data.emailVerified) {
          setCurrentStep('email')
        } else if (!data.phoneVerified) {
          setCurrentStep('phone')
        } else if (!data.paymentMethodAdded || !data.biddingEnabled) {
          setCurrentStep('payment')
        } else {
          setCurrentStep('complete')
          onVerificationComplete()
        }
      }
    } catch (error) {
      console.error('Failed to fetch verification status:', error)
    }
  }

  const handleSendPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Failed to send verification code')
        if (data.cooldownSeconds) {
          setCooldownSeconds(data.cooldownSeconds)
        }
        return
      }

      toast.success('Verification code sent!')
      setCodeSent(true)
      setCooldownSeconds(60) // 1 minute cooldown for resend
    } catch (error) {
      toast.error('Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyPhoneCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/verify-phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Invalid verification code')
        return
      }

      toast.success('Phone verified!')
      await fetchVerificationStatus()
      setCurrentStep('payment')
    } catch (error) {
      toast.error('Failed to verify code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.message || 'Failed to resend verification email')
        return
      }

      toast.success('Verification email sent! Check your inbox.')
    } catch (error) {
      toast.error('Failed to send verification email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupPayment = async () => {
    // Redirect to payment setup page
    window.location.href = '/account/payment'
  }

  const renderStepIndicator = () => {
    const steps = [
      { key: 'email' as const, label: 'Email', icon: Mail },
      { key: 'phone' as const, label: 'Phone', icon: Phone },
      { key: 'payment' as const, label: 'Payment', icon: CreditCard },
    ]

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => {
          const isComplete =
            (step.key === 'email' && status?.emailVerified) ||
            (step.key === 'phone' && status?.phoneVerified) ||
            (step.key === 'payment' && status?.paymentMethodAdded)
          const isCurrent = step.key === currentStep

          return (
            <div key={step.key} className="flex items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  isComplete
                    ? 'border-success bg-success text-success-foreground'
                    : isCurrent
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    isComplete ? 'bg-success' : 'bg-muted-foreground/30'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderEmailStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Mail className="h-8 w-8" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Verify Your Email</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ve sent a verification link to your email address. Please check your inbox and click
          the link to verify.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          onClick={handleResendEmail}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Resend Verification Email
        </Button>
        <Button
          variant="ghost"
          onClick={fetchVerificationStatus}
          disabled={isLoading}
        >
          I&apos;ve Verified My Email
        </Button>
      </div>
    </div>
  )

  const renderPhoneStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Phone className="h-8 w-8" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Verify Your Phone</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your phone number to receive a verification code via SMS.
        </p>
      </div>

      {!codeSent ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+40 712 345 678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter with country code (e.g., +40 for Romania)
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleSendPhoneCode}
            disabled={isLoading || !phoneNumber.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Send Verification Code
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              disabled={isLoading}
              className="text-center text-lg tracking-widest"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleVerifyPhoneCode}
            disabled={isLoading || verificationCode.length !== 6}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Verify Code
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleSendPhoneCode}
            disabled={isLoading || cooldownSeconds > 0}
          >
            {cooldownSeconds > 0
              ? `Resend code in ${cooldownSeconds}s`
              : 'Resend Code'}
          </Button>
        </div>
      )}
    </div>
  )

  const renderPaymentStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CreditCard className="h-8 w-8" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">Add Payment Method</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a payment method to enable bidding. A hold of up to 5% will be placed on your card
          when you place a bid.
        </p>
      </div>
      <div className="rounded-lg border bg-muted/50 p-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">Bid Deposit</p>
            <p>
              When you bid, a hold of 5% (min €500, max €5,000) is placed on your card. This is
              released when you&apos;re outbid or the auction ends.
            </p>
          </div>
        </div>
      </div>
      <Button className="w-full" onClick={handleSetupPayment}>
        <CreditCard className="h-4 w-4 mr-2" />
        Setup Payment Method
      </Button>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-8 w-8" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold">You&apos;re Ready to Bid!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is verified and ready. You can now place bids on auctions.
        </p>
      </div>
      <Button
        className="w-full"
        onClick={() => {
          onOpenChange(false)
          onVerificationComplete()
        }}
      >
        Start Bidding
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verification Required</DialogTitle>
          <DialogDescription>
            Complete these steps to start bidding on auctions.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <div className="mt-4">
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'phone' && renderPhoneStep()}
          {currentStep === 'payment' && renderPaymentStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
