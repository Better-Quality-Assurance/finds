import { NextRequest, NextResponse } from 'next/server'
import { apiLogger, createTimer, logError } from './logger'
import crypto from 'crypto'

/**
 * Route handler type for Next.js API routes
 */
type RouteContext = {
  params: Promise<Record<string, string>> | Record<string, string>
}

type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse> | NextResponse

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Extract client IP address from request headers
 */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || null
}

/**
 * Logging middleware for API routes
 *
 * Usage:
 * ```typescript
 * export const POST = withLogging(async (request, context) => {
 *   // Your route handler logic
 * })
 * ```
 *
 * Features:
 * - Request/response logging with timing
 * - Request ID generation for tracing
 * - Error handling and logging
 * - IP address and user agent tracking
 */
export function withLogging(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: RouteContext): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const timer = createTimer()
    const method = request.method
    const url = request.url
    const path = new URL(url).pathname
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent')

    // Create a child logger with request context
    const requestLogger = apiLogger.child({
      requestId,
      method,
      path,
      clientIp,
      userAgent,
    })

    requestLogger.info({ url }, 'Request started')

    try {
      // Call the actual route handler
      const response = await handler(request, context)

      // Log successful response
      const duration = timer.end()
      const status = response.status

      requestLogger.info({
        status,
        durationMs: duration,
      }, `Request completed: ${method} ${path} - ${status} (${duration}ms)`)

      // Add request ID to response headers for tracing
      response.headers.set('x-request-id', requestId)

      return response
    } catch (error) {
      // Log error
      const duration = timer.end()

      logError(
        requestLogger,
        `Request failed: ${method} ${path}`,
        error,
        { durationMs: duration }
      )

      // Return error response
      const errorMessage = error instanceof Error ? error.message : 'Internal server error'

      return NextResponse.json(
        {
          error: errorMessage,
          requestId,
        },
        {
          status: 500,
          headers: {
            'x-request-id': requestId,
          },
        }
      )
    }
  }
}

/**
 * Lightweight logging wrapper that only logs without error handling
 * Use this when you want to handle errors yourself but still want request logging
 */
export function withRequestLogging(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: RouteContext): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const timer = createTimer()
    const method = request.method
    const path = new URL(request.url).pathname
    const clientIp = getClientIp(request)

    const requestLogger = apiLogger.child({
      requestId,
      method,
      path,
      clientIp,
    })

    requestLogger.info('Request started')

    const response = await handler(request, context)

    const duration = timer.end()
    requestLogger.info({
      status: response.status,
      durationMs: duration,
    }, 'Request completed')

    response.headers.set('x-request-id', requestId)

    return response
  }
}
