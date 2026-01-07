import { prisma } from '@/lib/db'
import { uploadToR2, deleteFromR2, generateMediaKey } from '@/lib/r2'
import { LISTING_RULES, validatePhotos } from '@/domain/listing/rules'
import { listingStatusValidator } from '@/services/validators/listing-status.validator'
import type {
  Listing,
  ListingMedia,
  ListingStatus,
  VehicleCategory,
  MediaType,
} from '@prisma/client'

// Types
export type CreateListingInput = {
  sellerId: string
  title: string
  description: string
  category: VehicleCategory
  make: string
  model: string
  year: number
  mileage?: number
  mileageUnit?: string
  vin?: string
  registrationCountry?: string
  conditionRating?: number
  conditionNotes?: string
  knownIssues?: string
  isRunning: boolean
  locationCountry: string
  locationCity: string
  locationRegion?: string
  startingPrice: number
  reservePrice?: number
  currency?: string
}

export type UpdateListingInput = Partial<CreateListingInput>

export type AddMediaInput = {
  listingId: string
  type: MediaType
  file: Buffer
  filename: string
  mimeType: string
  category?: string
  caption?: string
  position: number
  isPrimary?: boolean
}

// Service functions
export async function createListing(
  input: CreateListingInput
): Promise<Listing> {
  return prisma.listing.create({
    data: {
      sellerId: input.sellerId,
      title: input.title,
      description: input.description,
      category: input.category,
      make: input.make,
      model: input.model,
      year: input.year,
      mileage: input.mileage,
      mileageUnit: input.mileageUnit || 'km',
      vin: input.vin,
      registrationCountry: input.registrationCountry,
      conditionRating: input.conditionRating,
      conditionNotes: input.conditionNotes,
      knownIssues: input.knownIssues,
      isRunning: input.isRunning,
      locationCountry: input.locationCountry,
      locationCity: input.locationCity,
      locationRegion: input.locationRegion,
      startingPrice: input.startingPrice,
      reservePrice: input.reservePrice,
      currency: input.currency || 'EUR',
      status: 'DRAFT',
    },
  })
}

export async function updateListing(
  id: string,
  sellerId: string,
  input: UpdateListingInput
): Promise<Listing> {
  // Verify ownership
  const listing = await prisma.listing.findUnique({
    where: { id },
  })

  if (!listing || listing.sellerId !== sellerId) {
    throw new Error('Listing not found or unauthorized')
  }

  if (!listingStatusValidator.isEditable(listing.status)) {
    throw new Error('Cannot edit listing in current status')
  }

  return prisma.listing.update({
    where: { id },
    data: input,
  })
}

export async function addMedia(input: AddMediaInput): Promise<ListingMedia> {
  // Verify listing exists and is editable
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { media: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (!listingStatusValidator.isEditable(listing.status)) {
    throw new Error('Cannot add media to listing in current status')
  }

  // Check limits
  const existingMedia = listing.media.filter((m) => m.type === input.type)
  const maxCount =
    input.type === 'PHOTO' ? LISTING_RULES.MAX_PHOTOS : LISTING_RULES.MAX_VIDEOS
  if (existingMedia.length >= maxCount) {
    throw new Error(`Maximum ${maxCount} ${input.type.toLowerCase()}s allowed`)
  }

  // Upload to R2
  const key = generateMediaKey(
    input.listingId,
    input.type.toLowerCase() as 'photo' | 'video',
    input.filename
  )

  const uploadResult = await uploadToR2(input.file, key, input.mimeType)

  // Create media record
  return prisma.listingMedia.create({
    data: {
      listingId: input.listingId,
      type: input.type,
      storagePath: uploadResult.key,
      publicUrl: uploadResult.url,
      position: input.position,
      isPrimary: input.isPrimary || false,
      category: input.category,
      caption: input.caption,
      fileSize: uploadResult.size,
      mimeType: input.mimeType,
    },
  })
}

export async function updateMedia(
  mediaId: string,
  sellerId: string,
  updates: {
    category?: string
    position?: number
    isPrimary?: boolean
    caption?: string
  }
): Promise<ListingMedia> {
  // Fetch media with listing
  const media = await prisma.listingMedia.findUnique({
    where: { id: mediaId },
    include: { listing: true },
  })

  if (!media || media.listing.sellerId !== sellerId) {
    throw new Error('Media not found or unauthorized')
  }

  if (!listingStatusValidator.isEditable(media.listing.status)) {
    throw new Error('Cannot update media for listing in current status')
  }

  // If setting isPrimary to true, ensure no other media is primary
  if (updates.isPrimary === true) {
    const existingPrimary = await prisma.listingMedia.findFirst({
      where: {
        listingId: media.listingId,
        isPrimary: true,
        id: { not: mediaId },
      },
    })

    if (existingPrimary) {
      // Unset existing primary
      await prisma.listingMedia.update({
        where: { id: existingPrimary.id },
        data: { isPrimary: false },
      })
    }
  }

  // Update the media
  return prisma.listingMedia.update({
    where: { id: mediaId },
    data: updates,
  })
}

export async function removeMedia(
  mediaId: string,
  sellerId: string
): Promise<void> {
  const media = await prisma.listingMedia.findUnique({
    where: { id: mediaId },
    include: { listing: true },
  })

  if (!media || media.listing.sellerId !== sellerId) {
    throw new Error('Media not found or unauthorized')
  }

  if (!listingStatusValidator.isEditable(media.listing.status)) {
    throw new Error('Cannot remove media from listing in current status')
  }

  // Delete from R2
  await deleteFromR2(media.storagePath)

  // Delete record
  await prisma.listingMedia.delete({
    where: { id: mediaId },
  })
}

export async function submitForReview(
  listingId: string,
  sellerId: string
): Promise<Listing> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { media: true },
  })

  if (!listing || listing.sellerId !== sellerId) {
    throw new Error('Listing not found or unauthorized')
  }

  if (!listingStatusValidator.canSubmitForReview(listing.status)) {
    throw new Error('Listing cannot be submitted in current status')
  }

  // Validate photos
  const photos = listing.media
    .filter((m) => m.type === 'PHOTO')
    .map((m) => ({ category: m.category || 'other' }))

  const validation = validatePhotos(photos)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  // Update status
  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
    },
  })
}

export async function getListingById(id: string): Promise<
  | (Listing & {
      media: ListingMedia[]
      seller: { id: string; name: string | null }
    })
  | null
> {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      media: {
        orderBy: { position: 'asc' },
      },
      seller: {
        select: { id: true, name: true },
      },
    },
  })
}

export async function getSellerListings(
  sellerId: string,
  status?: ListingStatus
): Promise<Listing[]> {
  return prisma.listing.findMany({
    where: {
      sellerId,
      ...(status && { status }),
    },
    include: {
      media: {
        where: { isPrimary: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// Admin functions
export async function getPendingListings(): Promise<Listing[]> {
  return prisma.listing.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: {
      media: {
        where: { isPrimary: true },
        take: 1,
      },
      seller: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { submittedAt: 'asc' },
  })
}

export async function approveListing(
  listingId: string,
  reviewerId: string
): Promise<Listing> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (!listingStatusValidator.canApprove(listing.status)) {
    throw new Error('Listing is not pending review')
  }

  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'APPROVED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      approvedAt: new Date(),
    },
  })
}

export async function rejectListing(
  listingId: string,
  reviewerId: string,
  reason: string
): Promise<Listing> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (!listingStatusValidator.canReject(listing.status)) {
    throw new Error('Listing is not pending review')
  }

  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'REJECTED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  })
}

export async function requestChanges(
  listingId: string,
  reviewerId: string,
  changes: string[]
): Promise<Listing> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  if (!listingStatusValidator.canRequestChanges(listing.status)) {
    throw new Error('Listing is not pending review')
  }

  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'CHANGES_REQUESTED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      changeRequests: changes,
    },
  })
}

// ============================================================================
// ADMIN EDIT FUNCTIONS
// ============================================================================

// Statuses that require admin override
const RESTRICTED_EDIT_STATUSES: ListingStatus[] = [
  'APPROVED',
  'ACTIVE',
  'SOLD',
  'WITHDRAWN',
  'EXPIRED',
]

// Allowed external image domains for security (SSRF prevention)
const ALLOWED_IMAGE_DOMAINS = [
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'picsum.photos',
  'fastly.picsum.photos',
  'images.unsplash.com',
  'source.unsplash.com',
  'placehold.co',
  'pub-', // R2 public bucket prefix
]

// Blocked URL patterns (internal networks, localhost, etc.)
const BLOCKED_URL_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\[::1\]/,
  /^https?:\/\/\[fc/i,
  /^https?:\/\/\[fd/i,
  /^file:/i,
  /^ftp:/i,
]

export type AdminUpdateListingOptions = {
  adminOverride?: boolean
  adminRole: 'ADMIN' | 'MODERATOR'
}

export type AdminUpdateListingResult = {
  listing: Listing & {
    seller: { id: string; name: string | null; email: string | null }
    media: ListingMedia[]
  }
  wasRestricted: boolean
  hadActiveBids: boolean
}

/**
 * Validate external URL for security (SSRF prevention)
 */
export function validateExternalUrl(url: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(url)

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'URL must use HTTPS protocol' }
    }

    // Check against blocked patterns
    for (const pattern of BLOCKED_URL_PATTERNS) {
      if (pattern.test(url)) {
        return { valid: false, reason: 'URL points to blocked network range' }
      }
    }

    // Check against allowed domains
    const hostname = parsed.hostname.toLowerCase()
    const isAllowed = ALLOWED_IMAGE_DOMAINS.some((domain) => {
      if (domain.endsWith('-')) {
        return hostname.startsWith(domain)
      }
      return hostname === domain || hostname.endsWith('.' + domain)
    })

    if (!isAllowed) {
      return {
        valid: false,
        reason: `Domain '${hostname}' is not in the allowed list`,
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'Invalid URL format' }
  }
}

/**
 * Admin update listing with status validation and override support
 */
export async function adminUpdateListing(
  listingId: string,
  adminId: string,
  input: UpdateListingInput,
  options: AdminUpdateListingOptions
): Promise<AdminUpdateListingResult> {
  // Fetch listing with auction info
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      auction: {
        select: { id: true, status: true, bidCount: true },
      },
    },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  // Check status restrictions
  const isRestrictedStatus = RESTRICTED_EDIT_STATUSES.includes(listing.status)
  const hasActiveBids =
    listing.auction?.status === 'ACTIVE' && (listing.auction?.bidCount ?? 0) > 0
  const isActiveAuction = listing.auction?.status === 'ACTIVE'

  // Require override for restricted statuses
  if (isRestrictedStatus && !options.adminOverride) {
    throw new Error(
      `Cannot edit listing in ${listing.status} status without admin override`
    )
  }

  // Extra protection: Listings with active bids require ADMIN role
  if (hasActiveBids && isActiveAuction) {
    if (options.adminRole !== 'ADMIN') {
      throw new Error('Only ADMIN can edit listings with active bids')
    }
    if (!options.adminOverride) {
      throw new Error('Editing a listing with active bids requires explicit admin override')
    }
  }

  // Validate reserve price >= starting price
  const finalStartingPrice = input.startingPrice ?? Number(listing.startingPrice)
  const finalReservePrice =
    input.reservePrice ?? (listing.reservePrice ? Number(listing.reservePrice) : null)

  if (finalReservePrice !== null && finalReservePrice < finalStartingPrice) {
    throw new Error('Reserve price must be greater than or equal to starting price')
  }

  // Update listing
  const updatedListing = await prisma.listing.update({
    where: { id: listingId },
    data: input,
    include: {
      seller: {
        select: { id: true, name: true, email: true },
      },
      media: {
        orderBy: { position: 'asc' },
      },
    },
  })

  return {
    listing: updatedListing,
    wasRestricted: isRestrictedStatus,
    hadActiveBids: hasActiveBids,
  }
}

/**
 * Get listing for admin with full details
 */
export async function adminGetListing(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: { id: true, name: true, email: true },
      },
      media: {
        orderBy: { position: 'asc' },
      },
      auction: {
        select: { id: true, status: true, bidCount: true },
      },
    },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  return listing
}

/**
 * Admin add media by external URL
 */
export async function adminAddMediaByUrl(
  listingId: string,
  url: string,
  options?: { category?: string; isPrimary?: boolean }
): Promise<ListingMedia> {
  // Validate URL for security
  const urlValidation = validateExternalUrl(url)
  if (!urlValidation.valid) {
    throw new Error(urlValidation.reason || 'Invalid URL')
  }

  // Check listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true },
  })

  if (!listing) {
    throw new Error('Listing not found')
  }

  // Get current max position
  const maxPositionMedia = await prisma.listingMedia.findFirst({
    where: { listingId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  const nextPosition = (maxPositionMedia?.position ?? -1) + 1

  // If setting as primary, unset other primary images
  if (options?.isPrimary) {
    await prisma.listingMedia.updateMany({
      where: { listingId, isPrimary: true },
      data: { isPrimary: false },
    })
  }

  // Create media record
  return prisma.listingMedia.create({
    data: {
      listingId,
      type: 'PHOTO',
      publicUrl: url,
      thumbnailUrl: url,
      storagePath: `external/${listingId}/${nextPosition}.jpg`,
      position: nextPosition,
      isPrimary: options?.isPrimary ?? nextPosition === 0,
      category: options?.category,
    },
  })
}

/**
 * Admin update media (position, primary, category)
 */
export async function adminUpdateMedia(
  mediaId: string,
  listingId: string,
  updates: { position?: number; isPrimary?: boolean; category?: string }
): Promise<ListingMedia> {
  // Check media exists and belongs to listing
  const existingMedia = await prisma.listingMedia.findFirst({
    where: { id: mediaId, listingId },
  })

  if (!existingMedia) {
    throw new Error('Media not found')
  }

  // If setting as primary, unset other primary images
  if (updates.isPrimary) {
    await prisma.listingMedia.updateMany({
      where: { listingId, isPrimary: true, id: { not: mediaId } },
      data: { isPrimary: false },
    })
  }

  return prisma.listingMedia.update({
    where: { id: mediaId },
    data: updates,
  })
}

/**
 * Admin delete media with position reordering
 */
export async function adminDeleteMedia(
  mediaId: string,
  listingId: string
): Promise<{ deletedPosition: number; mediaUrl: string }> {
  // Check media exists and belongs to listing
  const existingMedia = await prisma.listingMedia.findFirst({
    where: { id: mediaId, listingId },
  })

  if (!existingMedia) {
    throw new Error('Media not found')
  }

  const deletedPosition = existingMedia.position
  const wasPrimary = existingMedia.isPrimary
  const mediaUrl = existingMedia.publicUrl

  // Delete media record
  await prisma.listingMedia.delete({
    where: { id: mediaId },
  })

  // Reorder remaining media positions to close the gap
  await prisma.listingMedia.updateMany({
    where: {
      listingId,
      position: { gt: deletedPosition },
    },
    data: {
      position: { decrement: 1 },
    },
  })

  // If deleted media was primary, set next image as primary
  if (wasPrimary) {
    const nextMedia = await prisma.listingMedia.findFirst({
      where: { listingId },
      orderBy: { position: 'asc' },
    })
    if (nextMedia) {
      await prisma.listingMedia.update({
        where: { id: nextMedia.id },
        data: { isPrimary: true },
      })
    }
  }

  return { deletedPosition, mediaUrl }
}
