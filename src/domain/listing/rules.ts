// Listing business rules

export const LISTING_RULES = {
  // Photo requirements
  MIN_PHOTOS: 40,
  MAX_PHOTOS: 100,
  MAX_PHOTO_SIZE_MB: 10,
  ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],

  // Video requirements
  MAX_VIDEOS: 5,
  MAX_VIDEO_SIZE_MB: 500,
  MAX_VIDEO_DURATION_SECONDS: 300, // 5 minutes
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],

  // Required photo categories
  REQUIRED_PHOTO_CATEGORIES: [
    'exterior_front',
    'exterior_rear',
    'exterior_left',
    'exterior_right',
    'interior_dashboard',
    'interior_front_seats',
    'interior_rear_seats',
    'engine_bay',
    'trunk',
    'wheels',
    'vin_plate',
  ] as const,

  // All photo categories
  PHOTO_CATEGORIES: [
    'exterior_front',
    'exterior_rear',
    'exterior_left',
    'exterior_right',
    'exterior_detail',
    'interior_dashboard',
    'interior_front_seats',
    'interior_rear_seats',
    'interior_detail',
    'engine_bay',
    'engine_detail',
    'underbody',
    'trunk',
    'wheels',
    'vin_plate',
    'documentation',
    'defects',
    'other',
  ] as const,

  // Title constraints
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 100,

  // Description constraints
  MIN_DESCRIPTION_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 10000,

  // Price constraints
  MIN_STARTING_PRICE: 100, // EUR
  MAX_STARTING_PRICE: 10000000, // EUR

  // Year constraints
  MIN_YEAR: 1900,
  MAX_YEAR: new Date().getFullYear() + 1,
} as const

export type PhotoCategory = (typeof LISTING_RULES.PHOTO_CATEGORIES)[number]
export type RequiredPhotoCategory =
  (typeof LISTING_RULES.REQUIRED_PHOTO_CATEGORIES)[number]

export function validatePhotos(photos: { category: string }[]): {
  isValid: boolean
  missingCategories: string[]
  error?: string
} {
  if (photos.length < LISTING_RULES.MIN_PHOTOS) {
    return {
      isValid: false,
      missingCategories: [],
      error: `Minimum ${LISTING_RULES.MIN_PHOTOS} photos required. You have ${photos.length}.`,
    }
  }

  const providedCategories = new Set(photos.map((p) => p.category))
  const missingCategories = LISTING_RULES.REQUIRED_PHOTO_CATEGORIES.filter(
    (cat) => !providedCategories.has(cat)
  )

  if (missingCategories.length > 0) {
    return {
      isValid: false,
      missingCategories,
      error: `Missing required photo categories: ${missingCategories.join(', ')}`,
    }
  }

  return { isValid: true, missingCategories: [] }
}

export function validateFileType(
  mimeType: string,
  type: 'photo' | 'video'
): boolean {
  if (type === 'photo') {
    return (LISTING_RULES.ALLOWED_PHOTO_TYPES as readonly string[]).includes(mimeType)
  }
  return (LISTING_RULES.ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)
}

export function validateFileSize(
  sizeBytes: number,
  type: 'photo' | 'video'
): boolean {
  const maxSizeMB =
    type === 'photo'
      ? LISTING_RULES.MAX_PHOTO_SIZE_MB
      : LISTING_RULES.MAX_VIDEO_SIZE_MB
  return sizeBytes <= maxSizeMB * 1024 * 1024
}

export function generateListingTitle(
  year: number,
  make: string,
  model: string
): string {
  return `${year} ${make} ${model}`
}
