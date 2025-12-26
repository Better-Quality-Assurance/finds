// Central export point for all type definitions
// Import types from this file throughout the application

// Auction types
export type {
  AuctionWithListing,
  AuctionWithBids,
  AuctionMedia,
  AuctionWithMedia,
  AuctionFilters,
  BidUpdateData,
  SoldAuctionData,
} from './auction'

export type { AuctionStatus } from './auction'

// Media types
export type {
  UploadedPhoto,
  UploadingPhoto,
  UploadedVideo,
  UploadingVideo,
  ListingMedia,
} from './media'

// Admin types
export type {
  UserRole,
  UserData,
  AdminListing,
  ListingStatusFilter,
  AdminAuctionData,
  AdminAuctionStatus,
  FraudSeverity,
  FraudAlertStatus,
  FraudAlert,
  FraudStats,
  AuditSeverity,
  AuditLogStatus,
  AuditLogEntry,
  AuditStats,
  DashboardStats,
} from './admin'
