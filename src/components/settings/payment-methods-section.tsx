'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { CreditCard, Plus, Trash2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CardIcon({ brand }: { brand: string }) {
  const brandColors: Record<string, string> = {
    visa: 'text-blue-600',
    mastercard: 'text-orange-500',
    amex: 'text-blue-500',
    discover: 'text-orange-600',
  }

  return (
    <CreditCard className={`h-5 w-5 ${brandColors[brand] || 'text-gray-500'}`} />
  )
}

function AddPaymentMethodForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const t = useTranslations('settings')
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {return}

    setLoading(true)
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/settings`,
        },
        redirect: 'if_required',
      })

      if (error) {
        toast.error(error.message || t('paymentSetupError'))
      } else {
        // Enable bidding after successful setup
        await fetch('/api/payments/setup', { method: 'PUT' })
        toast.success(t('paymentMethodAdded'))
        onSuccess()
      }
    } catch {
      toast.error(t('paymentSetupError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-2">
        <Button type="submit" disabled={!stripe || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('addCard')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  )
}

export function PaymentMethodsSection() {
  const t = useTranslations('settings')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [biddingEnabled, setBiddingEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [addingCard, setAddingCard] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/account/payment-methods')
      if (!response.ok) {throw new Error('Failed to fetch')}
      const data = await response.json()
      setPaymentMethods(data.paymentMethods || [])
      setBiddingEnabled(data.biddingEnabled)
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      toast.error(t('paymentFetchError'))
    } finally {
      setLoading(false)
    }
  }

  const startAddCard = async () => {
    try {
      const response = await fetch('/api/payments/setup', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start setup')
      }
      const data = await response.json()
      setClientSecret(data.clientSecret)
      setAddingCard(true)
    } catch (error: unknown) {
      console.error('Error starting card setup:', error)
      toast.error(error instanceof Error ? error.message : t('paymentSetupError'))
    }
  }

  const handleAddSuccess = () => {
    setAddingCard(false)
    setClientSecret(null)
    fetchPaymentMethods()
  }

  const handleCancelAdd = () => {
    setAddingCard(false)
    setClientSecret(null)
  }

  const deletePaymentMethod = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/account/payment-methods?id=${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {throw new Error('Failed to delete')}

      setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id))
      if (paymentMethods.length <= 1) {
        setBiddingEnabled(false)
      }
      toast.success(t('paymentMethodRemoved'))
    } catch (error) {
      console.error('Error deleting payment method:', error)
      toast.error(t('paymentRemoveError'))
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('paymentMethodsTitle')}
          </CardTitle>
          <CardDescription>{t('paymentMethodsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bidding Status */}
          <div className="flex items-center gap-2 rounded-lg border p-3">
            {biddingEnabled ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm">{t('biddingEnabled')}</span>
                <Badge variant="outline" className="ml-auto">
                  {t('active')}
                </Badge>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm">{t('biddingDisabled')}</span>
                <Badge variant="secondary" className="ml-auto">
                  {t('inactive')}
                </Badge>
              </>
            )}
          </div>

          {/* Payment Methods List */}
          {paymentMethods.length > 0 ? (
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <CardIcon brand={pm.brand} />
                    <div>
                      <p className="font-medium capitalize">
                        {pm.brand} •••• {pm.last4}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('expires')} {pm.expMonth}/{pm.expYear}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteId(pm.id)}
                    disabled={deletingId === pm.id}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    {deletingId === pm.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noPaymentMethods')}</p>
          )}

          {/* Add Card Form */}
          {addingCard && clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe' },
              }}
            >
              <AddPaymentMethodForm
                clientSecret={clientSecret}
                onSuccess={handleAddSuccess}
                onCancel={handleCancelAdd}
              />
            </Elements>
          ) : (
            <Button onClick={startAddCard} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              {t('addPaymentMethod')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removePaymentMethodTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentMethods.length === 1
                ? t('removeLastPaymentMethodWarning')
                : t('removePaymentMethodDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deletePaymentMethod(confirmDeleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
