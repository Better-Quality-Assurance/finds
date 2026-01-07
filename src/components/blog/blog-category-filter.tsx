'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const categories = [
  'all',
  'buying-guide',
  'selling-guide',
  'market-insights',
  'restoration',
  'fraud-prevention',
  'auction-tips',
]

type Props = {
  currentCategory?: string
}

export function BlogCategoryFilter({ currentCategory = 'all' }: Props) {
  const t = useTranslations('blog')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (category === 'all') {
      params.delete('category')
    } else {
      params.set('category', category)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(category => (
        <Button
          key={category}
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-full',
            currentCategory === category || (category === 'all' && !currentCategory)
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted hover:bg-muted/80'
          )}
          onClick={() => handleCategoryChange(category)}
        >
          {t(`categories.${category}`)}
        </Button>
      ))}
    </div>
  )
}
