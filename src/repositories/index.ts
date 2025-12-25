// Repository Layer - Central export point for all repositories
// Provides abstraction layer between services and database access

import { prisma } from '@/lib/db'
import { AuctionRepository } from './auction.repository'
import { ListingRepository } from './listing.repository'
import { UserRepository } from './user.repository'
import { BidRepository } from './bid.repository'
import { FraudRepository } from './fraud.repository'

// Base repository
export { BaseRepository } from './base.repository'
export type { IRepository } from './base.repository'

// Re-export repository classes
export { AuctionRepository, ListingRepository, UserRepository, BidRepository, FraudRepository }

// Repository interfaces
export type { IAuctionRepository } from './auction.repository'
export type { IListingRepository } from './listing.repository'
export type { IUserRepository } from './user.repository'
export type { IBidRepository } from './bid.repository'
export type { IFraudRepository } from './fraud.repository'

// Type exports
export type {
  AuctionWithListing,
  AuctionWithBids,
  AuctionWithMedia,
} from './auction.repository'

export type {
  ListingWithMedia,
  ListingWithSeller,
  ListingWithDetails,
} from './listing.repository'

export type {
  UserWithBids,
  UserWithListings,
} from './user.repository'

export type {
  BidWithBidder,
  BidWithAuction,
} from './bid.repository'

export type { FraudAlertWithUser } from './fraud.repository'

// Singleton repository instances
// These can be imported directly by services for convenience
export const auctionRepository = new AuctionRepository(prisma)
export const listingRepository = new ListingRepository(prisma)
export const userRepository = new UserRepository(prisma)
export const bidRepository = new BidRepository(prisma)
export const fraudRepository = new FraudRepository(prisma)

/**
 * Repository factory for creating repository instances with custom Prisma client
 * Useful for testing with mocked Prisma client or transactions
 */
export function createRepositories(customPrisma = prisma) {
  return {
    auctionRepository: new AuctionRepository(customPrisma),
    listingRepository: new ListingRepository(customPrisma),
    userRepository: new UserRepository(customPrisma),
    bidRepository: new BidRepository(customPrisma),
    fraudRepository: new FraudRepository(customPrisma),
  }
}

/**
 * Get all repositories as an object
 * Convenient for dependency injection
 */
export function getRepositories() {
  return {
    auctionRepository,
    listingRepository,
    userRepository,
    bidRepository,
    fraudRepository,
  }
}
