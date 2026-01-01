/**
 * VIN Validation Library
 * Implements ISO 3779 standard for Vehicle Identification Numbers
 */

// Characters that are not allowed in VINs (I, O, Q can be confused with 1, 0, 9)
const INVALID_VIN_CHARS = /[IOQ]/i

// VIN must be exactly 17 characters
const VIN_LENGTH = 17

// Valid VIN characters pattern
const VALID_VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i

// Transliteration values for VIN checksum calculation (ISO 3779)
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4,
  '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
}

// Position weights for checksum calculation
const POSITION_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

// Year codes (position 10) - cycles every 30 years
const YEAR_CODES: Record<string, number[]> = {
  A: [1980, 2010],
  B: [1981, 2011],
  C: [1982, 2012],
  D: [1983, 2013],
  E: [1984, 2014],
  F: [1985, 2015],
  G: [1986, 2016],
  H: [1987, 2017],
  J: [1988, 2018],
  K: [1989, 2019],
  L: [1990, 2020],
  M: [1991, 2021],
  N: [1992, 2022],
  P: [1993, 2023],
  R: [1994, 2024],
  S: [1995, 2025],
  T: [1996, 2026],
  V: [1997, 2027],
  W: [1998, 2028],
  X: [1999, 2029],
  Y: [2000, 2030],
  '1': [2001, 2031],
  '2': [2002, 2032],
  '3': [2003, 2033],
  '4': [2004, 2034],
  '5': [2005, 2035],
  '6': [2006, 2036],
  '7': [2007, 2037],
  '8': [2008, 2038],
  '9': [2009, 2039],
}

// World Manufacturer Identifier (WMI) regions
const WMI_REGIONS: Record<string, string> = {
  A: 'Africa', B: 'Africa', C: 'Africa', D: 'Africa', E: 'Africa', F: 'Africa',
  G: 'Africa', H: 'Africa',
  J: 'Asia', K: 'Asia', L: 'Asia', M: 'Asia', N: 'Asia', P: 'Asia', R: 'Asia',
  S: 'Europe', T: 'Europe', U: 'Europe', V: 'Europe', W: 'Europe', X: 'Europe',
  Y: 'Europe', Z: 'Europe',
  '1': 'North America', '2': 'North America', '3': 'North America',
  '4': 'North America', '5': 'North America',
  '6': 'Oceania', '7': 'Oceania',
  '8': 'South America', '9': 'South America',
}

export type VinValidationResult = {
  isValid: boolean
  errors: string[]
  warnings: string[]
  details?: {
    wmi: string
    vds: string
    vis: string
    region?: string
    possibleYears?: number[]
    checkDigit?: string
    checksumValid?: boolean
  }
}

/**
 * Validates a VIN according to ISO 3779 standard
 */
export function validateVin(vin: string | undefined | null): VinValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Handle empty/undefined VIN
  if (!vin || vin.trim() === '') {
    return {
      isValid: false,
      errors: ['VIN is required'],
      warnings: [],
    }
  }

  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')

  // Check length
  if (normalizedVin.length !== VIN_LENGTH) {
    errors.push(`VIN must be exactly ${VIN_LENGTH} characters (got ${normalizedVin.length})`)
  }

  // Check for invalid characters
  if (INVALID_VIN_CHARS.test(normalizedVin)) {
    errors.push('VIN contains invalid characters (I, O, Q are not allowed)')
  }

  // Check valid character pattern
  if (!VALID_VIN_PATTERN.test(normalizedVin)) {
    errors.push('VIN contains invalid characters (only A-Z except I,O,Q and 0-9 allowed)')
  }

  // If basic validation fails, return early
  if (errors.length > 0) {
    return { isValid: false, errors, warnings }
  }

  // Parse VIN components
  const wmi = normalizedVin.substring(0, 3)  // World Manufacturer Identifier
  const vds = normalizedVin.substring(3, 9)  // Vehicle Descriptor Section
  const vis = normalizedVin.substring(9, 17) // Vehicle Identifier Section
  const checkDigit = normalizedVin.charAt(8)
  const yearCode = normalizedVin.charAt(9)

  // Get region from first character
  const region = WMI_REGIONS[normalizedVin.charAt(0)]

  // Get possible model years
  const possibleYears = YEAR_CODES[yearCode] || []

  // Validate checksum (position 9, index 8)
  const checksumValid = isValidVinChecksum(normalizedVin)

  // North American vehicles require valid checksum
  if (['1', '2', '3', '4', '5'].includes(normalizedVin.charAt(0))) {
    if (!checksumValid) {
      errors.push('Invalid VIN checksum for North American vehicle')
    }
  } else {
    // For non-North American vehicles, checksum is often not used
    if (!checksumValid) {
      warnings.push('VIN checksum does not validate (may be valid for non-North American vehicles)')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    details: {
      wmi,
      vds,
      vis,
      region,
      possibleYears,
      checkDigit,
      checksumValid,
    },
  }
}

/**
 * Check if VIN format is valid (without checksum validation)
 */
export function isValidVinFormat(vin: string): boolean {
  if (!vin) {return false}
  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')
  return VALID_VIN_PATTERN.test(normalizedVin)
}

/**
 * Calculate the check digit for a VIN
 */
export function calculateVinCheckDigit(vin: string): string | null {
  if (!vin || vin.length !== VIN_LENGTH) {return null}

  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')

  let sum = 0
  for (let i = 0; i < VIN_LENGTH; i++) {
    if (i === 8) {continue} // Skip check digit position

    const char = normalizedVin.charAt(i)
    const value = TRANSLITERATION[char]

    if (value === undefined) {return null}

    sum += value * POSITION_WEIGHTS[i]
  }

  const remainder = sum % 11
  return remainder === 10 ? 'X' : remainder.toString()
}

/**
 * Validate VIN checksum
 */
export function isValidVinChecksum(vin: string): boolean {
  if (!vin || vin.length !== VIN_LENGTH) {return false}

  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')
  const expectedCheckDigit = calculateVinCheckDigit(normalizedVin)

  if (expectedCheckDigit === null) {return false}

  const actualCheckDigit = normalizedVin.charAt(8)
  return actualCheckDigit === expectedCheckDigit
}

/**
 * Decode the model year from VIN
 */
export function decodeVinYear(vin: string): number[] {
  if (!vin || vin.length < 10) {return []}

  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')
  const yearCode = normalizedVin.charAt(9)

  return YEAR_CODES[yearCode] || []
}

/**
 * Get the manufacturing region from VIN
 */
export function getVinRegion(vin: string): string | undefined {
  if (!vin || vin.length < 1) {return undefined}

  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')
  return WMI_REGIONS[normalizedVin.charAt(0)]
}

/**
 * Format VIN with standard grouping (for display)
 */
export function formatVin(vin: string): string {
  if (!vin) {return ''}

  const normalizedVin = vin.toUpperCase().replace(/[\s-]/g, '')

  if (normalizedVin.length !== VIN_LENGTH) {return normalizedVin}

  // Format as: WMI-VDS-VIS (3-6-8)
  return `${normalizedVin.substring(0, 3)}-${normalizedVin.substring(3, 9)}-${normalizedVin.substring(9)}`
}
