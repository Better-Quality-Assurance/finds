'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const CATEGORIES = [
  { value: 'CLASSIC_CAR', label: 'Classic Car' },
  { value: 'RETRO_CAR', label: 'Retro Car' },
  { value: 'BARN_FIND', label: 'Barn Find' },
  { value: 'PROJECT_CAR', label: 'Project Car' },
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'PARTS', label: 'Parts' },
  { value: 'MEMORABILIA', label: 'Memorabilia' },
]

const COUNTRIES = [
  { code: 'RO', name: 'Romania' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Poland' },
]

const SORT_OPTIONS = [
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'newly_listed', label: 'Newly Listed' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'most_bids', label: 'Most Bids' },
]

export function AuctionFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentCategory = searchParams.get('category') || ''
  const currentCountry = searchParams.get('country') || ''
  const currentSort = searchParams.get('sort') || 'ending_soon'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to page 1 when filters change
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const hasFilters = currentCategory || currentCountry

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      {/* Category */}
      <Select
        value={currentCategory}
        onValueChange={(value) => updateFilter('category', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Country */}
      <Select
        value={currentCountry}
        onValueChange={(value) => updateFilter('country', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Countries</SelectItem>
          {COUNTRIES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={currentSort}
        onValueChange={(value) => updateFilter('sort', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
