/**
 * Consolidated Validation Schemas
 *
 * This file contains all Zod validation schemas used across the application.
 * Schemas are organized by domain and shared between client and server.
 */

import { z } from 'zod'
import { VehicleCategory, ConsentType } from '@prisma/client'

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

/**
 * Registration schema (client-side with confirmPassword)
 */
export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the Terms of Service to register',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/**
 * Registration schema for API (without confirmPassword)
 */
export const registerApiSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service to register',
  }),
})

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * Reset password schema (API)
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

/**
 * Reset password form schema (client-side with confirmPassword)
 */
export const resetPasswordFormSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ============================================================================
// LISTING SCHEMAS
// ============================================================================

/**
 * Base listing fields shared between create and update
 */
const listingBaseFields = {
  title: z.string().min(10, 'Title must be at least 10 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(100, 'Description must be at least 100 characters').max(10000, 'Description must be less than 10,000 characters'),
  category: z.nativeEnum(VehicleCategory, { errorMap: () => ({ message: 'Invalid vehicle category' }) }),
  make: z.string().min(1, 'Make is required').max(50, 'Make must be less than 50 characters'),
  model: z.string().min(1, 'Model is required').max(50, 'Model must be less than 50 characters'),
  year: z.number().int().min(1900, 'Year must be 1900 or later').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  mileage: z.number().int().min(0, 'Mileage cannot be negative').optional(),
  mileageUnit: z.enum(['km', 'miles']).optional(),
  vin: z.string().max(20, 'VIN must be less than 20 characters').optional(),
  registrationCountry: z.string().max(50, 'Registration country must be less than 50 characters').optional(),
  conditionRating: z.number().int().min(1, 'Condition rating must be between 1 and 10').max(10, 'Condition rating must be between 1 and 10').optional(),
  conditionNotes: z.string().max(5000, 'Condition notes must be less than 5,000 characters').optional(),
  knownIssues: z.string().max(5000, 'Known issues must be less than 5,000 characters').optional(),
  isRunning: z.boolean(),
  locationCountry: z.string().min(2, 'Country is required').max(50, 'Country must be less than 50 characters'),
  locationCity: z.string().min(2, 'City is required').max(100, 'City must be less than 100 characters'),
  locationRegion: z.string().max(100, 'Region must be less than 100 characters').optional(),
  startingPrice: z.number().min(100, 'Starting price must be at least 100').max(10000000, 'Starting price must be less than 10,000,000'),
  reservePrice: z.number().min(100, 'Reserve price must be at least 100').max(10000000, 'Reserve price must be less than 10,000,000').optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'RON']).optional(),
}

/**
 * Create listing schema (all fields required)
 */
export const createListingSchema = z.object(listingBaseFields)

/**
 * Update listing schema (all fields optional)
 */
export const updateListingSchema = z.object({
  title: listingBaseFields.title.optional(),
  description: listingBaseFields.description.optional(),
  category: listingBaseFields.category.optional(),
  make: listingBaseFields.make.optional(),
  model: listingBaseFields.model.optional(),
  year: listingBaseFields.year.optional(),
  mileage: listingBaseFields.mileage,
  mileageUnit: listingBaseFields.mileageUnit,
  vin: listingBaseFields.vin,
  registrationCountry: listingBaseFields.registrationCountry,
  conditionRating: listingBaseFields.conditionRating,
  conditionNotes: listingBaseFields.conditionNotes,
  knownIssues: listingBaseFields.knownIssues,
  isRunning: listingBaseFields.isRunning.optional(),
  locationCountry: listingBaseFields.locationCountry.optional(),
  locationCity: listingBaseFields.locationCity.optional(),
  locationRegion: listingBaseFields.locationRegion,
  startingPrice: listingBaseFields.startingPrice.optional(),
  reservePrice: listingBaseFields.reservePrice,
  currency: listingBaseFields.currency,
})

/**
 * Listing form schema for client-side (with coercion for form inputs)
 */
export const listingFormSchema = z.object({
  // Vehicle Info
  category: z.string().min(1, 'Category is required'),
  make: z.string().min(1, 'Make is required').max(50),
  model: z.string().min(1, 'Model is required').max(50),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().int().min(0).optional(),
  mileageUnit: z.enum(['km', 'miles']).default('km'),
  vin: z.string().max(20).optional(),
  registrationCountry: z.string().max(50).optional(),

  // Condition
  conditionRating: z.coerce.number().int().min(1).max(10).optional(),
  conditionNotes: z.string().max(5000).optional(),
  knownIssues: z.string().max(5000).optional(),
  isRunning: z.boolean(),

  // Detailed Condition Grid (5 categories)
  conditionOverall: z.enum(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR']).optional(),
  conditionOverallNotes: z.string().max(1000).optional(),
  conditionPaintBody: z.enum(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR']).optional(),
  conditionPaintBodyNotes: z.string().max(1000).optional(),
  conditionInterior: z.enum(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR']).optional(),
  conditionInteriorNotes: z.string().max(1000).optional(),
  conditionFrame: z.enum(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR']).optional(),
  conditionFrameNotes: z.string().max(1000).optional(),
  conditionMechanical: z.enum(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR']).optional(),
  conditionMechanicalNotes: z.string().max(1000).optional(),

  // Location
  locationCountry: z.string().min(2, 'Country is required').max(50),
  locationCity: z.string().min(2, 'City is required').max(100),
  locationRegion: z.string().max(100).optional(),

  // Pricing
  startingPrice: z.coerce.number().min(100).max(10000000),
  reservePrice: z.coerce.number().min(100).max(10000000).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'RON']).default('EUR'),

  // Description
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(100, 'Description must be at least 100 characters').max(10000),
})

// ============================================================================
// AUCTION / BID SCHEMAS
// ============================================================================

/**
 * Place bid schema
 */
export const placeBidSchema = z.object({
  amount: z.number().positive('Bid amount must be positive'),
})

// ============================================================================
// PAYMENT / DEPOSIT SCHEMAS
// ============================================================================

/**
 * Create deposit schema
 */
export const createDepositSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  bidAmount: z.number().positive('Bid amount must be positive'),
})

/**
 * Confirm deposit schema
 */
export const confirmDepositSchema = z.object({
  depositId: z.string().min(1, 'Deposit ID is required'),
})

// ============================================================================
// WATCHLIST SCHEMAS
// ============================================================================

/**
 * Add to watchlist schema
 */
export const addToWatchlistSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
})

/**
 * Update watchlist preferences schema
 */
export const updateWatchlistSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  notifyOnBid: z.boolean().optional(),
  notifyOnEnd: z.boolean().optional(),
})

// ============================================================================
// CONSENT / GDPR SCHEMAS
// ============================================================================

/**
 * Consent recording schema
 */
export const consentSchema = z.object({
  consents: z.array(
    z.object({
      type: z.enum(['ESSENTIAL', 'ANALYTICS', 'MARKETING', 'DATA_PROCESSING']),
      granted: z.boolean(),
    })
  ),
})

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

/**
 * Update user schema (admin actions)
 */
export const updateUserSchema = z.object({
  action: z.enum(['suspend', 'unsuspend', 'verify', 'change_role', 'ban', 'unban']),
  role: z.enum(['USER', 'SELLER', 'MODERATOR', 'REVIEWER', 'ADMIN']).optional(),
  reason: z.string().optional(),
})

/**
 * Admin auction action schema
 */
export const auctionActionSchema = z.object({
  action: z.enum(['cancel', 'end', 'extend', 'invalidate_bid']),
  reason: z.string().optional(),
  bidId: z.string().optional(),
  extensionMinutes: z.number().optional(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterFormData = z.infer<typeof registerSchema>
export type RegisterApiData = z.infer<typeof registerApiSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>
export type ResetPasswordApiData = z.infer<typeof resetPasswordSchema>

export type CreateListingData = z.infer<typeof createListingSchema>
export type UpdateListingData = z.infer<typeof updateListingSchema>
export type ListingFormData = z.infer<typeof listingFormSchema>

export type PlaceBidData = z.infer<typeof placeBidSchema>

export type CreateDepositData = z.infer<typeof createDepositSchema>
export type ConfirmDepositData = z.infer<typeof confirmDepositSchema>

export type AddToWatchlistData = z.infer<typeof addToWatchlistSchema>
export type UpdateWatchlistData = z.infer<typeof updateWatchlistSchema>

export type ConsentData = z.infer<typeof consentSchema>

export type UpdateUserData = z.infer<typeof updateUserSchema>
export type AuctionActionData = z.infer<typeof auctionActionSchema>
