import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  ArrowRight,
  Wallet,
  TrendingUp
} from 'lucide-react'
import { SellerPayoutButton } from '@/components/seller/SellerPayoutButton'
import { StripeExpressDashboardButton } from '@/components/seller/StripeExpressDashboardButton'

export async function generateMetadata() {
  const t = await getTranslations('seller')
  return {
    title: t('dashboard.title'),
    description: t('dashboard.description'),
  }
}

type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning'
  icon: typeof Clock
}> = {
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  processing: { label: 'Processing', variant: 'default', icon: TrendingUp },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive', icon: XCircle },
}

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; warning?: string; info?: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/login?callbackUrl=/account/seller')
  }

  const t = await getTranslations('seller')

  // Check if user is a seller
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      stripeConnectAccountId: true,
      stripeConnectStatus: true,
      payoutEnabled: true,
      stripeConnectOnboardedAt: true,
    },
  })

  if (!user || user.role === 'USER') {
    redirect('/account')
  }

  // Get sold auctions with payout info
  const soldAuctions = await prisma.auction.findMany({
    where: {
      listing: {
        sellerId: session.user.id,
      },
      status: 'SOLD',
      paymentStatus: 'PAID',
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          year: true,
          make: true,
          model: true,
        },
      },
    },
    orderBy: {
      paidAt: 'desc',
    },
    take: 10,
  })

  // Calculate totals
  const totalRevenue = soldAuctions.reduce((sum, auction) => {
    return sum + (auction.finalPrice ? Number(auction.finalPrice) : 0)
  }, 0)

  const totalPayouts = soldAuctions.reduce((sum, auction) => {
    return sum + (auction.sellerPayoutAmount ? Number(auction.sellerPayoutAmount) : 0)
  }, 0)

  const pendingPayouts = soldAuctions.filter(a =>
    a.sellerPayoutStatus === 'pending' || a.sellerPayoutStatus === null
  ).reduce((sum, auction) => {
    return sum + (auction.finalPrice ? Number(auction.finalPrice) : 0)
  }, 0)

  // Get Stripe Connect account info if exists
  let connectAccount = null
  if (user.stripeConnectAccountId) {
    try {
      connectAccount = await stripe.accounts.retrieve(user.stripeConnectAccountId)
    } catch (error) {
      console.error('Failed to retrieve Connect account:', error)
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('dashboard.description')}</p>
      </div>

      {/* Status Messages */}
      {searchParams.success === 'onboarding_complete' && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard.onboardingComplete')}
          </AlertDescription>
        </Alert>
      )}
      {searchParams.warning === 'additional_info_required' && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('dashboard.additionalInfoRequired')}
          </AlertDescription>
        </Alert>
      )}
      {searchParams.error && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {t(`dashboard.errors.${searchParams.error}`, {
              default: t('dashboard.errors.generic')
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Connect Account Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t('dashboard.payoutAccount')}
          </CardTitle>
          <CardDescription>{t('dashboard.payoutAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!user.stripeConnectAccountId ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('dashboard.noPayoutAccount')}
              </p>
              <SellerPayoutButton variant="default" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('dashboard.accountStatus')}</span>
                    {user.stripeConnectStatus === 'active' && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {t('dashboard.status.active')}
                      </Badge>
                    )}
                    {user.stripeConnectStatus === 'pending' && (
                      <Badge variant="warning" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {t('dashboard.status.pending')}
                      </Badge>
                    )}
                    {user.stripeConnectStatus === 'restricted' && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t('dashboard.status.restricted')}
                      </Badge>
                    )}
                  </div>
                  {user.payoutEnabled && (
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.payoutsEnabled')}
                    </p>
                  )}
                  {connectAccount?.requirements?.currently_due && connectAccount.requirements.currently_due.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t('dashboard.requirementsOutstanding', {
                        count: connectAccount.requirements.currently_due.length
                      })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {user.stripeConnectStatus !== 'active' && (
                    <SellerPayoutButton variant="outline" isSetup />
                  )}
                  {user.payoutEnabled && (
                    <StripeExpressDashboardButton accountId={user.stripeConnectAccountId} />
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Overview */}
      {soldAuctions.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.totalRevenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRevenue, 'EUR')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.fromSales', { count: soldAuctions.length })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.totalPayouts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalPayouts, 'EUR')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.completed')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.pendingPayouts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(pendingPayouts, 'EUR')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('dashboard.awaitingPayout')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('dashboard.payoutHistory')}
          </CardTitle>
          <CardDescription>{t('dashboard.payoutHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {soldAuctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                {t('dashboard.noPayouts')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {soldAuctions.map((auction) => {
                const payoutStatus = (auction.sellerPayoutStatus || 'pending') as PayoutStatus
                const statusConfig = PAYOUT_STATUS_CONFIG[payoutStatus]
                const StatusIcon = statusConfig.icon
                const listingTitle = auction.listing.title ||
                  `${auction.listing.year} ${auction.listing.make} ${auction.listing.model}`

                return (
                  <div
                    key={auction.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{listingTitle}</h4>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {t(`dashboard.payoutStatus.${payoutStatus}`)}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>
                          {t('dashboard.soldFor')}: {formatCurrency(Number(auction.finalPrice), auction.currency)}
                        </span>
                        {auction.sellerPayoutAmount && (
                          <span>
                            {t('dashboard.payout')}: {formatCurrency(Number(auction.sellerPayoutAmount), auction.currency)}
                          </span>
                        )}
                        {auction.sellerPaidAt && (
                          <span>
                            {t('dashboard.paidOn')}: {new Date(auction.sellerPaidAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {auction.sellerPayoutId && (
                      <div className="text-xs text-muted-foreground">
                        ID: {auction.sellerPayoutId.slice(-8)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
