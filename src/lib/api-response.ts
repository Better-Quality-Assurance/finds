/**
 * Standardized API Response Helpers
 *
 * Provides consistent response formatting across all API endpoints.
 * Includes success responses, error responses, and request ID tracking.
 */

import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { ZodError } from 'zod'
import { AppError, isAppError, toAppError } from './errors'
import { ERROR_CODES } from './error-codes'

/**
 * Standard success response structure
 */
export interface SuccessResponse<T = unknown> {
  success: true
  data: T
  requestId: string
  timestamp: string
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  success: false
  error: {
    message: string
    code: string
    statusCode: number
    details?: Record<string, unknown>
    requestId: string
    timestamp: string
  }
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Create a standardized success response
 *
 * @param data - The data to return
 * @param statusCode - HTTP status code (default: 200)
 * @param requestId - Optional request ID (generated if not provided)
 * @returns NextResponse with standardized success format
 *
 * @example
 * return successResponse({ user: { id: '123', name: 'John' } })
 * return successResponse({ message: 'Created' }, 201)
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200,
  requestId?: string
): NextResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    requestId: requestId || generateRequestId(),
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'X-Request-ID': response.requestId,
    },
  })
}

/**
 * Create a standardized error response
 *
 * Handles different error types and converts them to a consistent format.
 * Automatically logs errors and includes request tracking.
 *
 * @param error - Error object (AppError, Error, ZodError, or unknown)
 * @param requestId - Optional request ID (generated if not provided)
 * @returns NextResponse with standardized error format
 *
 * @example
 * return errorResponse(new UnauthorizedError())
 * return errorResponse(new ValidationError('Invalid input', ERROR_CODES.VALIDATION_INVALID_INPUT, { field: 'email' }))
 */
export function errorResponse(
  error: unknown,
  requestId?: string
): NextResponse<ErrorResponse> {
  const rid = requestId || generateRequestId()
  let appError: AppError

  // Convert Zod validation errors to AppError
  if (error instanceof ZodError) {
    const fieldErrors = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))

    appError = new AppError(
      'Validation failed',
      ERROR_CODES.VALIDATION_INVALID_INPUT,
      400,
      {
        fields: fieldErrors,
        zodError: error.errors,
      }
    )
  } else {
    appError = isAppError(error) ? error : toAppError(error)
  }

  // Log error for monitoring (exclude stack traces in production for operational errors)
  const logData = {
    requestId: rid,
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    details: appError.details,
    timestamp: appError.timestamp,
    isOperational: appError.isOperational,
  }

  if (appError.statusCode >= 500 || !appError.isOperational) {
    // Server errors or programming errors - log with full details
    console.error('API Error:', {
      ...logData,
      stack: appError.stack,
    })
  } else {
    // Client errors - log without stack trace
    console.warn('API Client Error:', logData)
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      details: appError.details,
      requestId: rid,
      timestamp: appError.timestamp,
    },
  }

  return NextResponse.json(response, {
    status: appError.statusCode,
    headers: {
      'X-Request-ID': rid,
    },
  })
}

/**
 * Create a paginated success response
 *
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @param statusCode - HTTP status code (default: 200)
 * @returns NextResponse with paginated data
 *
 * @example
 * return paginatedResponse(
 *   auctions,
 *   { page: 1, limit: 20, total: 100, totalPages: 5 }
 * )
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  },
  statusCode: number = 200
): NextResponse {
  return successResponse(
    {
      items: data,
      pagination,
    },
    statusCode
  )
}

/**
 * Create a response that requires client action (e.g., 3DS authentication)
 *
 * @param message - Message describing the required action
 * @param actionData - Data needed to complete the action (e.g., clientSecret)
 * @param statusCode - HTTP status code (default: 402 for payment actions)
 * @returns NextResponse with action requirement
 *
 * @example
 * return actionRequiredResponse(
 *   'Payment authentication required',
 *   { clientSecret: 'pi_xxx_secret_yyy', paymentIntentId: 'pi_xxx' },
 *   402
 * )
 */
export function actionRequiredResponse(
  message: string,
  actionData: Record<string, unknown>,
  statusCode: number = 402
): NextResponse {
  return successResponse(
    {
      requiresAction: true,
      message,
      ...actionData,
    },
    statusCode
  )
}

/**
 * Create a no-content success response
 *
 * Used for successful operations that don't return data (e.g., DELETE)
 *
 * @returns NextResponse with 204 No Content
 *
 * @example
 * return noContentResponse()
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

/**
 * Type guard to check if response is a success response
 */
export function isSuccessResponse<T>(
  response: SuccessResponse<T> | ErrorResponse
): response is SuccessResponse<T> {
  return response.success === true
}

/**
 * Type guard to check if response is an error response
 */
export function isErrorResponse(
  response: SuccessResponse<unknown> | ErrorResponse
): response is ErrorResponse {
  return response.success === false
}
