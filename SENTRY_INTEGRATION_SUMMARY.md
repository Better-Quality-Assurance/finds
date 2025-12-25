# Sentry Integration Summary

This document summarizes the Sentry error monitoring integration for the Finds auction platform.

## What Was Installed

### Package
- `@sentry/nextjs` - Official Sentry SDK for Next.js

### Configuration Files

1. **`sentry.client.config.ts`** - Client-side configuration
   - Browser error tracking
   - Session replay (10% normal, 100% on errors)
   - Performance monitoring (10% sample rate in production)
   - Filters browser extension errors

2. **`src/instrumentation.ts`** - Server & Edge configuration
   - Server-side error tracking (Node.js runtime)
   - Edge runtime error tracking
   - Prisma integration for database errors
   - HTTP integration for API monitoring

3. **`src/lib/sentry.ts`** - Helper functions (390 lines)
   - `capturePaymentError()` - Stripe/payment errors
   - `captureAuctionError()` - Auction operations
   - `captureListingError()` - Listing management
   - `captureAuthError()` - Authentication issues
   - `captureAdminError()` - Admin operations
   - `captureFraudAlert()` - Fraud detection
   - `captureDatabaseError()` - Database errors
   - `captureAPIError()` - General API errors
   - `captureCronError()` - Scheduled job errors
   - `setUserContext()` / `clearUserContext()` - User tracking
   - `trackPerformance()` - Performance monitoring
   - `captureMessage()` - Info/warning messages

## Integration Points

### 1. Next.js Configuration (`next.config.mjs`)
- Wrapped config with `withSentryConfig()`
- Added Sentry options for source maps
- Updated CSP to allow Sentry connections
- Enabled instrumentation hook

### 2. Authentication (`src/lib/auth.ts`)
- Set user context in session callback
- Clear user context on logout
- Automatically tracks user with all errors

### 3. Middleware (`src/middleware.ts`)
- Catches and reports middleware errors
- Sets user context from session
- Includes request metadata

### 4. Error Handler (`src/lib/with-error-handler.ts`)
- **Automatic error capture for ALL API routes**
- Captures with full context:
  - Request ID
  - HTTP method and route
  - User session
  - Query parameters
  - Headers (sanitized)
  - Resource type and action
- Classifies error severity (warnings vs errors)
- All routes using `withErrorHandler()` get automatic Sentry tracking

### 5. Example Integrations

**Payment Route** (`src/app/api/payments/deposit/route.ts`):
- Captures payment-specific errors with context
- Tracks deposit operations

**Cron Job** (`src/app/api/cron/end-auctions/route.ts`):
- Captures cron job failures
- Tracks individual auction ending errors
- Rich metadata for debugging

## Environment Variables

Added to `.env.example`:

```bash
NEXT_PUBLIC_SENTRY_DSN="https://xxxxxxxxxxxx@o000000.ingest.sentry.io/0000000"
SENTRY_AUTH_TOKEN="your-sentry-auth-token-for-sourcemaps"
SENTRY_ORG="your-sentry-organization-slug"
SENTRY_PROJECT="your-sentry-project-slug"
```

## Security Features

### Data Sanitization
Automatically removes:
- Passwords and password hashes
- API keys and secrets
- Authorization and cookie headers
- Stripe secret keys
- All env variables with SECRET/KEY/PASSWORD

### Session Replay Privacy
- Masks all text content
- Blocks all media
- Can add `data-sensitive` attribute for extra masking

### Source Maps
- Uploaded to Sentry during build
- Hidden from client bundles in production
- Provides readable stack traces in Sentry dashboard

## What Gets Tracked

### Automatically Tracked (via withErrorHandler)
- All API route errors
- Authentication errors
- Database query errors
- Validation errors
- Business logic errors

### Explicitly Tracked (where integrated)
- Payment processing errors (Stripe)
- Auction operations (bids, endings)
- Cron job failures
- Fraud detection alerts
- Middleware errors

### Performance Tracking
- API response times (5-10% sample)
- Database query performance
- Custom tracked operations

### Session Replay
- User interactions leading to errors
- Full session context
- Page state at time of error

## Error Grouping & Context

Each error includes:

**Request Context:**
- Request ID (for log correlation)
- HTTP method and path
- Query parameters
- Headers (sanitized)

**User Context:**
- User ID
- Email
- Name
- Role

**Custom Context:**
- Resource type (auction, listing, payment, etc.)
- Action being performed
- Domain-specific metadata

**Tags for Filtering:**
- `api_route` - The endpoint
- `http_method` - GET/POST/etc
- `resource_type` - auction/listing/payment
- `action` - The specific operation
- `payment_type` - deposit/fee/payout
- `fraud_type` - Type of fraud detected
- `cron_job` - Job name

## Usage Examples

### In a New API Route

```typescript
import { withErrorHandler } from '@/lib/with-error-handler'
import { capturePaymentError } from '@/lib/sentry'

export const POST = withErrorHandler(
  async (request) => {
    // Your code - errors are automatically captured
    // For domain-specific errors, use capture functions:

    try {
      await processPayment()
    } catch (error) {
      capturePaymentError(error, {
        userId: session.user.id,
        amount: 5000,
        currency: 'RON',
        type: 'deposit',
      })
      throw error
    }
  },
  {
    resourceType: 'payment',
    action: 'payment.deposit.create',
    requiresAuth: true,
  }
)
```

### In a Service Function

```typescript
import { captureAuctionError } from '@/lib/sentry'

export async function placeBid(auctionId: string, userId: string, amount: number) {
  try {
    // ... bid logic
  } catch (error) {
    captureAuctionError(error as Error, {
      auctionId,
      operation: 'bid',
      metadata: { userId, amount },
    })
    throw error
  }
}
```

## Documentation

- **Setup Guide**: `SENTRY_SETUP.md` - Full setup and configuration
- **This Summary**: `SENTRY_INTEGRATION_SUMMARY.md` - Quick reference
- **Helper Library**: `src/lib/sentry.ts` - Type definitions and functions

## Next Steps

1. **Create Sentry Account**
   - Sign up at https://sentry.io
   - Create a new Next.js project
   - Copy the DSN to `.env`

2. **Configure Environment**
   ```bash
   # Copy .env.example to .env
   # Add your Sentry DSN
   NEXT_PUBLIC_SENTRY_DSN="your-dsn-here"
   ```

3. **Set Up Alerts**
   - Critical payment errors → Slack/Email
   - Cron job failures → PagerDuty
   - Fraud alerts → Admin team
   - API error spikes → Dev team

4. **Create Dashboards**
   - Payment health dashboard
   - Auction operations monitoring
   - Cron job status
   - Fraud detection overview

5. **Test Integration**
   ```bash
   # Development mode (Sentry disabled by default)
   npm run dev

   # Production build
   npm run build
   ```

6. **Deploy**
   - Add Sentry env vars to Vercel/hosting
   - Verify source maps upload in build logs
   - Check Sentry dashboard for first events

## Monitoring Best Practices

1. **Weekly Error Review** - Review and triage new errors
2. **Alert Tuning** - Adjust alert thresholds based on traffic
3. **Release Tracking** - Tag deploys with git commit SHA
4. **Performance Budgets** - Set performance baselines
5. **User Feedback** - Enable user feedback widget for errors

## Cost Management

Sentry pricing tiers:
- **Developer** (Free): 5K errors/month
- **Team** ($26/mo): 50K errors/month
- **Business** ($80/mo): 500K errors/month

Current configuration:
- 10% performance sample rate → ~10% of requests tracked
- 10% session replay → ~10% of sessions recorded
- 100% error replay → All error sessions recorded

Adjust sample rates in configuration files to manage costs.

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Integration Issues**: Check `SENTRY_SETUP.md`
- **Questions**: Team Slack #platform-monitoring

## Files Modified/Created

### Created
- ✅ `sentry.client.config.ts` - Client configuration
- ✅ `src/instrumentation.ts` - Server/Edge configuration
- ✅ `src/lib/sentry.ts` - Helper functions (390 lines)
- ✅ `SENTRY_SETUP.md` - Full documentation
- ✅ `SENTRY_INTEGRATION_SUMMARY.md` - This file
- ✅ `.sentryclirc` - CLI configuration template

### Modified
- ✅ `next.config.mjs` - Added Sentry wrapper and config
- ✅ `src/lib/auth.ts` - User context tracking
- ✅ `src/middleware.ts` - Error capture
- ✅ `src/lib/with-error-handler.ts` - Automatic error capture
- ✅ `src/app/api/payments/deposit/route.ts` - Example integration
- ✅ `src/app/api/cron/end-auctions/route.ts` - Example integration
- ✅ `.env.example` - Environment variable examples
- ✅ `.gitignore` - Ignore Sentry config files
- ✅ `package.json` - Added @sentry/nextjs dependency

## Status

- ✅ Package installed
- ✅ Configuration files created
- ✅ Helper library implemented
- ✅ Core integrations complete
- ✅ Example routes updated
- ✅ Documentation written
- ⏳ **Pending**: Sentry account setup and DSN configuration
- ⏳ **Pending**: Build verification after dependency fixes
- ⏳ **Pending**: Production deployment and testing

---

**Integration Complete!** Ready for Sentry account setup and deployment.
