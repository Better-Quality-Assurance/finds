/**
 * Dependency Injection Container for Finds Auction Platform
 *
 * Simple container implementation that provides service instances throughout the application.
 * Supports both production and test environments with different implementations.
 */

import { PrismaClient, DepositStatus, Prisma } from '@prisma/client'
import { prisma } from './db'

// Service Interfaces
import type {
  INotificationService,
  IAuditService,
  IBidDepositService,
  IBuyerFeeService,
  ISellerPayoutService,
  IFraudService,
  IStorageService,
  IEmailService,
  IListingService,
  IAuctionService,
  IAIModerationService,
  ISMSProvider,
  IMediaReviewService,
  IMediaProcessingService,
} from '@/services/contracts'

// Real Service Implementations
import * as notificationService from '@/services/notification.service'
import * as auditService from '@/services/audit.service'
import * as paymentService from '@/services/payment.service'
import * as fraudService from '@/services/fraud.service'
import * as r2Service from './r2'
import * as emailService from './email'
import * as listingService from '@/services/listing.service'
import * as auctionService from '@/services/auction.service'
import * as aiModerationService from '@/services/ai-moderation.service'
import { initializePhoneVerificationService } from '@/services/phone-verification.service'
import { MediaReviewService } from '@/services/media/media-review.service'
import { MediaProcessingService } from '@/services/media/media-processing.service'

// SMS Provider Implementations
import { MockSMSProvider, TwilioSMSProvider } from '@/services/providers'

// Validators
import { RoleValidator } from '@/services/validators/role.validator'

/**
 * Service container type holding all service instances
 */
export type ServiceContainer = {
  notifications: INotificationService
  audit: IAuditService
  deposits: IBidDepositService
  fees: IBuyerFeeService
  payouts: ISellerPayoutService
  fraud: IFraudService
  storage: IStorageService
  email: IEmailService
  listings: IListingService
  auctions: IAuctionService
  aiModeration: IAIModerationService
  mediaReview: IMediaReviewService
  mediaProcessing: IMediaProcessingService
  sms: ISMSProvider
  roleValidator: RoleValidator
  prisma: PrismaClient
}

/**
 * Create notification service adapter
 */
function createNotificationService(): INotificationService {
  return {
    sendUserNotification: notificationService.sendUserNotification,
    broadcastPublic: notificationService.broadcastPublic,
    notifyListingApproved: notificationService.notifyListingApproved,
    notifyListingRejected: notificationService.notifyListingRejected,
    notifyListingChangesRequested: notificationService.notifyListingChangesRequested,
    broadcastAuctionLive: notificationService.broadcastAuctionLive,
    notifyAuctionEndingSoon: notificationService.notifyAuctionEndingSoon,
    notifyAuctionWon: notificationService.notifyAuctionWon,
    notifyAuctionLost: notificationService.notifyAuctionLost,
    notifyWatchersNewBid: notificationService.notifyWatchersNewBid,
    notifyWatchersAuctionEnded: notificationService.notifyWatchersAuctionEnded,
    notifyWatchersAuctionEndingSoon: notificationService.notifyWatchersAuctionEndingSoon,
  }
}

/**
 * Create audit service adapter
 */
function createAuditService(): IAuditService {
  return {
    logAuditEvent: auditService.logAuditEvent,
    getAuditLogs: auditService.getAuditLogs,
    getResourceAuditLogs: auditService.getResourceAuditLogs,
    getUserAuditLogs: auditService.getUserAuditLogs,
    getAuditStats: auditService.getAuditStats,
  }
}

/**
 * Create bid deposit service adapter
 */
function createBidDepositService(): IBidDepositService {
  return {
    checkBiddingEligibility: paymentService.checkBiddingEligibility,
    enableBidding: paymentService.enableBidding,
    setupBiddingPayment: paymentService.setupBiddingPayment,
    createBidDeposit: paymentService.createBidDeposit,
    confirmDeposit: paymentService.confirmDeposit,
    releaseBidDeposit: paymentService.releaseBidDeposit,
    captureBidDeposit: paymentService.captureBidDeposit,
    releaseNonWinningDeposits: paymentService.releaseNonWinningDeposits,
    getUserDeposits: paymentService.getUserDeposits,
    getAuctionDeposit: paymentService.getAuctionDeposit,
    hasValidDeposit: paymentService.hasValidDeposit,
  }
}

/**
 * Create buyer fee service adapter
 */
function createBuyerFeeService(): IBuyerFeeService {
  return {
    chargeBuyerFee: paymentService.chargeBuyerFee,
    confirmBuyerFeePayment: paymentService.confirmBuyerFeePayment,
    getAuctionPaymentStatus: paymentService.getAuctionPaymentStatus,
    setPaymentDeadline: paymentService.setPaymentDeadline,
    checkOverduePayments: paymentService.checkOverduePayments,
  }
}

/**
 * Create seller payout service adapter
 */
function createSellerPayoutService(): ISellerPayoutService {
  return {
    createSellerPayout: paymentService.createSellerPayout,
    getSellerPayoutStatus: paymentService.getSellerPayoutStatus,
    retrySellerPayout: paymentService.retrySellerPayout,
  }
}

/**
 * Create fraud detection service adapter
 */
function createFraudService(): IFraudService {
  return {
    runBidFraudChecks: fraudService.runBidFraudChecks,
    createFraudAlert: fraudService.createFraudAlert,
    getOpenAlerts: fraudService.getOpenAlerts,
    reviewFraudAlert: fraudService.reviewFraudAlert,
    getFraudStats: fraudService.getFraudStats,
    getUserFraudHistory: fraudService.getUserFraudHistory,
  }
}

/**
 * Create storage service adapter
 */
function createStorageService(): IStorageService {
  return {
    uploadToR2: r2Service.uploadToR2,
    deleteFromR2: r2Service.deleteFromR2,
    getSignedUploadUrl: r2Service.getSignedUploadUrl,
    getSignedDownloadUrl: r2Service.getSignedDownloadUrl,
    generateMediaKey: r2Service.generateMediaKey,
    generateThumbnailKey: r2Service.generateThumbnailKey,
  }
}

/**
 * Create email service adapter
 */
function createEmailService(): IEmailService {
  return {
    sendVerificationEmail: emailService.sendVerificationEmail,
    sendPasswordResetEmail: emailService.sendPasswordResetEmail,
  }
}

/**
 * Create listing service adapter
 */
function createListingService(): IListingService {
  return {
    createListing: listingService.createListing,
    updateListing: listingService.updateListing,
    addMedia: listingService.addMedia,
    updateMedia: listingService.updateMedia,
    removeMedia: listingService.removeMedia,
    submitForReview: listingService.submitForReview,
    getListingById: listingService.getListingById,
    getSellerListings: listingService.getSellerListings,
    getPendingListings: listingService.getPendingListings,
    approveListing: listingService.approveListing,
    rejectListing: listingService.rejectListing,
    requestChanges: listingService.requestChanges,
  }
}

/**
 * Create auction service adapter
 */
function createAuctionService(): IAuctionService {
  return {
    createAuction: auctionService.createAuction,
    getAuctionById: auctionService.getAuctionById,
    getAuctionByListingId: auctionService.getAuctionByListingId,
    getActiveAuctions: auctionService.getActiveAuctions,
    getEndingSoonAuctions: auctionService.getEndingSoonAuctions,
    placeBid: auctionService.placeBid,
    getBidHistory: auctionService.getBidHistory,
    getUserBids: auctionService.getUserBids,
    endAuction: auctionService.endAuction,
    cancelAuction: auctionService.cancelAuction,
    activateScheduledAuctions: auctionService.activateScheduledAuctions,
    endExpiredAuctions: auctionService.endExpiredAuctions,
  }
}

/**
 * Create AI moderation service adapter
 */
function createAIModerationService(): IAIModerationService {
  return {
    // Listing Analysis
    analyzeListing: aiModerationService.analyzeListing,
    getAnalysis: aiModerationService.getListingAnalysis,
    getPendingAnalyses: aiModerationService.getPendingListingAnalyses,
    retryFailedAnalysis: aiModerationService.analyzeListing,

    // Car Reviews
    generateReview: aiModerationService.generateCarReview,
    getReview: aiModerationService.getCarReview,
    getPublishedReview: aiModerationService.getPublishedCarReview,
    publishReview: aiModerationService.publishCarReview,
    unpublishReview: aiModerationService.unpublishCarReview,

    // Comment Moderation
    moderateComment: aiModerationService.moderateComment,
    getModeration: aiModerationService.getCommentModeration,
    getPendingModerations: aiModerationService.getPendingCommentModerations,
    overrideModeration: aiModerationService.overrideCommentModeration,

    // Bid Pattern Analysis
    analyzeAuctionBids: aiModerationService.analyzeAuctionBids,
    analyzeUserBids: aiModerationService.analyzeUserBids,
    getRecentAnalyses: aiModerationService.getRecentBidAnalyses,
    getSuspiciousPatterns: aiModerationService.getSuspiciousBidPatterns,

    // Dashboard
    getModerationStats: aiModerationService.getModerationStats,
    getRecentActivity: aiModerationService.getRecentModerationActivity,
  }
}

/**
 * Create SMS provider based on environment configuration
 * Uses Twilio if configured, falls back to mock provider for development
 */
function createSMSProvider(): ISMSProvider {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  // If Twilio credentials are configured, use Twilio provider
  if (accountSid && authToken && fromNumber) {
    console.log('[Container] Initializing Twilio SMS provider')
    return new TwilioSMSProvider({
      accountSid,
      authToken,
      fromNumber,
    })
  }

  // Otherwise use mock provider for development
  console.log('[Container] Initializing Mock SMS provider (Twilio not configured)')
  return new MockSMSProvider()
}

/**
 * Create production container with real service implementations
 */
export function createContainer(): ServiceContainer {
  // Create SMS provider first
  const smsProvider = createSMSProvider()

  // Initialize phone verification service with the provider
  initializePhoneVerificationService(smsProvider)

  // Create audit service first as it's needed by media review service
  const audit = createAuditService()

  // Create storage service
  const storage = createStorageService()

  // Create media review service with dependencies
  const mediaReview = new MediaReviewService(prisma, audit)

  // Create media processing service with dependencies
  const mediaProcessing = new MediaProcessingService(prisma, storage)

  return {
    notifications: createNotificationService(),
    audit,
    deposits: createBidDepositService(),
    fees: createBuyerFeeService(),
    payouts: createSellerPayoutService(),
    fraud: createFraudService(),
    storage,
    email: createEmailService(),
    listings: createListingService(),
    auctions: createAuctionService(),
    aiModeration: createAIModerationService(),
    mediaReview,
    mediaProcessing,
    sms: smsProvider,
    roleValidator: new RoleValidator(),
    prisma,
  }
}

/**
 * Create test container with mock implementations
 */
export function createTestContainer(): ServiceContainer {
  // Create mock SMS provider for tests
  const mockSmsProvider = new MockSMSProvider()

  // Initialize phone verification service with mock provider
  initializePhoneVerificationService(mockSmsProvider)

  return {
    notifications: {
      sendUserNotification: async () => {},
      broadcastPublic: async () => {},
      notifyListingApproved: async () => {},
      notifyListingRejected: async () => {},
      notifyListingChangesRequested: async () => {},
      broadcastAuctionLive: async () => {},
      notifyAuctionEndingSoon: async () => {},
      notifyAuctionWon: async () => {},
      notifyAuctionLost: async () => {},
      notifyWatchersNewBid: async () => {},
      notifyWatchersAuctionEnded: async () => {},
      notifyWatchersAuctionEndingSoon: async () => {},
    },
    audit: {
      logAuditEvent: async (params) => ({
        id: 'mock-audit-id',
        actorId: params.actorId || null,
        actorEmail: params.actorEmail || null,
        actorIp: params.actorIp || null,
        actorUserAgent: params.actorUserAgent || null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        details: params.details as object || {},
        changes: params.changes as object || null,
        severity: params.severity || null,
        status: params.status || 'SUCCESS',
        errorMessage: params.errorMessage || null,
        sessionId: params.sessionId || null,
        requestId: params.requestId || null,
        functionName: params.functionName || null,
        createdAt: new Date(),
      }),
      getAuditLogs: async () => ({ logs: [], total: 0 }),
      getResourceAuditLogs: async () => [],
      getUserAuditLogs: async () => [],
      getAuditStats: async () => ({
        totalToday: 0,
        failedToday: 0,
        highSeverityToday: 0,
        topActions: [],
      }),
    },
    deposits: {
      checkBiddingEligibility: async () => ({
        eligible: true,
        hasPaymentMethod: true,
        stripeCustomerId: 'mock-customer-id',
      }),
      enableBidding: async (userId: string) => ({
        id: userId,
        biddingEnabled: true,
      }),
      setupBiddingPayment: async () => ({
        customerId: 'mock-customer-id',
        clientSecret: 'mock-client-secret',
      }),
      createBidDeposit: async () => ({
        success: true,
        deposit: {
          id: 'mock-deposit-id',
          userId: 'mock-user-id',
          auctionId: 'mock-auction-id',
          amount: new Prisma.Decimal(100),
          currency: 'EUR',
          status: DepositStatus.HELD,
          stripePaymentIntentId: 'mock-pi-id',
          stripePaymentMethodId: 'mock-pm-id',
          heldAt: new Date(),
          releasedAt: null,
          capturedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
      confirmDeposit: async () => ({ success: true }),
      releaseBidDeposit: async () => true,
      captureBidDeposit: async () => true,
      releaseNonWinningDeposits: async () => 0,
      getUserDeposits: async () => [],
      getAuctionDeposit: async () => null,
      hasValidDeposit: async () => true,
    },
    fees: {
      chargeBuyerFee: async () => ({ success: true }),
      confirmBuyerFeePayment: async () => ({ success: true }),
      getAuctionPaymentStatus: async () => ({
        status: 'UNPAID',
        paidAt: null,
        paymentDeadline: null,
        totalAmount: null,
        breakdown: { finalPrice: null, buyerFee: null },
      }),
      setPaymentDeadline: async (auctionId: string) => ({
        id: auctionId,
        listingId: 'mock-listing-id',
        startingPrice: 1000,
        currentBid: 1000,
        currency: 'EUR',
        startTime: new Date(),
        currentEndTime: new Date(),
        status: 'ACTIVE',
        paymentDeadline: new Date(),
      } as any),
      checkOverduePayments: async () => [],
    },
    payouts: {
      createSellerPayout: async () => ({ success: true }),
      getSellerPayoutStatus: async () => ({
        status: null,
        payoutId: null,
        amount: null,
        paidAt: null,
      }),
      retrySellerPayout: async () => ({ success: true }),
    },
    fraud: {
      runBidFraudChecks: async () => ({ passed: true, alerts: [] }),
      createFraudAlert: async (params) => ({
        id: 'mock-alert-id',
        userId: params.userId || null,
        auctionId: params.auctionId || null,
        bidId: params.bidId || null,
        alertType: params.alertType,
        severity: params.severity,
        details: params.details as object,
        status: 'OPEN',
        reviewedById: null,
        reviewedAt: null,
        resolutionNotes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getOpenAlerts: async () => ({ alerts: [], total: 0 }),
      reviewFraudAlert: async (alertId, reviewerId, status, notes) => ({
        id: alertId,
        userId: null,
        auctionId: null,
        bidId: null,
        alertType: 'MOCK_ALERT',
        severity: 'LOW',
        details: {},
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        resolutionNotes: notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getFraudStats: async () => ({
        openAlerts: 0,
        criticalAlerts: 0,
        alertsToday: 0,
        alertsByType: {},
      }),
      getUserFraudHistory: async () => ({
        totalAlerts: 0,
        criticalAlerts: 0,
        recentAlerts: [],
        isSuspicious: false,
      }),
    },
    storage: {
      uploadToR2: async (file, key) => ({
        key,
        url: `https://example.com/${key}`,
        size: file.length,
      }),
      deleteFromR2: async () => {},
      getSignedUploadUrl: async (key) => `https://example.com/upload/${key}`,
      getSignedDownloadUrl: async (key) => `https://example.com/download/${key}`,
      generateMediaKey: (listingId, type, filename) =>
        `listings/${listingId}/${type}s/${filename}`,
      generateThumbnailKey: (originalKey) => originalKey.replace('/photos/', '/thumbnails/'),
    },
    email: {
      sendVerificationEmail: async () => ({ success: true as const, data: {} }),
      sendPasswordResetEmail: async () => ({ success: true as const, data: {} }),
    },
    listings: {
      createListing: async (input) => ({
        id: 'mock-listing-id',
        sellerId: input.sellerId,
        title: input.title,
        description: input.description,
        category: input.category,
        make: input.make,
        model: input.model,
        year: input.year,
        mileage: input.mileage || null,
        mileageUnit: input.mileageUnit || null,
        vin: input.vin || null,
        registrationCountry: input.registrationCountry || null,
        conditionRating: input.conditionRating || null,
        conditionNotes: input.conditionNotes || null,
        knownIssues: input.knownIssues || null,
        isRunning: input.isRunning,
        locationCountry: input.locationCountry,
        locationCity: input.locationCity,
        locationRegion: input.locationRegion || null,
        startingPrice: input.startingPrice,
        reservePrice: input.reservePrice ? new Prisma.Decimal(input.reservePrice) : null,
        currency: input.currency || 'EUR',
        status: 'DRAFT',
        reviewedById: null,
        reviewedAt: null,
        rejectionReason: null,
        changesRequested: null,
        submittedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
      updateListing: async (id, sellerId, input) => ({
        id,
        sellerId,
        ...input,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
      addMedia: async (input) => ({
        id: 'mock-media-id',
        listingId: input.listingId,
        type: input.type,
        storagePath: `listings/${input.listingId}/${input.filename}`,
        publicUrl: `https://example.com/${input.filename}`,
        thumbnailUrl: null,
        position: input.position,
        isPrimary: input.isPrimary || false,
        category: input.category || null,
        caption: input.caption || null,
        fileSize: input.file.length,
        mimeType: input.mimeType,
        width: null,
        height: null,
        originalUrl: null,
        licensePlateDetected: false,
        licensePlateBlurred: false,
        plateDetectionData: null,
        needsManualReview: false,
        createdAt: new Date(),
      }),
      updateMedia: async (mediaId, sellerId, updates) => ({
        id: mediaId,
        ...updates,
        createdAt: new Date(),
      } as any),
      removeMedia: async () => {},
      submitForReview: async (listingId) => ({
        id: listingId,
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        updatedAt: new Date(),
      } as any),
      getListingById: async (id) => ({
        id,
        media: [],
        seller: { id: 'mock-seller-id', name: 'Mock Seller' },
      } as any),
      getSellerListings: async () => [],
      getPendingListings: async () => [],
      approveListing: async (listingId) => ({
        id: listingId,
        status: 'APPROVED',
        reviewedAt: new Date(),
        updatedAt: new Date(),
      } as any),
      rejectListing: async (listingId) => ({
        id: listingId,
        status: 'REJECTED',
        reviewedAt: new Date(),
        updatedAt: new Date(),
      } as any),
      requestChanges: async (listingId) => ({
        id: listingId,
        status: 'CHANGES_REQUESTED',
        reviewedAt: new Date(),
        updatedAt: new Date(),
      } as any),
    },
    auctions: {
      createAuction: async (listingId, startTime, durationDays) => ({
        id: 'mock-auction-id',
        listingId,
        startingPrice: 1000,
        currentBid: null,
        currency: 'EUR',
        startTime,
        originalEndTime: new Date(startTime.getTime() + (durationDays || 7) * 24 * 60 * 60 * 1000),
        currentEndTime: new Date(startTime.getTime() + (durationDays || 7) * 24 * 60 * 60 * 1000),
        antiSnipingEnabled: true,
        antiSnipingWindowMinutes: 2,
        antiSnipingExtensionMinutes: 2,
        extensionCount: 0,
        maxExtensions: 10,
        status: 'SCHEDULED',
        winnerId: null,
        finalPrice: null,
        buyerFeeAmount: null,
        reserveMet: false,
        paymentStatus: null,
        paymentIntentId: null,
        paidAt: null,
        paymentDeadline: null,
        sellerPayoutStatus: null,
        sellerPayoutId: null,
        sellerPayoutAmount: null,
        sellerPaidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
      getAuctionById: async (auctionId) => ({
        id: auctionId,
        listing: {} as any,
        bids: [],
      } as any),
      getAuctionByListingId: async () => null,
      getActiveAuctions: async (options) => ({
        auctions: [],
        pagination: {
          page: options.page || 1,
          limit: options.limit || 10,
          total: 0,
          totalPages: 0,
        },
      }),
      getEndingSoonAuctions: async () => [],
      placeBid: async (auctionId, bidderId, amount) => ({
        bid: {
          id: 'mock-bid-id',
          auctionId,
          bidderId,
          amount: new Prisma.Decimal(amount),
          isWinning: true,
          isValid: true,
          invalidatedReason: null,
          triggeredExtension: false,
          depositHoldId: null,
          currency: 'EUR',
          createdAt: new Date(),
          ipAddress: null,
          userAgent: null,
        },
        auction: {
          id: auctionId,
          currentBid: new Prisma.Decimal(amount),
        } as any,
        extended: false,
      } as any),
      getBidHistory: async () => [],
      getUserBids: async (userId, options) => ({
        bids: [],
        pagination: {
          page: options?.page || 1,
          limit: options?.limit || 20,
          total: 0,
          totalPages: 0,
        },
      }),
      endAuction: async (auctionId) => ({
        id: auctionId,
        status: 'ENDED',
        updatedAt: new Date(),
      } as any),
      cancelAuction: async (auctionId) => ({
        id: auctionId,
        status: 'CANCELLED',
        updatedAt: new Date(),
      } as any),
      activateScheduledAuctions: async () => 0,
      endExpiredAuctions: async () => 0,
    },
    aiModeration: {
      // Listing Analysis
      analyzeListing: async (listingId) => ({
        id: 'mock-analysis-id',
        listingId,
        status: 'COMPLETED',
        decision: 'APPROVE',
        confidenceScore: 0.95,
        approvalReasoning: 'Mock analysis - listing appears valid',
        titleAnalysis: {},
        descriptionAnalysis: {},
        imageAnalysis: {},
        issues: [],
        suggestions: [],
        modelUsed: 'mock-model',
        tokensUsed: 100,
        processingTimeMs: 500,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
      getAnalysis: async () => null,
      getPendingAnalyses: async () => [],
      retryFailedAnalysis: async (listingId) => ({
        id: 'mock-analysis-id',
        listingId,
        status: 'COMPLETED',
        decision: 'APPROVE',
        confidenceScore: 0.95,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),

      // Car Reviews
      generateReview: async (listingId) => ({
        id: 'mock-review-id',
        listingId,
        status: 'COMPLETED',
        overallScore: 80,
        conditionSummary: 'Mock review summary',
        highlights: ['Good condition'],
        concerns: [],
        estimatedValueLow: 20000,
        estimatedValueMid: 25000,
        estimatedValueHigh: 30000,
        valuationReasoning: 'Mock valuation',
        marketComparisons: [],
        isPublished: false,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
      getReview: async () => null,
      getPublishedReview: async () => null,
      publishReview: async (listingId) => ({
        id: 'mock-review-id',
        listingId,
        isPublished: true,
        publishedAt: new Date(),
      } as any),
      unpublishReview: async (listingId) => ({
        id: 'mock-review-id',
        listingId,
        isPublished: false,
      } as any),

      // Comment Moderation
      moderateComment: async (commentId) => ({
        id: 'mock-moderation-id',
        commentId,
        status: 'APPROVED',
        decision: 'APPROVE',
        confidenceScore: 0.98,
        isSpam: false,
        spamScore: 0.02,
        isInappropriate: false,
        toxicityScore: 0.01,
        isOffTopic: false,
        flaggedCategories: [],
        reasoning: 'Comment appears valid',
        autoActioned: true,
        actionTaken: 'approved',
        actionedAt: new Date(),
        createdAt: new Date(),
      } as any),
      getModeration: async () => null,
      getPendingModerations: async () => [],
      overrideModeration: async (commentId, decision) => ({
        id: 'mock-moderation-id',
        commentId,
        decision,
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        createdAt: new Date(),
      } as any),

      // Bid Pattern Analysis
      analyzeAuctionBids: async (auctionId) => ({
        id: 'mock-bid-analysis-id',
        auctionId,
        analysisWindowStart: new Date(),
        analysisWindowEnd: new Date(),
        isSuspicious: false,
        suspicionScore: 0.1,
        patternType: null,
        patterns: [],
        anomalies: [],
        bidsAnalyzed: 10,
        avgTimeBetweenBids: 120,
        bidVelocityScore: 0.2,
        recommendedAction: 'none',
        reasoning: 'No suspicious patterns detected',
        createdAt: new Date(),
      } as any),
      analyzeUserBids: async (userId) => ({
        id: 'mock-user-analysis-id',
        userId,
        auctionId: 'user-analysis',
        isSuspicious: false,
        suspicionScore: 0.05,
        createdAt: new Date(),
      } as any),
      getRecentAnalyses: async () => [],
      getSuspiciousPatterns: async () => [],

      // Dashboard
      getModerationStats: async () => ({
        listingsAnalyzed: 0,
        listingsPendingReview: 0,
        commentsModerated: 0,
        commentsAutoActioned: 0,
        suspiciousBidPatterns: 0,
        carReviewsGenerated: 0,
        avgConfidenceScore: 0,
      }),
      getRecentActivity: async () => [],
    },
    mediaReview: {
      getMediaNeedingReview: async (page, limit) => ({
        media: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }),
      approveMedia: async () => {},
      rejectMedia: async () => {},
      markAsBlurred: async () => {},
      getMediaReviewStats: async () => ({
        totalNeedingReview: 0,
        withLicensePlates: 0,
        listingsAffected: 0,
        topListingsByCount: [],
      }),
      getMediaNeedsReviewCount: async () => 0,
    },
    mediaProcessing: {
      processUploadedMedia: async () => {},
    },
    sms: mockSmsProvider,
    roleValidator: new RoleValidator(),
    prisma,
  }
}

// Singleton container instance
let globalContainer: ServiceContainer | undefined

/**
 * Get the global singleton container instance
 * Creates a new container if one doesn't exist
 */
export function getContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = createContainer()
  }
  return globalContainer
}

/**
 * Reset the global container (useful for testing)
 */
export function resetContainer(): void {
  globalContainer = undefined
}

/**
 * Set a custom container instance (useful for testing)
 */
export function setContainer(container: ServiceContainer): void {
  globalContainer = container
}
