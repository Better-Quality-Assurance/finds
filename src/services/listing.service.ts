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
