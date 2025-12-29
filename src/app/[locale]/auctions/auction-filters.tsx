'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Search } from 'lucide-react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

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
  const currentSearch = searchParams.get('q') || ''

  // Local search state for immediate UI updates
  const [searchInput, setSearchInput] = useState(currentSearch)
  const debouncedSearch = useDebouncedValue(searchInput, 300)

  // Update URL when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      updateFilter('q', debouncedSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Sync input with URL param (for back button)
  useEffect(() => {
    setSearchInput(currentSearch)
  }, [currentSearch])

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
    setSearchInput('')
    router.push(pathname)
  }

  const clearSearch = () => {
    setSearchInput('')
  }

  const hasFilters = currentCategory || currentCountry || currentSearch

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by make, model, or keywords..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchInput && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
        {/* Category */}
        <Select
          value={currentCategory || '__all__'}
          onValueChange={(value) => updateFilter('category', value === '__all__' ? '' : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Country */}
        <Select
          value={currentCountry || '__all__'}
          onValueChange={(value) => updateFilter('country', value === '__all__' ? '' : value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Countries</SelectItem>
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {searchInput && (
              <SelectItem value="relevance">Relevance</SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
            <X className="mr-1 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  )
}
