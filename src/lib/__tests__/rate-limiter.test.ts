/**
 * Rate Limiter Tests
 *
 * Run with: npx jest src/lib/__tests__/rate-limiter.test.ts
 */

import {
  rateLimit,
  createRateLimiter,
  resetRateLimit,
  clearAllRateLimits,
  getRateLimitStatus,
  RateLimitConfig,
} from '../rate-limiter'

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits()
  })

  describe('rateLimit', () => {
    it('should allow requests within the limit', () => {
      const config: RateLimitConfig = {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
      }

      // First request should be allowed
      const result1 = rateLimit('test-key', config)
      expect(result1.success).toBe(true)
      expect(result1.remaining).toBe(4)
      expect(result1.total).toBe(5)

      // Second request should be allowed
      const result2 = rateLimit('test-key', config)
      expect(result2.success).toBe(true)
      expect(result2.remaining).toBe(3)
    })

    it('should block requests when limit is exceeded', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3,
      }

      // Use up the limit
      rateLimit('test-key', config) // 1
      rateLimit('test-key', config) // 2
      rateLimit('test-key', config) // 3

      // This one should be blocked
      const result = rateLimit('test-key', config)
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after the time window expires', async () => {
      const config: RateLimitConfig = {
        windowMs: 100, // 100ms for testing
        maxRequests: 2,
      }

      // Use up the limit
      rateLimit('test-key', config)
      rateLimit('test-key', config)

      // Should be blocked
      const blocked = rateLimit('test-key', config)
      expect(blocked.success).toBe(false)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      const allowed = rateLimit('test-key', config)
      expect(allowed.success).toBe(true)
      expect(allowed.remaining).toBe(1)
    })

    it('should track different keys independently', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      }

      // Use up limit for key1
      rateLimit('key1', config)
      rateLimit('key1', config)

      // key1 should be blocked
      const result1 = rateLimit('key1', config)
      expect(result1.success).toBe(false)

      // key2 should still be allowed
      const result2 = rateLimit('key2', config)
      expect(result2.success).toBe(true)
    })

    it('should include retryAfter in result', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 1,
      }

      rateLimit('test-key', config)
      const blocked = rateLimit('test-key', config)

      expect(blocked.success).toBe(false)
      expect(blocked.retryAfter).toBeGreaterThan(0)
      expect(blocked.retryAfter).toBeLessThanOrEqual(60)
    })
  })

  describe('createRateLimiter', () => {
    it('should create a rate limiter function', () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      })

      const result1 = limiter('test')
      expect(result1.success).toBe(true)

      const result2 = limiter('test')
      expect(result2.success).toBe(true)

      const result3 = limiter('test')
      expect(result3.success).toBe(true)

      const result4 = limiter('test')
      expect(result4.success).toBe(false)
    })
  })

  describe('resetRateLimit', () => {
    it('should reset the rate limit for a specific key', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 2,
      }

      // Use up the limit
      rateLimit('test-key', config)
      rateLimit('test-key', config)

      // Should be blocked
      const blocked = rateLimit('test-key', config)
      expect(blocked.success).toBe(false)

      // Reset
      resetRateLimit('test-key')

      // Should be allowed again
      const allowed = rateLimit('test-key', config)
      expect(allowed.success).toBe(true)
    })
  })

  describe('getRateLimitStatus', () => {
    it('should return status without incrementing counter', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 5,
      }

      // Make a request
      rateLimit('test-key', config)

      // Check status multiple times
      const status1 = getRateLimitStatus('test-key', config)
      expect(status1.remaining).toBe(4)

      const status2 = getRateLimitStatus('test-key', config)
      expect(status2.remaining).toBe(4) // Should not decrease

      // Make another request
      rateLimit('test-key', config)

      // Status should reflect the new count
      const status3 = getRateLimitStatus('test-key', config)
      expect(status3.remaining).toBe(3)
    })
  })
})
