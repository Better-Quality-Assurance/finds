/**
 * Custom Error Classes for the Finds Auction Platform
 *
 * Provides a hierarchy of error types with proper status codes and metadata.
 * All errors extend the base AppError class for consistent handling.
 */

import { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from './error-codes'

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly timestamp: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, unknown>,
    isOperational = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
    this.isOperational = isOperational

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp,
      },
    }
  }
}

// ============================================================================
// Authentication & Authorization Errors
// ============================================================================

/**
 * Thrown when authentication is required but not provided
 * HTTP Status: 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.AUTH_REQUIRED],
    code: ErrorCode = ERROR_CODES.AUTH_REQUIRED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 401, details)
  }
}

/**
 * Thrown when user lacks permissions for an operation
 * HTTP Status: 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS],
    code: ErrorCode = ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
    details?: Record<string, unknown>
  ) {
    super(message, code, 403, details)
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Thrown when request validation fails
 * HTTP Status: 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.VALIDATION_INVALID_INPUT],
    code: ErrorCode = ERROR_CODES.VALIDATION_INVALID_INPUT,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details)
  }
}

/**
 * Thrown when a bad request is made
 * HTTP Status: 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(
    message: string = 'Bad request',
    code: ErrorCode = ERROR_CODES.VALIDATION_INVALID_INPUT,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details)
  }
}

// ============================================================================
// Resource Errors
// ============================================================================

/**
 * Thrown when a requested resource is not found
 * HTTP Status: 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND],
    code: ErrorCode = ERROR_CODES.RESOURCE_NOT_FOUND,
    details?: Record<string, unknown>
  ) {
    super(message, code, 404, details)
  }
}

// ============================================================================
// Payment Errors
// ============================================================================

/**
 * Thrown when payment is required or fails
 * HTTP Status: 402 Payment Required
 */
export class PaymentError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.PAYMENT_REQUIRED],
    code: ErrorCode = ERROR_CODES.PAYMENT_REQUIRED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 402, details)
  }
}

/**
 * Thrown when deposit is insufficient or required
 * HTTP Status: 402 Payment Required
 */
export class InsufficientDepositError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.DEPOSIT_REQUIRED],
    code: ErrorCode = ERROR_CODES.DEPOSIT_REQUIRED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 402, details)
  }
}

// ============================================================================
// Rate Limiting Errors
// ============================================================================

/**
 * Thrown when rate limit is exceeded
 * HTTP Status: 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT_EXCEEDED],
    code: ErrorCode = ERROR_CODES.RATE_LIMIT_EXCEEDED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 429, details)
  }
}

// ============================================================================
// Fraud & Security Errors
// ============================================================================

/**
 * Thrown when fraud is detected
 * HTTP Status: 403 Forbidden
 */
export class FraudDetectedError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.FRAUD_DETECTED],
    code: ErrorCode = ERROR_CODES.FRAUD_DETECTED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 403, details)
  }
}

// ============================================================================
// Auction Business Logic Errors
// ============================================================================

/**
 * Thrown when attempting to interact with a closed auction
 * HTTP Status: 400 Bad Request
 */
export class AuctionClosedError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.AUCTION_CLOSED],
    code: ErrorCode = ERROR_CODES.AUCTION_CLOSED,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details)
  }
}

/**
 * Thrown when auction is not in the expected state
 * HTTP Status: 400 Bad Request
 */
export class AuctionStateError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.AUCTION_NOT_ACTIVE,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details)
  }
}

/**
 * Thrown when auction is not active
 * HTTP Status: 400 Bad Request
 */
export class AuctionNotActiveError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.AUCTION_NOT_ACTIVE],
    details?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.AUCTION_NOT_ACTIVE, 400, details)
  }
}

/**
 * Thrown when auction has ended
 * HTTP Status: 400 Bad Request
 */
export class AuctionEndedError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.AUCTION_ENDED],
    details?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.AUCTION_ENDED, 400, details)
  }
}

/**
 * Thrown when auction has not started yet
 * HTTP Status: 400 Bad Request
 */
export class AuctionNotStartedError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.AUCTION_NOT_STARTED],
    details?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.AUCTION_NOT_STARTED, 400, details)
  }
}

/**
 * Thrown when bid amount is too low
 * HTTP Status: 400 Bad Request
 */
export class BidTooLowError extends AppError {
  public readonly minimumBid: number

  constructor(minimumBid: number, message?: string) {
    super(
      message || `Bid must be at least ${minimumBid}`,
      ERROR_CODES.BID_TOO_LOW,
      400,
      { minimumBid }
    )
    this.minimumBid = minimumBid
  }
}

/**
 * Thrown when user tries to bid on their own auction
 * HTTP Status: 400 Bad Request
 */
export class SelfBidError extends AppError {
  constructor(message: string = 'Sellers cannot bid on their own listings') {
    super(message, ERROR_CODES.BID_OWN_AUCTION, 400)
  }
}

/**
 * Thrown when bid validation fails
 * HTTP Status: 400 Bad Request
 */
export class BidValidationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.BID_TOO_LOW,
    details?: Record<string, unknown>
  ) {
    super(message, code, 400, details)
  }
}

// ============================================================================
// Conflict Errors
// ============================================================================

/**
 * Thrown when a resource conflict occurs (e.g., duplicate user)
 * HTTP Status: 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.USER_ALREADY_EXISTS,
    details?: Record<string, unknown>
  ) {
    super(message, code, 409, details)
  }
}

// ============================================================================
// System Errors
// ============================================================================

/**
 * Thrown for unexpected server errors
 * HTTP Status: 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
    code: ErrorCode = ERROR_CODES.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, code, 500, details, false) // Not operational
  }
}

/**
 * Thrown when database operations fail
 * HTTP Status: 500 Internal Server Error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
    details?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.DATABASE_ERROR, 500, details, false)
  }
}

/**
 * Thrown when external service calls fail
 * HTTP Status: 500 Internal Server Error
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR],
    details?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.EXTERNAL_SERVICE_ERROR, 500, details, false)
  }
}

// ============================================================================
// Error Utility Functions
// ============================================================================

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Type guard to check if error is operational (expected business logic error)
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational
  }
  return false
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR]
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, ERROR_CODES.INTERNAL_SERVER_ERROR, {
      originalError: error.name,
      stack: error.stack,
    })
  }

  return new InternalServerError('An unexpected error occurred', ERROR_CODES.INTERNAL_SERVER_ERROR, {
    originalError: String(error),
  })
}
