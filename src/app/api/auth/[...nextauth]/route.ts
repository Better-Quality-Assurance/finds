import { handlers } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp, createRateLimitHeaders, createRateLimitResponse } from '@/middleware/rate-limit'
import { LOGIN_RATE_LIMIT } from '@/lib/rate-limit-config'

// Wrap the GET handler with rate limiting
async function handleGET(request: NextRequest) {
  return handlers.GET(request)
}

// Wrap the POST handler with rate limiting (for login attempts)
async function handlePOST(request: NextRequest) {
  // Only rate limit credential-based login attempts
  // Check if this is a credentials sign-in by looking at the URL
  const url = new URL(request.url)
  const isCredentialsCallback = url.pathname.includes('/callback/credentials')

  if (isCredentialsCallback) {
    // Rate limit based on IP address for login attempts
    const ip = getClientIp(request)
    const rateLimitKey = `login:${ip}`
    const result = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT)

    // If rate limited, return 429 response
    if (!result.success) {
      return createRateLimitResponse(
        result,
        'Too many login attempts. Please try again later.'
      )
    }

    // Call the original handler
    const response = await handlers.POST(request)

    // Add rate limit headers to the response
    const headers = createRateLimitHeaders(result)
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }

  // For non-login requests (like CSRF token, etc.), just pass through
  return handlers.POST(request)
}

export { handleGET as GET, handlePOST as POST }
