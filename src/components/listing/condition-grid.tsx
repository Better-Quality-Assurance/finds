'use client'

import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wrench, Sparkles, Armchair, Shield, Cog } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConditionCategory = {
  rating?: string | null
  notes?: string | null
  icon: React.ComponentType<{ className?: string }>
  translationKey: string
}

type ConditionGridProps = {
  conditionOverall?: string | null
  conditionOverallNotes?: string | null
  conditionPaintBody?: string | null
  conditionPaintBodyNotes?: string | null
  conditionInterior?: string | null
  conditionInteriorNotes?: string | null
  conditionFrame?: string | null
  conditionFrameNotes?: string | null
  conditionMechanical?: string | null
  conditionMechanicalNotes?: string | null
  compact?: boolean
}

const CONDITION_COLORS = {
  EXCELLENT: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'VERY_GOOD': 'bg-green-100 text-green-800 border-green-300',
  GOOD: 'bg-blue-100 text-blue-800 border-blue-300',
  FAIR: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  POOR: 'bg-red-100 text-red-800 border-red-300',
}

export function ConditionGrid({
  conditionOverall,
  conditionOverallNotes,
  conditionPaintBody,
  conditionPaintBodyNotes,
  conditionInterior,
  conditionInteriorNotes,
  conditionFrame,
  conditionFrameNotes,
  conditionMechanical,
  conditionMechanicalNotes,
  compact = false,
}: ConditionGridProps) {
  const t = useTranslations('condition')

  const categories: ConditionCategory[] = [
    {
      rating: conditionOverall,
      notes: conditionOverallNotes,
      icon: Wrench,
      translationKey: 'overall',
    },
    {
      rating: conditionPaintBody,
      notes: conditionPaintBodyNotes,
      icon: Sparkles,
      translationKey: 'paintBody',
    },
    {
      rating: conditionInterior,
      notes: conditionInteriorNotes,
      icon: Armchair,
      translationKey: 'interior',
    },
    {
      rating: conditionFrame,
      notes: conditionFrameNotes,
      icon: Shield,
      translationKey: 'frame',
    },
    {
      rating: conditionMechanical,
      notes: conditionMechanicalNotes,
      icon: Cog,
      translationKey: 'mechanical',
    },
  ]

  // Only render if at least one category has a rating
  const hasAnyRating = categories.some((cat) => cat.rating)
  if (!hasAnyRating) {return null}

  const getConditionBadgeColor = (rating?: string | null): string => {
    if (!rating) {return 'bg-gray-100 text-gray-800 border-gray-300'}
    return CONDITION_COLORS[rating as keyof typeof CONDITION_COLORS] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <Badge variant="outline" className="text-xs">
          {categories.filter((c) => c.rating).length}/{categories.length} {t('categoriesAssessed')}
        </Badge>
      </div>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
        {categories.map((category) => {
          if (!category.rating && compact) {return null}

          const Icon = category.icon
          const badgeColor = getConditionBadgeColor(category.rating)

          return (
            <Card key={category.translationKey} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium mb-2">{t(`categories.${category.translationKey}`)}</h4>
                  {category.rating ? (
                    <>
                      <Badge variant="outline" className={cn('mb-2 font-medium', badgeColor)}>
                        {t(`ratings.${category.rating}`)}
                      </Badge>
                      {category.notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {category.notes}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{t('notAssessed')}</p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {!compact && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            {t('disclaimer')}
          </p>
        </div>
      )}
    </div>
  )
}
