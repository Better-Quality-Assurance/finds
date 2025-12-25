import type {
  Listing,
  ListingMedia,
  ListingStatus,
  VehicleCategory,
  MediaType,
} from '@prisma/client'

/**
 * Input for creating a listing
 */
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

/**
 * Input for updating a listing
 */
export type UpdateListingInput = Partial<CreateListingInput>

/**
 * Input for adding media to a listing
 */
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

/**
 * Updates for listing media
 */
export type UpdateMediaInput = {
  category?: string
  position?: number
  isPrimary?: boolean
  caption?: string
}

/**
 * Listing with relations
 */
export type ListingWithRelations = Listing & {
  media: ListingMedia[]
  seller: { id: string; name: string | null }
}

/**
 * Interface for listing service
 * Handles listing creation, updates, media management, and approval workflow
 */
export interface IListingService {
  /**
   * Create a new listing
   */
  createListing(input: CreateListingInput): Promise<Listing>

  /**
   * Update an existing listing
   */
  updateListing(id: string, sellerId: string, input: UpdateListingInput): Promise<Listing>

  /**
   * Add media to a listing
   */
  addMedia(input: AddMediaInput): Promise<ListingMedia>

  /**
   * Update listing media
   */
  updateMedia(mediaId: string, sellerId: string, updates: UpdateMediaInput): Promise<ListingMedia>

  /**
   * Remove media from a listing
   */
  removeMedia(mediaId: string, sellerId: string): Promise<void>

  /**
   * Submit listing for review
   */
  submitForReview(listingId: string, sellerId: string): Promise<Listing>

  /**
   * Get listing by ID with relations
   */
  getListingById(id: string): Promise<ListingWithRelations | null>

  /**
   * Get seller's listings
   */
  getSellerListings(sellerId: string, status?: ListingStatus): Promise<Listing[]>

  /**
   * Get listings pending review (admin)
   */
  getPendingListings(): Promise<Listing[]>

  /**
   * Approve a listing (admin)
   */
  approveListing(listingId: string, reviewerId: string): Promise<Listing>

  /**
   * Reject a listing (admin)
   */
  rejectListing(listingId: string, reviewerId: string, reason: string): Promise<Listing>

  /**
   * Request changes to a listing (admin)
   */
  requestChanges(listingId: string, reviewerId: string, changes: string[]): Promise<Listing>
}
