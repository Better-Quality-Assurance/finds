/**
 * Higher-Order Function for API Route Error Handling
 *
 * Wraps API route handlers with standardized error handling, logging,
 * and response formatting. Automatically catches and processes errors.
 */

import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, generateRequestId, type ErrorResponse } from './api-response'
import { prisma } from './db'
import { auth } from './auth'

/**
 * Type for Next.js API route handler function
 */
export type RouteHandler<TParams = unknown> = (
  request: NextRequest,
  context: { params: Promise<TParams> }
) => Promise<NextResponse> | NextResponse

/**
 * Type for simple route handler (no params)
 */
export type SimpleRouteHandler = (
  request: NextRequest
) => Promise<NextResponse> | NextResponse

/**
 * Options for error handler configuration
 */
export interface ErrorHandlerOptions {
  /**
   * Whether to log errors to the audit log
   * Default: true for authenticated routes
   */
  auditLog?: boolean

  /**
   * Custom error handler function
   * Called before the default error handler
   */
  onError?: (error: unknown, requestId: string, request: NextRequest) => void | Promise<void>

  /**
   * Whether this route requires authentication
   * Used to determine audit logging behavior
   */
  requiresAuth?: boolean

  /**
   * Resource type for audit logging
   */
  resourceType?: string

  /**
   * Action name for audit logging
   */
  action?: string
}

/**
 * Wrap an API route handler with comprehensive error handling
 *
 * Features:
 * - Automatic error catching and formatting
 * - Request ID tracking
 * - Optional audit logging
 * - Custom error callbacks
 * - Consistent error response format
 *
 * @param handler - The API route handler function
 * @param options - Configuration options
 * @returns Wrapped handler with error handling
 *
 * @example
 * // Basic usage
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData()
 *   return successResponse(data)
 * })
 *
 * @example
 * // With options
 * export const POST = withErrorHandler(
 *   async (request) => {
 *     const result = await createResource()
 *     return successResponse(result, 201)
 *   },
 *   {
 *     requiresAuth: true,
 *     resourceType: 'auction',
 *     action: 'auction.create',
 *     auditLog: true,
 *   }
 * )
 */
export function withErrorHandler<TParams = unknown>(
  handler: RouteHandler<TParams>,
  options: ErrorHandlerOptions = {}
): RouteHandler<TParams> {
  return async (request: NextRequest, context: { params: Promise<TParams> }) => {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      // Execute the wrapped handler
      const response = await handler(request, context)

      // Log successful requests if audit logging is enabled
      if (options.auditLog && options.requiresAuth) {
        await logAuditSuccess(request, requestId, options, Date.now() - startTime)
      }

      return response
    } catch (error) {
      // Call custom error handler if provided
      if (options.onError) {
        try {
          await options.onError(error, requestId, request)
        } catch (callbackError) {
          console.error('Error in custom error handler:', callbackError)
        }
      }

      // Log error to audit log if enabled
      if (options.auditLog && options.requiresAuth) {
        await logAuditError(request, requestId, options, error)
      }

      // Return standardized error response
      return errorResponse(error, requestId)
    }
  }
}

/**
 * Simplified wrapper for routes without parameters
 *
 * @example
 * export const POST = withSimpleErrorHandler(async (request) => {
 *   const data = await processRequest(request)
 *   return successResponse(data)
 * })
 */
export function withSimpleErrorHandler(
  handler: SimpleRouteHandler,
  options: ErrorHandlerOptions = {}
): SimpleRouteHandler {
  return async (request: NextRequest) => {
    const requestId = generateRequestId()
    const startTime = Date.now()

    try {
      const response = await handler(request)

      if (options.auditLog && options.requiresAuth) {
        await logAuditSuccess(request, requestId, options, Date.now() - startTime)
      }

      return response
    } catch (error) {
      if (options.onError) {
        try {
          await options.onError(error, requestId, request)
        } catch (callbackError) {
          console.error('Error in custom error handler:', callbackError)
        }
      }

      if (options.auditLog && options.requiresAuth) {
        await logAuditError(request, requestId, options, error)
      }

      return errorResponse(error, requestId)
    }
  }
}

/**
 * Log successful request to audit log
 */
async function logAuditSuccess(
  request: NextRequest,
  requestId: string,
  options: ErrorHandlerOptions,
  duration: number
): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) {return}

    const url = new URL(request.url)

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email || 'unknown',
        action: options.action || `${request.method} ${url.pathname}`,
        resourceType: options.resourceType || 'api',
        severity: 'LOW',
        status: 'SUCCESS',
        details: {
          requestId,
          method: request.method,
          path: url.pathname,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    // Don't throw if audit logging fails - just log to console
    console.error('Failed to create audit log entry:', error)
  }
}

/**
 * Log error to audit log
 */
async function logAuditError(
  request: NextRequest,
  requestId: string,
  options: ErrorHandlerOptions,
  error: unknown
): Promise<void> {
  try {
    const session = await auth()
    if (!session?.user?.id) {return}

    const url = new URL(request.url)
    const errorMessage = error instanceof Error ? error.message : String(error)

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email || 'unknown',
        action: options.action || `${request.method} ${url.pathname}`,
        resourceType: options.resourceType || 'api',
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage,
        details: {
          requestId,
          method: request.method,
          path: url.pathname,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (logError) {
    console.error('Failed to create audit log entry:', logError)
  }
}

/**
 * Create a typed error response (for use in try-catch blocks)
 *
 * @example
 * try {
 *   // ... code
 * } catch (error) {
 *   return createErrorResponse(error)
 * }
 */
export function createErrorResponse(error: unknown): NextResponse<ErrorResponse> {
  return errorResponse(error)
}

/**
 * Async wrapper for route handlers that might throw
 * Useful for one-off routes that don't need full withErrorHandler features
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   return tryCatch(async () => {
 *     const data = await fetchData()
 *     return successResponse(data)
 *   })
 * }
 */
export async function tryCatch<T>(
  fn: () => Promise<T> | T
): Promise<T | NextResponse<ErrorResponse>> {
  try {
    return await fn()
  } catch (error) {
    return errorResponse(error)
  }
}
