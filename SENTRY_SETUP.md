# Sentry Error Monitoring Setup

This document explains the Sentry error monitoring integration for the Finds auction platform.

## Overview

Sentry provides comprehensive error tracking, performance monitoring, and session replay for debugging production issues. The integration captures errors from:

- Client-side browser errors
- Server-side API errors
- Edge runtime errors
- Middleware errors
- Cron job failures
- Payment processing issues
- Auction operations

## Configuration Files

### Core Configuration

1. **`sentry.client.config.ts`** - Client-side error tracking
   - Captures browser errors and exceptions
   - Session replay for debugging user issues
   - Performance monitoring for page loads
   - Filters out browser extension errors

2. **`sentry.server.config.ts`** - Server-side error tracking
   - Captures API route errors
   - Database query errors (Prisma integration)
   - Server component errors
   - Sanitizes sensitive data (passwords, API keys)

3. **`sentry.edge.config.ts`** - Edge runtime error tracking
   - Captures middleware errors
   - Edge API route errors

### Helper Library

**`/src/lib/sentry.ts`** - Domain-specific error capture functions

Provides specialized error capturing with rich context:

```typescript
import {
  capturePaymentError,
  captureAuctionError,
  captureListingError,
  captureAuthError,
  captureAdminError,
  captureFraudAlert,
  captureDatabaseError,
  captureAPIError,
  captureCronError,
  setUserContext,
  clearUserContext,
} from '@/lib/sentry'
```

## Environment Variables

Add these to your `.env` file:

```bash
# Sentry DSN - Get from https://sentry.io/settings/projects/
NEXT_PUBLIC_SENTRY_DSN="https://xxxxxxxxxxxx@o000000.ingest.sentry.io/0000000"

# Sentry auth token for uploading source maps (build time only)
SENTRY_AUTH_TOKEN="your-sentry-auth-token"

# Organization and project slugs
SENTRY_ORG="your-sentry-organization-slug"
SENTRY_PROJECT="your-sentry-project-slug"
```

### Getting Your Sentry DSN

1. Go to [sentry.io](https://sentry.io)
2. Create a new project or select existing project
3. Go to Settings > Projects > [Your Project] > Client Keys (DSN)
4. Copy the DSN

### Getting Auth Token for Source Maps

1. Go to Settings > Account > API > Auth Tokens
2. Create new token with `project:releases` and `project:write` scopes
3. Copy token to `SENTRY_AUTH_TOKEN`

## Usage Examples

### Payment Errors

```typescript
import { capturePaymentError } from '@/lib/sentry'

try {
  const paymentIntent = await stripe.paymentIntents.create(...)
} catch (error) {
  capturePaymentError(error as Error, {
    userId: session.user.id,
    amount: 5000, // in cents
    currency: 'RON',
    type: 'deposit',
    paymentIntentId: 'pi_xxx',
    auctionId: 'auction-123',
  })
  throw error
}
```

### Auction Errors

```typescript
import { captureAuctionError } from '@/lib/sentry'

try {
  await placeBid(auctionId, userId, amount)
} catch (error) {
  captureAuctionError(error as Error, {
    auctionId,
    operation: 'bid',
    currentBid: 1000,
    bidCount: 5,
    status: 'ACTIVE',
    metadata: {
      bidAmount: amount,
      userId,
    },
  })
  throw error
}
```

### Fraud Detection Alerts

```typescript
import { captureFraudAlert } from '@/lib/sentry'

if (fraudScore > THRESHOLD) {
  captureFraudAlert(new Error('Suspicious bidding pattern detected'), {
    userId: user.id,
    auctionId: auction.id,
    fraudType: 'rapid_bidding',
    riskScore: fraudScore,
    indicators: ['multiple_bids_same_minute', 'new_account'],
  })
}
```

### Cron Job Errors

```typescript
import { captureCronError } from '@/lib/sentry'

const startTime = Date.now()

try {
  // ... cron job logic
} catch (error) {
  captureCronError(error as Error, {
    jobName: 'end-auctions',
    startTime: new Date(startTime),
    metadata: {
      auctionsProcessed: count,
    },
  })
  throw error
}
```

### User Context

Set user context after authentication:

```typescript
import { setUserContext, clearUserContext } from '@/lib/sentry'

// In auth callback
callbacks: {
  async session({ session, token }) {
    setUserContext({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    })
    return session
  },
}

// On logout
events: {
  async signOut() {
    clearUserContext()
  },
}
```

## Automatic Error Capture

### API Routes with Error Handler

All API routes using `withErrorHandler` automatically capture errors:

```typescript
import { withErrorHandler } from '@/lib/with-error-handler'

export const POST = withErrorHandler(
  async (request) => {
    // Your code here
    // Errors are automatically captured with full context
  },
  {
    resourceType: 'auction',
    action: 'auction.bid.create',
    requiresAuth: true,
  }
)
```

The error handler automatically adds:
- Request ID
- HTTP method and route
- User context (if authenticated)
- Request headers (sanitized)
- Query parameters
- Error severity classification

### Middleware Errors

The middleware in `/src/middleware.ts` automatically captures errors with:
- Request URL and method
- User session data
- Route protection context

## Security & Privacy

### Data Sanitization

The Sentry configuration automatically filters sensitive data:

**Removed from errors:**
- Password fields
- API keys and secrets
- Authorization headers
- Cookie headers
- Stripe secret keys

**Masked in session replay:**
- All text content (`maskAllText: true`)
- All media (`blockAllMedia: true`)
- Elements with `data-sensitive` attribute

### Source Maps

Source maps are uploaded to Sentry during build but are **hidden from client bundles** (`hideSourceMaps: true`). This allows readable stack traces in Sentry while keeping production code obfuscated.

## Performance Monitoring

### Sample Rates

- **Production**: 10% of transactions (to reduce costs)
- **Development**: 100% of transactions (disabled by default)

### Performance Tracking

Track critical operations:

```typescript
import { trackPerformance } from '@/lib/sentry'

const result = await trackPerformance(
  'auction.bid.placement',
  async () => {
    return await placeBid(...)
  },
  {
    auctionId,
    userId,
  }
)
```

## Session Replay

Session replay captures user interactions for debugging:

- **Normal sessions**: 10% sample rate
- **Error sessions**: 100% sample rate (always recorded when error occurs)

Replay helps answer:
- What steps led to the error?
- What was the user trying to do?
- What was the page state?

## Monitoring Dashboards

### Recommended Sentry Dashboards

1. **Payment Errors**
   - Filter: `payment_type:*`
   - Track Stripe integration issues

2. **Auction Operations**
   - Filter: `resource_type:auction`
   - Monitor bid placement, auction endings

3. **Cron Job Health**
   - Filter: `cron_job:*`
   - Alert on job failures

4. **Fraud Alerts**
   - Filter: `fraud_type:*`
   - High priority alerts

5. **API Error Rate**
   - Group by: `api_route`
   - Track error rates per endpoint

## Alerts

### Recommended Alert Rules

1. **Critical Payment Errors**
   - Condition: Any error with `payment_type:*` and level:`error`
   - Action: Send to #payments-alerts Slack channel

2. **Cron Job Failures**
   - Condition: Any error with `cron_job:*`
   - Action: PagerDuty alert

3. **High Fraud Risk**
   - Condition: `fraud_type:*` and `risk_score:>=80`
   - Action: Email admin team

4. **API Error Spike**
   - Condition: Error count > 50 in 5 minutes
   - Action: Send to #dev-alerts

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify DSN is prefixed with `NEXT_PUBLIC_` (required for client-side)
3. Check browser console for Sentry initialization errors
4. Verify `enabled: process.env.NODE_ENV !== 'development'` is correct

### Source Maps Not Uploading

1. Check `SENTRY_AUTH_TOKEN` has correct permissions
2. Verify `SENTRY_ORG` and `SENTRY_PROJECT` are correct
3. Check build logs for upload errors
4. Ensure CI environment has auth token set

### Too Many Events

Adjust sample rates in configuration files:

```typescript
// Reduce to 1% in production
tracesSampleRate: 0.01,
replaysSessionSampleRate: 0.01,
```

## Best Practices

1. **Use domain-specific capture functions** - Provides better context
2. **Set user context early** - In auth callbacks
3. **Add custom tags** - For filtering and grouping
4. **Use fingerprints** - For better error grouping
5. **Monitor performance** - Track critical operations
6. **Review regularly** - Set up weekly error review meetings

## Cost Optimization

Sentry pricing is based on events and replays:

1. **Sample strategically** - Lower sample rates in production
2. **Filter noise** - Ignore expected errors (404s, etc.)
3. **Use fingerprints** - Avoid duplicate issues
4. **Set quotas** - Configure max events per month
5. **Archive old issues** - Keep dashboard clean

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Issues**: Create ticket in project issue tracker
- **Team**: @platform-team on Slack
