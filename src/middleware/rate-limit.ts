/**
 * Rate limiting middleware helpers for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, RateLimitConfig, RateLimitResult } from '@/lib/rate-limiter'

/**
 * Extract client IP address from request headers
 * Checks common proxy headers in order of preference
 * @param request Next.js request object or Headers object
 * @returns IP address or 'unknown' if not found
 */
export function getClientIp(request: NextRequest | Request | Headers): string {
  let headers: Headers

  if (request instanceof Headers) {
    headers = request
  } else {
    headers = request.headers
  }

  // Check x-forwarded-for (most common proxy header)
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  // Check x-real-ip (used by some proxies like nginx)
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Check cf-connecting-ip (Cloudflare)
  const cfIp = headers.get('cf-connecting-ip')
  if (cfIp) {
    return cfIp.trim()
  }

  // Check true-client-ip (Akamai and Cloudflare Enterprise)
  const trueClientIp = headers.get('true-client-ip')
  if (trueClientIp) {
    return trueClientIp.trim()
  }

  // Fallback to unknown
  return 'unknown'
}

/**
 * Apply rate limiting to a request
 * @param key Unique identifier for the rate limit
 * @param config Rate limit configuration
 * @returns RateLimitResult
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  return rateLimit(key, config)
}

/**
 * Create rate limit response headers
 * @param result Rate limit result
 * @returns Headers to add to the response
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.total.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  }
}

/**
 * Create a 429 Too Many Requests response with proper headers
 * @param result Rate limit result
 * @param message Optional custom error message
 * @returns NextResponse with 429 status
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  message?: string
): NextResponse {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)

  const response = NextResponse.json(
    {
      error: message || 'Too many requests. Please try again later.',
      retryAfter,
      resetAt: result.resetAt.toISOString(),
    },
    { status: 429 }
  )

  // Add rate limit headers
  const headers = createRateLimitHeaders(result)
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add Retry-After header (in seconds)
  response.headers.set('Retry-After', retryAfter.toString())

  return response
}

/**
 * Wrapper function to apply rate limiting to an API route handler
 * @param key Function that generates a unique key from the request
 * @param config Rate limit configuration
 * @param handler The actual route handler function
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends any[]>(
  key: (request: Request, ...args: T) => string,
  config: RateLimitConfig,
  handler: (request: Request, ...args: T) => Promise<NextResponse>
) {
  return async (request: Request, ...args: T): Promise<NextResponse> => {
    // Generate rate limit key
    const rateLimitKey = key(request, ...args)

    // Check rate limit
    const result = checkRateLimit(rateLimitKey, config)

    // If rate limited, return 429 response
    if (!result.success) {
      return createRateLimitResponse(result)
    }

    // Call the actual handler
    const response = await handler(request, ...args)

    // Add rate limit headers to successful responses
    const headers = createRateLimitHeaders(result)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Helper to create IP-based rate limit key
 * @param prefix Rate limit key prefix (e.g., 'login', 'register')
 * @param request Request object
 * @returns Rate limit key
 */
export function ipRateLimitKey(prefix: string, request: Request | Headers): string {
  const ip = getClientIp(request)
  return `${prefix}:${ip}`
}

/**
 * Helper to create user-based rate limit key
 * @param prefix Rate limit key prefix (e.g., 'bid', 'upload')
 * @param userId User ID
 * @returns Rate limit key
 */
export function userRateLimitKey(prefix: string, userId: string): string {
  return `${prefix}:user:${userId}`
}

/**
 * Helper to create email-based rate limit key
 * @param prefix Rate limit key prefix (e.g., 'reset-password')
 * @param email Email address
 * @returns Rate limit key
 */
export function emailRateLimitKey(prefix: string, email: string): string {
  // Normalize email to lowercase
  return `${prefix}:email:${email.toLowerCase()}`
}
