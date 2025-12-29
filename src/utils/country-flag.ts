/**
 * Country Flag Utilities
 *
 * Converts ISO 3166-1 alpha-2 country codes to emoji flags
 * for display in bid history and other UI components.
 */

/**
 * Convert ISO country code to emoji flag
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "RO", "DE", "FR")
 * @returns Emoji flag string or empty string if invalid
 *
 * @example
 * getCountryFlag("RO") // "🇷🇴"
 * getCountryFlag("DE") // "🇩🇪"
 * getCountryFlag("FR") // "🇫🇷"
 * getCountryFlag("US") // "🇺🇸"
 */
export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) {
    return ''
  }

  // Convert country code to uppercase
  const code = countryCode.toUpperCase()

  // Validate that it's a valid alpha-2 code (A-Z only)
  if (!/^[A-Z]{2}$/.test(code)) {
    return ''
  }

  // Convert to regional indicator symbols
  // Regional indicator symbol letters are Unicode characters
  // from U+1F1E6 (🇦) to U+1F1FF (🇿)
  // Each letter is offset from 'A' by 0x1F1E6 - 0x41 = 0x1F185
  const OFFSET = 127397 // 0x1F1E6 - 0x41

  const firstChar = code.charCodeAt(0)
  const secondChar = code.charCodeAt(1)

  const flag = String.fromCodePoint(
    firstChar + OFFSET,
    secondChar + OFFSET
  )

  return flag
}

/**
 * Get country flag with fallback text
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @param fallback - Text to show if no flag available (default: country code)
 * @returns Emoji flag or fallback text
 *
 * @example
 * getCountryFlagWithFallback("RO") // "🇷🇴"
 * getCountryFlagWithFallback("XX") // "XX"
 * getCountryFlagWithFallback("XX", "Unknown") // "Unknown"
 */
export function getCountryFlagWithFallback(
  countryCode: string | null | undefined,
  fallback?: string
): string {
  const flag = getCountryFlag(countryCode)
  if (flag) {return flag}

  if (fallback !== undefined) {return fallback}
  return countryCode?.toUpperCase() || ''
}

/**
 * Format bidder display with country flag
 *
 * @param bidderNumber - Anonymous bidder number
 * @param countryCode - ISO country code
 * @returns Formatted string with flag emoji
 *
 * @example
 * formatBidderWithFlag(3154, "RO") // "🇷🇴 Bidder 3154"
 * formatBidderWithFlag(42, "DE") // "🇩🇪 Bidder 42"
 */
export function formatBidderWithFlag(
  bidderNumber: number,
  countryCode: string | null | undefined
): string {
  const flag = getCountryFlag(countryCode)

  if (bidderNumber <= 0) {
    return 'Anonymous Bidder'
  }

  if (flag) {
    return `${flag} Bidder ${bidderNumber}`
  }

  return `Bidder ${bidderNumber}`
}

/**
 * Format bidder display with country flag for mobile
 * Uses compact format with anonymous ID
 *
 * @param bidderNumber - Anonymous bidder number
 * @param countryCode - ISO country code
 * @returns Formatted string with flag emoji
 *
 * @example
 * formatBidderWithFlagMobile(3154, "RO") // "🇷🇴 Bidder A7K"
 */
export function formatBidderWithFlagMobile(
  bidderNumber: number,
  countryCode: string | null | undefined
): string {
  const flag = getCountryFlag(countryCode)

  if (bidderNumber <= 0) {
    return 'Anonymous Bidder'
  }

  // Generate consistent pseudo-anonymous ID (same logic as in bidder-number.service.ts)
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const firstLetter = letters[bidderNumber % letters.length]
  const secondChar = (bidderNumber * 7) % 10
  const thirdLetter = letters[(bidderNumber * 3) % letters.length]
  const anonymousId = `${firstLetter}${secondChar}${thirdLetter}`

  if (flag) {
    return `${flag} Bidder ${anonymousId}`
  }

  return `Bidder ${anonymousId}`
}
