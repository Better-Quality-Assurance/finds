import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import BidsClient from './bids-client'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account' })

  return {
    title: t('myBids'),
  }
}

export default async function BidsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const t = await getTranslations('account')

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('myBids')}</h1>
        <p className="mt-2 text-muted-foreground">
          {t('myBidsDescription')}
        </p>
      </div>

      <BidsClient />
    </div>
  )
}
