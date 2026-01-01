import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import WatchlistClient from './watchlist-client'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })

  return {
    title: t('watchlist'),
  }
}

export default async function WatchlistPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const t = await getTranslations('account')

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('watchlist')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('watchlistPageDescription')}
        </p>
      </div>

      <WatchlistClient />
    </div>
  )
}
