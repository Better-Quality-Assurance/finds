/**
 * Error Codes for the Finds Auction Platform
 *
 * Organized by category for easy reference and maintenance.
 * Each error code follows the pattern: CATEGORY_SPECIFIC_ERROR
 */

// Authentication & Authorization (AUTH_*)
export const ERROR_CODES = {
  // Authentication errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',

  // Authorization errors (403)
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_PHONE_NOT_VERIFIED: 'AUTH_PHONE_NOT_VERIFIED',
  AUTH_ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  AUTH_BIDDING_DISABLED: 'AUTH_BIDDING_DISABLED',

  // Validation errors (400)
  VALIDATION_INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_AMOUNT: 'VALIDATION_INVALID_AMOUNT',

  // Resource errors (404)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  AUCTION_NOT_FOUND: 'AUCTION_NOT_FOUND',
  LISTING_NOT_FOUND: 'LISTING_NOT_FOUND',
  BID_NOT_FOUND: 'BID_NOT_FOUND',

  // Auction business logic errors (400)
  AUCTION_NOT_ACTIVE: 'AUCTION_NOT_ACTIVE',
  AUCTION_ENDED: 'AUCTION_ENDED',
  AUCTION_NOT_STARTED: 'AUCTION_NOT_STARTED',
  AUCTION_CLOSED: 'AUCTION_CLOSED',
  AUCTION_ALREADY_ACTIVE: 'AUCTION_ALREADY_ACTIVE',

  // Bidding errors (400)
  BID_TOO_LOW: 'BID_TOO_LOW',
  BID_OWN_AUCTION: 'BID_OWN_AUCTION',
  BID_ALREADY_WINNING: 'BID_ALREADY_WINNING',
  BID_INVALID_INCREMENT: 'BID_INVALID_INCREMENT',

  // Payment errors (402)
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_INSUFFICIENT_FUNDS: 'PAYMENT_INSUFFICIENT_FUNDS',
  PAYMENT_CARD_DECLINED: 'PAYMENT_CARD_DECLINED',
  PAYMENT_AUTHENTICATION_REQUIRED: 'PAYMENT_AUTHENTICATION_REQUIRED',
  PAYMENT_METHOD_NOT_FOUND: 'PAYMENT_METHOD_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',

  // Deposit errors (402)
  DEPOSIT_REQUIRED: 'DEPOSIT_REQUIRED',
  DEPOSIT_INSUFFICIENT: 'DEPOSIT_INSUFFICIENT',
  DEPOSIT_FAILED: 'DEPOSIT_FAILED',
  DEPOSIT_ALREADY_HELD: 'DEPOSIT_ALREADY_HELD',

  // Fraud & Security errors (403)
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  FRAUD_SUSPICIOUS_ACTIVITY: 'FRAUD_SUSPICIOUS_ACTIVITY',
  FRAUD_RATE_LIMIT_EXCEEDED: 'FRAUD_RATE_LIMIT_EXCEEDED',
  FRAUD_MULTIPLE_ACCOUNTS: 'FRAUD_MULTIPLE_ACCOUNTS',
  FRAUD_BLOCKED_IP: 'FRAUD_BLOCKED_IP',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_TOO_MANY_REQUESTS: 'RATE_LIMIT_TOO_MANY_REQUESTS',

  // Stripe Connect errors (400/402)
  STRIPE_CONNECT_NOT_SETUP: 'STRIPE_CONNECT_NOT_SETUP',
  STRIPE_CONNECT_INCOMPLETE: 'STRIPE_CONNECT_INCOMPLETE',
  STRIPE_CONNECT_DISABLED: 'STRIPE_CONNECT_DISABLED',

  // Listing errors (400)
  LISTING_ALREADY_SUBMITTED: 'LISTING_ALREADY_SUBMITTED',
  LISTING_ALREADY_APPROVED: 'LISTING_ALREADY_APPROVED',
  LISTING_REJECTED: 'LISTING_REJECTED',
  LISTING_INCOMPLETE: 'LISTING_INCOMPLETE',

  // User errors (400/409)
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_EMAIL_IN_USE: 'USER_EMAIL_IN_USE',
  USER_INVALID_CREDENTIALS: 'USER_INVALID_CREDENTIALS',

  // System errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// Human-readable error messages for each code
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication
  [ERROR_CODES.AUTH_REQUIRED]: 'Authentication is required to access this resource',
  [ERROR_CODES.AUTH_INVALID_TOKEN]: 'Invalid authentication token',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Authentication token has expired',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please sign in again',

  // Authorization
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED]: 'Please verify your email address before continuing',
  [ERROR_CODES.AUTH_PHONE_NOT_VERIFIED]: 'Phone verification is required to place bids',
  [ERROR_CODES.AUTH_ACCOUNT_SUSPENDED]: 'Your account has been suspended',
  [ERROR_CODES.AUTH_BIDDING_DISABLED]: 'Bidding is not enabled for your account. Please add a payment method',

  // Validation
  [ERROR_CODES.VALIDATION_INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.VALIDATION_MISSING_FIELD]: 'Required field is missing',
  [ERROR_CODES.VALIDATION_INVALID_FORMAT]: 'Input format is invalid',
  [ERROR_CODES.VALIDATION_INVALID_AMOUNT]: 'Invalid amount specified',

  // Resources
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.AUCTION_NOT_FOUND]: 'Auction not found',
  [ERROR_CODES.LISTING_NOT_FOUND]: 'Listing not found',
  [ERROR_CODES.BID_NOT_FOUND]: 'Bid not found',

  // Auctions
  [ERROR_CODES.AUCTION_NOT_ACTIVE]: 'This auction is not currently active',
  [ERROR_CODES.AUCTION_ENDED]: 'This auction has ended',
  [ERROR_CODES.AUCTION_NOT_STARTED]: 'This auction has not started yet',
  [ERROR_CODES.AUCTION_CLOSED]: 'This auction is closed',
  [ERROR_CODES.AUCTION_ALREADY_ACTIVE]: 'This auction is already active',

  // Bidding
  [ERROR_CODES.BID_TOO_LOW]: 'Bid amount is too low',
  [ERROR_CODES.BID_OWN_AUCTION]: 'You cannot bid on your own auction',
  [ERROR_CODES.BID_ALREADY_WINNING]: 'You are already the highest bidder',
  [ERROR_CODES.BID_INVALID_INCREMENT]: 'Bid increment is invalid',

  // Payments
  [ERROR_CODES.PAYMENT_REQUIRED]: 'Payment is required to complete this action',
  [ERROR_CODES.PAYMENT_FAILED]: 'Payment processing failed',
  [ERROR_CODES.PAYMENT_INSUFFICIENT_FUNDS]: 'Insufficient funds',
  [ERROR_CODES.PAYMENT_CARD_DECLINED]: 'Your card was declined',
  [ERROR_CODES.PAYMENT_AUTHENTICATION_REQUIRED]: 'Additional authentication is required',
  [ERROR_CODES.PAYMENT_METHOD_NOT_FOUND]: 'No payment method found',
  [ERROR_CODES.PAYMENT_ALREADY_PROCESSED]: 'This payment has already been processed',

  // Deposits
  [ERROR_CODES.DEPOSIT_REQUIRED]: 'A deposit is required before bidding',
  [ERROR_CODES.DEPOSIT_INSUFFICIENT]: 'Insufficient deposit amount',
  [ERROR_CODES.DEPOSIT_FAILED]: 'Failed to process deposit',
  [ERROR_CODES.DEPOSIT_ALREADY_HELD]: 'A deposit is already held for this auction',

  // Fraud
  [ERROR_CODES.FRAUD_DETECTED]: 'Suspicious activity detected',
  [ERROR_CODES.FRAUD_SUSPICIOUS_ACTIVITY]: 'Your request was blocked due to suspicious activity',
  [ERROR_CODES.FRAUD_RATE_LIMIT_EXCEEDED]: 'Too many attempts. Please try again later',
  [ERROR_CODES.FRAUD_MULTIPLE_ACCOUNTS]: 'Multiple account usage detected',
  [ERROR_CODES.FRAUD_BLOCKED_IP]: 'Access denied from this location',

  // Rate limiting
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  [ERROR_CODES.RATE_LIMIT_TOO_MANY_REQUESTS]: 'Too many requests. Please slow down',

  // Stripe Connect
  [ERROR_CODES.STRIPE_CONNECT_NOT_SETUP]: 'Stripe Connect account not setup',
  [ERROR_CODES.STRIPE_CONNECT_INCOMPLETE]: 'Please complete your Stripe Connect setup',
  [ERROR_CODES.STRIPE_CONNECT_DISABLED]: 'Your Stripe Connect account is disabled',

  // Listings
  [ERROR_CODES.LISTING_ALREADY_SUBMITTED]: 'This listing has already been submitted',
  [ERROR_CODES.LISTING_ALREADY_APPROVED]: 'This listing has already been approved',
  [ERROR_CODES.LISTING_REJECTED]: 'This listing has been rejected',
  [ERROR_CODES.LISTING_INCOMPLETE]: 'Listing is incomplete',

  // Users
  [ERROR_CODES.USER_ALREADY_EXISTS]: 'A user with this email already exists',
  [ERROR_CODES.USER_EMAIL_IN_USE]: 'This email address is already in use',
  [ERROR_CODES.USER_INVALID_CREDENTIALS]: 'Invalid email or password',

  // System
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An internal server error occurred',
  [ERROR_CODES.DATABASE_ERROR]: 'Database operation failed',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ERROR_CODES.CONFIGURATION_ERROR]: 'System configuration error',
}
