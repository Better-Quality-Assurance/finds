/**
 * Currency Configuration System
 *
 * Provides centralized currency metadata following Open-Closed Principle.
 * Extensible for EU expansion without modifying existing code.
 */

export interface CurrencyMetadata {
  code: string;
  symbol: string;
  symbolPosition: 'before' | 'after';
  locale: string;
  decimalPlaces: number;
  name: string;
}

/**
 * Supported currencies for the Finds platform
 * Ordered by implementation priority (Romania-first, then EU expansion)
 */
export const CURRENCY_CONFIG: Record<string, CurrencyMetadata> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    symbolPosition: 'after',
    locale: 'en-EU',
    decimalPlaces: 2,
    name: 'Euro',
  },
  RON: {
    code: 'RON',
    symbol: 'lei',
    symbolPosition: 'after',
    locale: 'ro-RO',
    decimalPlaces: 2,
    name: 'Romanian Leu',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    symbolPosition: 'before',
    locale: 'en-US',
    decimalPlaces: 2,
    name: 'US Dollar',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    symbolPosition: 'before',
    locale: 'en-GB',
    decimalPlaces: 2,
    name: 'British Pound',
  },
  PLN: {
    code: 'PLN',
    symbol: 'zł',
    symbolPosition: 'after',
    locale: 'pl-PL',
    decimalPlaces: 2,
    name: 'Polish Złoty',
  },
  CZK: {
    code: 'CZK',
    symbol: 'Kč',
    symbolPosition: 'after',
    locale: 'cs-CZ',
    decimalPlaces: 2,
    name: 'Czech Koruna',
  },
  HUF: {
    code: 'HUF',
    symbol: 'Ft',
    symbolPosition: 'after',
    locale: 'hu-HU',
    decimalPlaces: 0,
    name: 'Hungarian Forint',
  },
};

/**
 * Get currency symbol for a given currency code
 * @param currencyCode - ISO 4217 currency code (e.g., 'EUR', 'USD')
 * @returns Currency symbol or empty string if not found
 */
export function getCurrencySymbol(currencyCode: string): string {
  const config = CURRENCY_CONFIG[currencyCode.toUpperCase()];
  return config?.symbol ?? '';
}

/**
 * Get full currency metadata
 * @param currencyCode - ISO 4217 currency code
 * @returns Complete currency configuration or undefined
 */
export function getCurrencyConfig(currencyCode: string): CurrencyMetadata | undefined {
  return CURRENCY_CONFIG[currencyCode.toUpperCase()];
}

/**
 * Format amount with currency symbol in correct position
 * @param amount - Numeric amount to format
 * @param currencyCode - ISO 4217 currency code
 * @returns Formatted string with symbol (e.g., "€1,234.56" or "1,234.56 lei")
 */
export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const config = getCurrencyConfig(currencyCode);

  if (!config) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const formattedAmount = amount.toLocaleString(config.locale, {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces,
  });

  return config.symbolPosition === 'before'
    ? `${config.symbol}${formattedAmount}`
    : `${formattedAmount} ${config.symbol}`;
}

/**
 * Get list of all supported currency codes
 * @returns Array of ISO 4217 currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_CONFIG);
}

/**
 * Check if a currency code is supported
 * @param currencyCode - ISO 4217 currency code to check
 * @returns True if currency is configured
 */
export function isSupportedCurrency(currencyCode: string): boolean {
  return currencyCode.toUpperCase() in CURRENCY_CONFIG;
}
