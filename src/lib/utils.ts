import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { AUCTION_CONFIG } from '@/config/auction.config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Calculate buyer fee (delegates to auction config)
 * @deprecated Import from @/config/auction.config or @/domain/auction/rules instead
 */
export function calculateBuyerFee(hammerPrice: number): number {
  return AUCTION_CONFIG.calculateBuyerFee(hammerPrice)
}

/**
 * Calculate total with fee (delegates to auction config)
 * @deprecated Import from @/config/auction.config or @/domain/auction/rules instead
 */
export function calculateTotalWithFee(hammerPrice: number): number {
  return AUCTION_CONFIG.calculateTotalWithFee(hammerPrice)
}
