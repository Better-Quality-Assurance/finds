/**
 * In-memory rate limiter implementation
 * Can be upgraded to Redis for distributed systems
 */

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum number of requests in the window
}

export interface RateLimitResult {
  success: boolean // Whether the request is allowed
  remaining: number // Number of requests remaining in current window
  resetAt: Date // When the rate limit window resets
  total: number // Total allowed requests in window
  limit: number // Alias for total (for compatibility)
  retryAfter: number // Seconds until reset (for compatibility)
}

interface RateLimitStore {
  count: number
  resetAt: number // Timestamp
}

// In-memory store: Map<key, RateLimitStore>
const store = new Map<string, RateLimitStore>()

// Clean up expired entries every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  const keysToDelete: string[] = []

  store.forEach((value, key) => {
    if (value.resetAt < now) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => store.delete(key))
}, 60000)

/**
 * Creates a rate limiter function with the given configuration
 * @param config Rate limit configuration
 * @returns A function that can be called with a unique key to check rate limits
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (key: string): RateLimitResult => {
    return rateLimit(key, config)
  }
}

/**
 * Check if a request is allowed based on rate limiting rules
 * @param key Unique identifier for the rate limit (e.g., "login:192.168.1.1" or "bid:user123")
 * @param config Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed and remaining quota
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  // If no existing entry or the window has expired, create a new one
  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowMs
    store.set(key, {
      count: 1,
      resetAt,
    })

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(resetAt),
      total: config.maxRequests,
      limit: config.maxRequests,
      retryAfter: Math.ceil(config.windowMs / 1000),
    }
  }

  // Window is still active
  // Check if we've exceeded the limit
  if (existing.count >= config.maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
      total: config.maxRequests,
      limit: config.maxRequests,
      retryAfter,
    }
  }

  // Increment the counter
  existing.count++
  store.set(key, existing)

  const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    resetAt: new Date(existing.resetAt),
    total: config.maxRequests,
    limit: config.maxRequests,
    retryAfter,
  }
}

/**
 * Reset rate limit for a specific key (useful for testing or manual overrides)
 * @param key The rate limit key to reset
 */
export function resetRateLimit(key: string): void {
  store.delete(key)
}

/**
 * Get current rate limit status without incrementing
 * @param key The rate limit key to check
 * @param config Rate limit configuration
 * @returns Current rate limit status
 */
export function getRateLimitStatus(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    return {
      success: true,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
      total: config.maxRequests,
      limit: config.maxRequests,
      retryAfter: Math.ceil(config.windowMs / 1000),
    }
  }

  const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
  return {
    success: existing.count < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - existing.count),
    resetAt: new Date(existing.resetAt),
    total: config.maxRequests,
    limit: config.maxRequests,
    retryAfter,
  }
}

/**
 * Get current store size (useful for monitoring)
 */
export function getStoreSize(): number {
  return store.size
}

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearAllRateLimits(): void {
  store.clear()
}
