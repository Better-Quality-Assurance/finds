import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Helper Functions
 *
 * Provides domain-specific error capturing with rich context
 * for better debugging and monitoring of critical operations.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaymentContext {
  userId: string
  amount: number
  currency: string
  paymentIntentId?: string
  paymentMethodId?: string
  stripeAccountId?: string
  listingId?: string
  auctionId?: string
  type: 'deposit' | 'fee' | 'payout' | 'refund' | 'setup'
  metadata?: Record<string, any>
}

export interface AuctionContext {
  auctionId: string
  listingId?: string
  sellerId?: string
  currentBid?: number
  bidCount?: number
  status?: string
  endTime?: Date | string
  operation: 'create' | 'bid' | 'end' | 'cancel' | 'activate'
  metadata?: Record<string, any>
}

export interface ListingContext {
  listingId: string
  sellerId: string
  title?: string
  status?: string
  operation: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'media_upload'
  metadata?: Record<string, any>
}

export interface AuthContext {
  userId?: string
  email?: string
  operation: 'login' | 'register' | 'verify' | 'reset_password' | 'forgot_password'
  metadata?: Record<string, any>
}

export interface AdminContext {
  adminId: string
  adminRole: string
  targetUserId?: string
  targetAuctionId?: string
  targetListingId?: string
  operation: string
  metadata?: Record<string, any>
}

export interface FraudContext {
  userId?: string
  auctionId?: string
  listingId?: string
  fraudType: string
  riskScore?: number
  indicators?: string[]
  metadata?: Record<string, any>
}

// ============================================================================
// User Context Management
// ============================================================================

/**
 * Sets user context for all subsequent Sentry events
 * Should be called after successful authentication
 */
export function setUserContext(user: {
  id: string
  email: string
  name?: string | null
  role?: string
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name || undefined,
    role: user.role,
  })
}

/**
 * Clears user context (e.g., on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

// ============================================================================
// Payment Error Capture
// ============================================================================

/**
 * Captures payment-related errors with rich context
 * Critical for tracking Stripe integration issues
 */
export function capturePaymentError(error: Error, context: PaymentContext) {
  Sentry.withScope(scope => {
    // Add payment context
    scope.setContext('payment', {
      type: context.type,
      amount: context.amount,
      currency: context.currency,
      paymentIntentId: context.paymentIntentId,
      paymentMethodId: context.paymentMethodId,
      stripeAccountId: context.stripeAccountId,
      listingId: context.listingId,
      auctionId: context.auctionId,
      ...context.metadata,
    })

    // Set tags for filtering
    scope.setTag('payment_type', context.type)
    scope.setTag('currency', context.currency)
    scope.setLevel('error')

    // Add user context if available
    if (context.userId) {
      scope.setUser({ id: context.userId })
    }

    // Capture with fingerprint for grouping
    scope.setFingerprint([
      'payment-error',
      context.type,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Auction Error Capture
// ============================================================================

/**
 * Captures auction-related errors
 * Important for tracking bid processing and auction lifecycle issues
 */
export function captureAuctionError(error: Error, context: AuctionContext) {
  Sentry.withScope(scope => {
    // Add auction context
    scope.setContext('auction', {
      auctionId: context.auctionId,
      listingId: context.listingId,
      sellerId: context.sellerId,
      currentBid: context.currentBid,
      bidCount: context.bidCount,
      status: context.status,
      endTime: context.endTime,
      operation: context.operation,
      ...context.metadata,
    })

    // Set tags
    scope.setTag('auction_operation', context.operation)
    scope.setTag('auction_status', context.status || 'unknown')
    scope.setLevel('error')

    // Add seller context if available
    if (context.sellerId) {
      scope.setTag('seller_id', context.sellerId)
    }

    // Fingerprint for grouping
    scope.setFingerprint([
      'auction-error',
      context.operation,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Listing Error Capture
// ============================================================================

/**
 * Captures listing-related errors
 */
export function captureListingError(error: Error, context: ListingContext) {
  Sentry.withScope(scope => {
    scope.setContext('listing', {
      listingId: context.listingId,
      sellerId: context.sellerId,
      title: context.title,
      status: context.status,
      operation: context.operation,
      ...context.metadata,
    })

    scope.setTag('listing_operation', context.operation)
    scope.setTag('listing_status', context.status || 'unknown')
    scope.setLevel('error')

    scope.setFingerprint([
      'listing-error',
      context.operation,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Authentication Error Capture
// ============================================================================

/**
 * Captures authentication errors
 * Helps track login failures, registration issues, etc.
 */
export function captureAuthError(error: Error, context: AuthContext) {
  Sentry.withScope(scope => {
    scope.setContext('auth', {
      email: context.email,
      operation: context.operation,
      ...context.metadata,
    })

    scope.setTag('auth_operation', context.operation)
    scope.setLevel('warning') // Auth failures are expected, not critical

    // Add user context if available
    if (context.userId) {
      scope.setUser({ id: context.userId, email: context.email })
    }

    scope.setFingerprint([
      'auth-error',
      context.operation,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Admin Operation Error Capture
// ============================================================================

/**
 * Captures admin operation errors
 * Critical for tracking moderation and fraud detection issues
 */
export function captureAdminError(error: Error, context: AdminContext) {
  Sentry.withScope(scope => {
    scope.setContext('admin', {
      adminId: context.adminId,
      adminRole: context.adminRole,
      targetUserId: context.targetUserId,
      targetAuctionId: context.targetAuctionId,
      targetListingId: context.targetListingId,
      operation: context.operation,
      ...context.metadata,
    })

    scope.setTag('admin_operation', context.operation)
    scope.setTag('admin_role', context.adminRole)
    scope.setLevel('error')

    scope.setUser({ id: context.adminId, role: context.adminRole })

    scope.setFingerprint([
      'admin-error',
      context.operation,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Fraud Detection Error Capture
// ============================================================================

/**
 * Captures fraud detection errors and alerts
 * High severity - requires immediate attention
 */
export function captureFraudAlert(error: Error, context: FraudContext) {
  Sentry.withScope(scope => {
    scope.setContext('fraud', {
      userId: context.userId,
      auctionId: context.auctionId,
      listingId: context.listingId,
      fraudType: context.fraudType,
      riskScore: context.riskScore,
      indicators: context.indicators,
      ...context.metadata,
    })

    scope.setTag('fraud_type', context.fraudType)
    scope.setTag('risk_score', context.riskScore?.toString() || 'unknown')
    scope.setLevel('fatal') // Fraud is high priority

    if (context.userId) {
      scope.setUser({ id: context.userId })
    }

    scope.setFingerprint([
      'fraud-alert',
      context.fraudType,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Database Error Capture
// ============================================================================

/**
 * Captures database errors with query context
 */
export function captureDatabaseError(
  error: Error,
  context: {
    operation: string
    model?: string
    query?: string
    metadata?: Record<string, any>
  }
) {
  Sentry.withScope(scope => {
    scope.setContext('database', {
      operation: context.operation,
      model: context.model,
      query: context.query,
      ...context.metadata,
    })

    scope.setTag('db_operation', context.operation)
    if (context.model) {
      scope.setTag('db_model', context.model)
    }
    scope.setLevel('error')

    scope.setFingerprint([
      'database-error',
      context.operation,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// API Error Capture
// ============================================================================

/**
 * Captures API route errors with request context
 */
export function captureAPIError(
  error: Error,
  context: {
    route: string
    method: string
    statusCode?: number
    userId?: string
    metadata?: Record<string, any>
  }
) {
  Sentry.withScope(scope => {
    scope.setContext('api', {
      route: context.route,
      method: context.method,
      statusCode: context.statusCode,
      ...context.metadata,
    })

    scope.setTag('api_route', context.route)
    scope.setTag('http_method', context.method)
    if (context.statusCode) {
      scope.setTag('status_code', context.statusCode.toString())
    }

    if (context.userId) {
      scope.setUser({ id: context.userId })
    }

    scope.setLevel(context.statusCode && context.statusCode >= 500 ? 'error' : 'warning')

    scope.setFingerprint([
      'api-error',
      context.route,
      context.method,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Cron Job Error Capture
// ============================================================================

/**
 * Captures cron job errors
 * Important for monitoring scheduled tasks
 */
export function captureCronError(
  error: Error,
  context: {
    jobName: string
    startTime: Date
    metadata?: Record<string, any>
  }
) {
  Sentry.withScope(scope => {
    scope.setContext('cron', {
      jobName: context.jobName,
      startTime: context.startTime,
      duration: Date.now() - context.startTime.getTime(),
      ...context.metadata,
    })

    scope.setTag('cron_job', context.jobName)
    scope.setLevel('error')

    scope.setFingerprint([
      'cron-error',
      context.jobName,
      error.message,
    ])

    Sentry.captureException(error)
  })
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Tracks performance of critical operations
 */
export function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return Sentry.startSpan(
    {
      name: operation,
      op: 'function',
      attributes: metadata,
    },
    async () => {
      return await fn()
    }
  )
}

// ============================================================================
// Message Capture (Non-Error Events)
// ============================================================================

/**
 * Captures informational messages (e.g., successful fraud prevention)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.withScope(scope => {
    if (context) {
      scope.setContext('custom', context)
    }
    scope.setLevel(level)
    Sentry.captureMessage(message)
  })
}
