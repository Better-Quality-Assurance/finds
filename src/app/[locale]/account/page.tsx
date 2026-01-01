import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Gavel, Car, Settings, MessageSquare, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/db'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })

  return {
    title: t('dashboard'),
  }
}

export default async function AccountPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const t = await getTranslations('account')

  // Fetch user stats in parallel
  const [watchlistCount, activeBidsCount, listingsCount, unreadMessagesCount] = await Promise.all([
    prisma.watchlist.count({ where: { userId: session.user.id } }),
    prisma.bid.count({
      where: {
        bidderId: session.user.id,
        auction: { status: { in: ['ACTIVE', 'EXTENDED'] } },
      },
    }),
    prisma.listing.count({ where: { sellerId: session.user.id } }),
    prisma.message.count({
      where: {
        conversation: {
          OR: [
            { buyerId: session.user.id },
            { sellerId: session.user.id },
          ],
        },
        senderId: { not: session.user.id },
        isRead: false,
      },
    }),
  ])

  const menuItems = [
    {
      href: '/account/watchlist',
      icon: Heart,
      title: t('watchlist'),
      description: t('watchlistDescription'),
      count: watchlistCount,
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    {
      href: '/account/bids',
      icon: Gavel,
      title: t('myBids'),
      description: t('myBidsDescription'),
      count: activeBidsCount,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      href: '/account/listings',
      icon: Car,
      title: t('myListings'),
      description: t('myListingsDescription'),
      count: listingsCount,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      href: '/account/messages',
      icon: MessageSquare,
      title: t('messages'),
      description: t('messagesDescription'),
      count: unreadMessagesCount,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      href: '/account/seller',
      icon: TrendingUp,
      title: t('sellerDashboard'),
      description: t('sellerDashboardDescription'),
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      href: '/account/settings',
      icon: Settings,
      title: t('settings'),
      description: t('settingsDescription'),
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
    },
  ]

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('welcomeBack', { name: session.user.name || session.user.email })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`rounded-full p-3 ${item.bgColor}`}>
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="flex items-center justify-between text-lg">
                    {item.title}
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`text-sm font-normal ${item.color}`}>
                        {item.count}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
