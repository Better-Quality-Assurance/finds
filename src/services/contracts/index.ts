/**
 * Service Contracts
 *
 * This module exports TypeScript interfaces for all services in the Finds auction platform.
 * These interfaces enable proper dependency injection, testability, and loose coupling.
 *
 * Usage:
 * - Import interfaces when declaring dependencies
 * - Use for mocking in tests
 * - Implement these interfaces in service classes for DI containers
 */

// Notification Service
export type {
  INotificationService,
} from './notification.interface'

// Audit Service
export type {
  IAuditService,
  AuditEventParams,
  GetAuditLogsOptions,
  AuditStats,
} from './audit.interface'

// Payment Services
export type {
  IBidDepositService,
  IBuyerFeeService,
  ISellerPayoutService,
  DepositResult,
  PaymentResult,
  PayoutResult,
  BiddingEligibility,
  SetupIntent,
  PaymentStatusDetails,
  SellerPayoutStatus,
} from './payment.interface'

// Fraud Service
export type {
  IFraudService,
  FraudCheckResult,
  FraudAlertItem,
  BidFraudCheckParams,
  CreateFraudAlertParams,
  GetOpenAlertsOptions,
  FraudStats,
  UserFraudHistory,
} from './fraud.interface'

// Storage Service
export type {
  IStorageService,
  UploadResult,
} from './storage.interface'

// Email Service
export type {
  IEmailService,
  EmailResult,
} from './email.interface'

// Listing Service
export type {
  IListingService,
  CreateListingInput,
  UpdateListingInput,
  AddMediaInput,
  UpdateMediaInput,
  ListingWithRelations,
} from './listing.interface'

// Auction Service
export type {
  IAuctionService,
  AuctionWithRelations,
  GetActiveAuctionsOptions,
  PaginatedAuctions,
  PlaceBidResult,
  BidMetadata,
  UserBidsResult,
} from './auction.interface'

// Mock Activity Service (Demo/Development)
export type {
  IMockBidGenerator,
  IMockCommentGenerator,
  IMockActivityOrchestrator,
  MockBidConfig,
  MockCommentConfig,
  MockActivityConfig,
  MockBidResult,
  MockCommentResult,
  MockActivitySummary,
} from './mock-activity.interface'

export {
  DEFAULT_MOCK_ACTIVITY_CONFIG,
  DEMO_MOCK_ACTIVITY_CONFIG,
} from './mock-activity.interface'

// AI Moderation Service
export type {
  IAIModerationService,
  IAIListingAnalysisService,
  IAICarReviewService,
  IAICommentModerationService,
  IAIBidPatternService,
  ListingAnalysisResult,
  CarReviewResult,
  CommentModerationResult,
  BidPatternResult,
  ModerationStats,
  ModerationActivity,
  AIModerationConfig,
  AnalysisIssue,
  ValueEstimate,
  DetectedPattern,
} from './ai-moderation.interface'

export {
  DEFAULT_AI_MODERATION_CONFIG,
} from './ai-moderation.interface'

// AI Provider Interface
export type {
  IAIProvider,
  ChatMessage,
  ContentPart,
  AICompletionOptions,
  AICompletionResult,
  AIProviderConfig,
} from './ai-provider.interface'

export {
  DEFAULT_AI_PROVIDER_CONFIG,
} from './ai-provider.interface'

/**
 * Re-export common Prisma types for convenience
 */
export type {
  AuditLog,
  AuditSeverity,
  AuditStatus,
  FraudAlert,
  AlertSeverity,
  BidDeposit,
  DepositStatus,
  PaymentStatus,
  Listing,
  ListingMedia,
  ListingStatus,
  VehicleCategory,
  MediaType,
  Auction,
  AuctionStatus,
  Bid,
  AIListingAnalysis,
  AICarReview,
  AICommentModeration,
  AIBidPatternAnalysis,
  AIAnalysisStatus,
  ModerationDecision,
  CommentModerationStatus,
} from '@prisma/client'
