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
    <div className="flex flex-wrap gap-3">
      {categories.map(category => {
        const isActive = currentCategory === category || (category === 'all' && !currentCategory)
        return (
          <Button
            key={category}
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-full font-medium transition-all duration-300',
              isActive
                ? 'bg-gradient-premium text-primary-foreground shadow-md hover:shadow-lg hover:bg-gradient-premium-hover'
                : 'bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30'
            )}
            onClick={() => handleCategoryChange(category)}
          >
            {t(`categories.${category}`)}
          </Button>
        )
      })}
    </div>
  )
}
