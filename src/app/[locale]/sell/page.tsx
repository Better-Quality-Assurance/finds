import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { ListingForm } from '@/components/listing/listing-form'

export async function generateMetadata() {
  const t = await getTranslations('sell')
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function SellPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login?callbackUrl=/sell')
  }

  const t = await getTranslations('sell')

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
        </div>

        <ListingForm />
      </div>
    </div>
  )
}
