# Rate Limiting Implementation

This document describes the rate limiting implementation for the Finds auction platform.

## Overview

The platform implements a robust rate limiting system to prevent abuse, protect against attacks, and ensure fair resource usage. The current implementation uses an in-memory store and can be upgraded to Redis for distributed deployments.

## Architecture

### Core Components

1. **Rate Limiter** (`/src/lib/rate-limiter.ts`)
   - In-memory implementation with automatic cleanup
   - Configurable time windows and request limits
   - Can be upgraded to Redis for distributed systems

2. **Rate Limit Configurations** (`/src/lib/rate-limit-config.ts`)
   - Centralized configuration for all endpoints
   - Easy to adjust limits per endpoint

3. **Middleware Helpers** (`/src/middleware/rate-limit.ts`)
   - Helper functions for applying rate limits
   - IP extraction from proxy headers
   - Response header generation
   - 429 error response creation

## Rate Limit Policies

### Authentication Endpoints

#### Login (`/api/auth/[...nextauth]`)
- **Limit**: 5 attempts per 15 minutes per IP
- **Key**: `login:{ip-address}`
- **Purpose**: Prevent brute force attacks

#### Password Reset (`/api/auth/forgot-password`)
- **Limit**: 3 attempts per hour per email
- **Key**: `reset-password:email:{email}`
- **Purpose**: Prevent abuse and enumeration attacks

#### Registration (`/api/auth/register`)
- **Limit**: 5 registrations per hour per IP
- **Key**: `register:{ip-address}`
- **Purpose**: Prevent spam account creation

### Auction Endpoints

#### Bid Placement (`/api/auctions/[id]/bids`)
- **Limit**: 30 bids per minute per user
- **Key**: `bid:user:{user-id}`
- **Purpose**: Prevent bid spam and manipulation

### General API
- **Limit**: 100 requests per minute per IP
- **Key**: `api:{ip-address}`
- **Purpose**: Prevent API abuse (not yet implemented globally)

## Implementation Details

### Rate Limit Headers

All API responses include rate limit information in headers:

```
X-RateLimit-Limit: 30           # Total requests allowed in window
X-RateLimit-Remaining: 25       # Requests remaining in current window
X-RateLimit-Reset: 2024-01-20T10:30:00.000Z  # When the window resets
```

### Rate Limited Responses

When rate limited, the API returns:

**Status Code**: `429 Too Many Requests`

**Headers**:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-01-20T10:30:00.000Z
Retry-After: 45  # Seconds until reset
```

**Body**:
```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 45,
  "resetAt": "2024-01-20T10:30:00.000Z"
}
```

## Client IP Extraction

The system extracts client IPs from multiple proxy headers in order of preference:

1. `x-forwarded-for` (most common, used by most proxies)
2. `x-real-ip` (nginx)
3. `cf-connecting-ip` (Cloudflare)
4. `true-client-ip` (Akamai, Cloudflare Enterprise)

Falls back to `'unknown'` if no IP is found.

## Usage Examples

### Applying Rate Limiting to a Route

```typescript
import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  ipRateLimitKey,
  createRateLimitHeaders,
  createRateLimitResponse
} from '@/middleware/rate-limit'
import { REGISTRATION_RATE_LIMIT } from '@/lib/rate-limit-config'

export async function POST(request: Request) {
  // Check rate limit
  const rateLimitKey = ipRateLimitKey('register', request)
  const rateLimitResult = checkRateLimit(rateLimitKey, REGISTRATION_RATE_LIMIT)

  if (!rateLimitResult.success) {
    return createRateLimitResponse(
      rateLimitResult,
      'Too many registration attempts. Please try again later.'
    )
  }

  // ... handle request ...

  // Add headers to success response
  const response = NextResponse.json({ success: true })
  const headers = createRateLimitHeaders(rateLimitResult)
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}
```

### Creating Custom Rate Limit Keys

```typescript
import { userRateLimitKey, emailRateLimitKey, ipRateLimitKey } from '@/middleware/rate-limit'

// User-based (for authenticated actions)
const bidKey = userRateLimitKey('bid', userId)
// Key: "bid:user:user123"

// Email-based (for password resets, verification)
const resetKey = emailRateLimitKey('reset-password', email)
// Key: "reset-password:email:user@example.com"

// IP-based (for anonymous actions)
const registerKey = ipRateLimitKey('register', request)
// Key: "register:192.168.1.1"
```

### Creating Custom Rate Limits

```typescript
import { RateLimitConfig } from '@/lib/rate-limiter'

// 10 requests per 5 minutes
const CUSTOM_RATE_LIMIT: RateLimitConfig = {
  windowMs: 5 * 60 * 1000,  // 5 minutes in milliseconds
  maxRequests: 10,
}
```

## Upgrading to Redis

To upgrade to a distributed Redis-based rate limiter:

1. Install Redis client:
   ```bash
   npm install redis
   ```

2. Update `/src/lib/rate-limiter.ts`:
   - Replace in-memory `Map` with Redis client
   - Use Redis `INCR` with `EXPIRE` for atomic operations
   - Example key pattern: `rate-limit:{key}`
   - Use Redis TTL for automatic expiration

3. Redis implementation example:
   ```typescript
   import { createClient } from 'redis'

   const redis = createClient({ url: process.env.REDIS_URL })

   export async function rateLimit(key: string, config: RateLimitConfig) {
     const redisKey = `rate-limit:${key}`
     const count = await redis.incr(redisKey)

     if (count === 1) {
       await redis.expire(redisKey, Math.ceil(config.windowMs / 1000))
     }

     const ttl = await redis.ttl(redisKey)
     const resetAt = new Date(Date.now() + (ttl * 1000))

     return {
       success: count <= config.maxRequests,
       remaining: Math.max(0, config.maxRequests - count),
       resetAt,
       total: config.maxRequests,
     }
   }
   ```

## Monitoring and Observability

### Metrics to Track

1. **Rate limit hits**: How often are users hitting limits?
2. **Endpoint hotspots**: Which endpoints are rate limited most?
3. **Store size**: Monitor in-memory store size (use `getStoreSize()`)
4. **Attack patterns**: Unusual spike in rate limit hits

### Example Monitoring

```typescript
import { getStoreSize } from '@/lib/rate-limiter'

// Log store size for monitoring
setInterval(() => {
  const size = getStoreSize()
  console.log(`Rate limit store size: ${size}`)

  // Alert if store grows too large (potential memory leak)
  if (size > 10000) {
    console.warn(`Rate limit store size exceeds threshold: ${size}`)
  }
}, 60000) // Every minute
```

## Testing

### Manual Testing

```bash
# Test login rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/callback/credentials \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### Reset Rate Limits (Testing Only)

```typescript
import { resetRateLimit, clearAllRateLimits } from '@/lib/rate-limiter'

// Reset specific key
resetRateLimit('login:192.168.1.1')

// Clear all rate limits
clearAllRateLimits()
```

## Security Considerations

1. **IP Spoofing**: Validate proxy headers in production
2. **Distributed Denial of Service**: Consider additional DDoS protection (Cloudflare, AWS Shield)
3. **Memory Limits**: Monitor in-memory store size, upgrade to Redis if needed
4. **Bypass Prevention**: Ensure rate limits are applied before expensive operations
5. **User Experience**: Set reasonable limits that don't frustrate legitimate users

## Future Enhancements

1. **Redis Integration**: For distributed deployments
2. **Dynamic Rate Limits**: Adjust based on user reputation or tier
3. **Bypass Lists**: Whitelist trusted IPs or users
4. **Analytics Dashboard**: Visualize rate limit metrics
5. **Adaptive Limits**: Automatically adjust based on attack patterns
6. **Global Rate Limiting**: Apply limits to all API endpoints by default
7. **Rate Limit Tiers**: Different limits for free vs. premium users

## Configuration Reference

| Endpoint | Limit | Window | Key Pattern |
|----------|-------|--------|-------------|
| Login | 5 | 15 minutes | `login:{ip}` |
| Password Reset | 3 | 1 hour | `reset-password:email:{email}` |
| Registration | 5 | 1 hour | `register:{ip}` |
| Bid Placement | 30 | 1 minute | `bid:user:{userId}` |
| Email Verification | 3 | 1 hour | `verify:email:{email}` |
| Watchlist Operations | 20 | 1 minute | `watchlist:user:{userId}` |
| File Upload | 10 | 5 minutes | `upload:user:{userId}` |

## Troubleshooting

### Common Issues

1. **Rate limits not working**
   - Check that middleware is imported and called
   - Verify rate limit key is being generated correctly
   - Check that headers are being extracted properly

2. **Users getting rate limited too quickly**
   - Review and adjust rate limit configurations
   - Check if multiple instances are running (consider Redis)

3. **Memory usage growing**
   - Monitor store size with `getStoreSize()`
   - Ensure cleanup interval is running
   - Consider upgrading to Redis

4. **IP address is 'unknown'**
   - Verify proxy headers are being set correctly
   - Check reverse proxy configuration
   - Ensure application is behind the expected proxy

## Support

For questions or issues with rate limiting:
1. Check this documentation
2. Review the implementation in `/src/lib/rate-limiter.ts`
3. Review applied rate limits in `/src/lib/rate-limit-config.ts`
4. Check the middleware helpers in `/src/middleware/rate-limit.ts`
