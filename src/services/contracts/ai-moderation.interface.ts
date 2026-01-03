/**
 * AI Moderation Service Contracts
 *
 * Interfaces for AI-powered content moderation, car analysis,
 * and bid pattern detection services.
 */

import type {
  AIListingAnalysis,
  AICarReview,
  AICommentModeration,
  AIBidPatternAnalysis,
  ModerationDecision,
  AIAnalysisStatus,
  CommentModerationStatus,
} from '@prisma/client'

// ============================================================================
// LISTING ANALYSIS
// ============================================================================

export interface ListingAnalysisResult {
  decision: ModerationDecision
  confidenceScore: number
  approvalReasoning: string
  issues: AnalysisIssue[]
  suggestions: string[]
  titleAnalysis: TitleAnalysis
  descriptionAnalysis: DescriptionAnalysis
  imageAnalysis: ImageAnalysis
}

export interface AnalysisIssue {
  type: 'content' | 'images' | 'pricing' | 'documentation' | 'authenticity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  field?: string
}

export interface TitleAnalysis {
  isSpam: boolean
  isDescriptive: boolean
  hasKeywords: boolean
  suggestedTitle?: string
  issues: string[]
}

export interface DescriptionAnalysis {
  completeness: number // 0-100
  hasRedFlags: boolean
  redFlags: string[]
  missingInfo: string[]
  qualityScore: number // 0-100
}

export interface ImageAnalysis {
  totalImages: number
  hasRequiredCategories: boolean
  missingCategories: string[]
  qualityIssues: ImageQualityIssue[]
  authenticityScore: number // 0-100
  potentialManipulation: boolean
}

export interface ImageQualityIssue {
  imageIndex: number
  issue: string
  severity: 'low' | 'medium' | 'high'
}

// ============================================================================
// CAR REVIEW (USER-FACING)
// ============================================================================

export interface CarReviewResult {
  overallScore: number // 1-100
  conditionSummary: string
  highlights: string[]
  concerns: string[]
  estimatedValue: ValueEstimate
  exteriorAnalysis: ExteriorAnalysis
  interiorAnalysis: InteriorAnalysis
  mechanicalNotes: MechanicalNotes
  authenticityCheck: AuthenticityCheck
  investmentOutlook: 'strong' | 'moderate' | 'speculative'
  appreciationPotential: string
}

export interface ValueEstimate {
  low: number
  mid: number
  high: number
  currency: string
  reasoning: string
  comparisons: MarketComparison[]
}

export interface MarketComparison {
  source: string
  make: string
  model: string
  year: number
  price: number
  condition: string
  notes?: string
}

export interface ExteriorAnalysis {
  paintCondition: string
  bodyCondition: string
  chromeCondition: string
  glassCondition: string
  issues: string[]
  score: number // 0-100
}

export interface InteriorAnalysis {
  seatCondition: string
  dashboardCondition: string
  carpetCondition: string
  headlinerCondition: string
  issues: string[]
  score: number // 0-100
}

export interface MechanicalNotes {
  engineVisible: boolean
  engineObservations: string[]
  compartmentCleanliness: string
  visibleIssues: string[]
}

export interface AuthenticityCheck {
  matchingNumbers: boolean | null
  periodCorrectParts: boolean | null
  modifications: string[]
  restorationEvidence: boolean
  notes: string
}

// ============================================================================
// COMMENT MODERATION
// ============================================================================

export interface CommentModerationResult {
  decision: ModerationDecision
  confidenceScore: number
  isSpam: boolean
  spamScore: number
  isInappropriate: boolean
  toxicityScore: number
  isOffTopic: boolean
  flaggedCategories: CommentCategory[]
  reasoning: string
  autoAction?: 'approve' | 'hide' | 'delete'
}

export type CommentCategory =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'profanity'
  | 'scam'
  | 'personal_info'
  | 'off_topic'
  | 'low_quality'

// ============================================================================
// BID PATTERN ANALYSIS
// ============================================================================

export interface BidPatternResult {
  isSuspicious: boolean
  suspicionScore: number
  patternType?: BidPatternType
  patterns: DetectedPattern[]
  anomalies: BidAnomaly[]
  bidMetrics: BidMetrics
  userPatterns?: UserBidPattern
  ipPatterns?: IPPattern
  recommendedAction: 'none' | 'monitor' | 'warn' | 'block'
  reasoning: string
}

export type BidPatternType =
  | 'shill_bidding'
  | 'bot_activity'
  | 'coordinated_bidding'
  | 'rapid_fire'
  | 'last_second_sniping'
  | 'price_manipulation'

export interface DetectedPattern {
  type: BidPatternType
  confidence: number
  evidence: string[]
  involvedBidIds: string[]
}

export interface BidAnomaly {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
  timestamp: Date
}

export interface BidMetrics {
  bidsAnalyzed: number
  avgTimeBetweenBids: number
  bidVelocityScore: number
  priceJumpPatterns: number
  lastMinuteBids: number
}

export interface UserBidPattern {
  userId: string
  totalBidsInPeriod: number
  auctionsParticipated: number
  winRate: number
  avgBidIncrement: number
  suspiciousIndicators: string[]
}

export interface IPPattern {
  uniqueIPs: number
  sharedIPUsers: string[]
  geolocationAnomalies: string[]
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IAIListingAnalysisService {
  analyzeListing(listingId: string): Promise<AIListingAnalysis>
  getAnalysis(listingId: string): Promise<AIListingAnalysis | null>
  getPendingAnalyses(limit?: number): Promise<AIListingAnalysis[]>
  retryFailedAnalysis(listingId: string): Promise<AIListingAnalysis>
}

export interface IAICarReviewService {
  generateReview(listingId: string): Promise<AICarReview>
  getReview(listingId: string): Promise<AICarReview | null>
  getPublishedReview(listingId: string): Promise<AICarReview | null>
  publishReview(listingId: string): Promise<AICarReview>
  unpublishReview(listingId: string): Promise<AICarReview>
}

export interface IAICommentModerationService {
  moderateComment(commentId: string): Promise<AICommentModeration>
  getModeration(commentId: string): Promise<AICommentModeration | null>
  getPendingModerations(limit?: number): Promise<AICommentModeration[]>
  overrideModeration(
    commentId: string,
    decision: ModerationDecision,
    reviewerId: string
  ): Promise<AICommentModeration>
}

export interface IAIBidPatternService {
  analyzeAuctionBids(
    auctionId: string,
    windowMinutes?: number
  ): Promise<AIBidPatternAnalysis>
  analyzeUserBids(
    userId: string,
    windowMinutes?: number
  ): Promise<AIBidPatternAnalysis>
  getRecentAnalyses(
    auctionId: string,
    limit?: number
  ): Promise<AIBidPatternAnalysis[]>
  getSuspiciousPatterns(limit?: number): Promise<AIBidPatternAnalysis[]>
}

export interface IAIModerationService
  extends IAIListingAnalysisService,
    IAICarReviewService,
    IAICommentModerationService,
    IAIBidPatternService {
  // Unified moderation dashboard methods
  getModerationStats(): Promise<ModerationStats>
  getRecentActivity(limit?: number): Promise<ModerationActivity[]>
}

export interface ModerationStats {
  listingsAnalyzed: number
  listingsPendingReview: number
  commentsModerated: number
  commentsAutoActioned: number
  suspiciousBidPatterns: number
  carReviewsGenerated: number
  avgConfidenceScore: number
}

export interface ModerationActivity {
  id: string
  type: 'listing' | 'comment' | 'bid_pattern' | 'car_review'
  resourceId: string
  decision?: ModerationDecision
  status: AIAnalysisStatus | CommentModerationStatus
  confidenceScore?: number
  createdAt: Date
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AIModerationConfig {
  // Auto-moderation thresholds
  commentAutoApproveThreshold: number // e.g., 0.95 confidence
  commentAutoRejectThreshold: number // e.g., 0.90 spam score
  listingFlagThreshold: number // e.g., 0.70 for flagging

  // Bid analysis
  bidAnalysisWindowMinutes: number
  suspicionScoreThreshold: number

  // Model preferences
  defaultModel: string
  visionModel: string

  // Rate limiting
  maxRequestsPerMinute: number
}

export const DEFAULT_AI_MODERATION_CONFIG: AIModerationConfig = {
  commentAutoApproveThreshold: 0.95,
  commentAutoRejectThreshold: 0.90,
  listingFlagThreshold: 0.70,
  bidAnalysisWindowMinutes: 60,
  suspicionScoreThreshold: 0.75,
  defaultModel: '@preset/finds',
  visionModel: 'openai/gpt-4o',
  maxRequestsPerMinute: 50,
}
