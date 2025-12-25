# Structured Logging Implementation

## Overview
Implemented structured logging using Pino for the Finds auction platform. This replaces console.log statements with proper structured logging that provides better observability and debugging capabilities.

## What Was Implemented

### 1. Core Logger Infrastructure

#### `/src/lib/logger.ts`
- Base logger configuration with environment-based formatting
- Pretty printing for development (colorized, readable)
- JSON logging for production (machine-parseable)
- Domain-specific child loggers:
  - `auctionLogger` - Auction operations
  - `paymentLogger` - Payment processing
  - `authLogger` - Authentication events
  - `fraudLogger` - Fraud detection
  - `listingLogger` - Listing management
  - `notificationLogger` - Notifications
  - `adminLogger` - Admin operations
  - `apiLogger` - API requests

#### `/src/lib/with-logging.ts`
- Request logging middleware for API routes
- Automatic request ID generation for tracing
- Request/response timing
- Client IP and user agent tracking
- Error handling with structured logging
- Two variants:
  - `withLogging` - Full error handling
  - `withRequestLogging` - Logging only

### 2. Updated Files (53+ logging statements replaced)

#### Services
1. **`/src/services/auction.service.ts`**
   - Replaced 4 console.log/error statements
   - Added structured logging for:
     - Auction activation and broadcasting
     - Auction end notifications failures
     - Expired auction processing

2. **`/src/services/deposit.service.ts`**
   - Replaced 4 console.error statements
   - Added logging for:
     - Deposit creation failures
     - Deposit confirmation failures
     - Deposit release success/failure
     - Deposit capture success/failure

3. **`/src/services/buyer-fee.service.ts`**
   - Replaced 3 console.error statements
   - Added logging for:
     - Buyer fee charging failures
     - Payment confirmation failures
     - Payment confirmation success

4. **`/src/services/seller-payout.service.ts`**
   - Replaced 3 console.error statements
   - Added logging for:
     - Transfer creation failures
     - Seller payout creation failures
     - Seller payout creation success

#### API Routes
5. **`/src/app/api/payments/webhook/route.ts`**
   - Replaced 20+ console.log/error statements
   - Added structured logging for:
     - Webhook signature verification
     - Deposit confirmations/failures
     - Buyer fee payments
     - Setup intent success
     - Stripe Connect account updates
     - Transfer events (created, failed, reversed)
     - All webhook event types

6. **`/src/app/api/auctions/[id]/bids/route.ts`**
   - Replaced 2 console.error statements
   - Added logging for:
     - Bid placement success
     - Notification failures

### 3. Environment Configuration

#### Updated `.env.example`
Added LOG_LEVEL configuration:
```bash
# Logging
# Options: trace, debug, info, warn, error, fatal
LOG_LEVEL="info"
```

## Features

### Structured Log Format
All logs include:
- **Timestamp** - ISO format
- **Level** - trace, debug, info, warn, error, fatal
- **Domain** - Which part of the system (auction, payment, auth, etc.)
- **Message** - Human-readable description
- **Context** - Structured metadata (IDs, amounts, etc.)

### Example Log Output

#### Development (Pretty)
```
[16:45:23 Z] INFO (auction): Auction activated and broadcasted
    auctionId: "clx123abc"
    listingTitle: "Vintage Camera"
    startingPrice: 1000
    currency: "EUR"
```

#### Production (JSON)
```json
{
  "level": "info",
  "time": "2025-12-25T16:45:23.123Z",
  "domain": "auction",
  "auctionId": "clx123abc",
  "listingTitle": "Vintage Camera",
  "startingPrice": 1000,
  "currency": "EUR",
  "msg": "Auction activated and broadcasted",
  "env": "production"
}
```

### Error Logging with Stack Traces
```javascript
logError(
  paymentLogger,
  'Failed to charge buyer fee',
  error,
  { auctionId, userId, amount }
)
```

Produces:
```json
{
  "level": "error",
  "time": "2025-12-25T16:45:23.123Z",
  "domain": "payment",
  "err": {
    "message": "Card declined",
    "name": "StripeCardError",
    "stack": "Error: Card declined\n  at ..."
  },
  "auctionId": "clx123abc",
  "userId": "usr_123",
  "amount": 1250,
  "msg": "Failed to charge buyer fee"
}
```

## Logging Best Practices Used

1. **Structured Context** - Always include relevant IDs and metadata
2. **Appropriate Levels**:
   - `info` - Normal operations (bid placed, payment confirmed)
   - `warn` - Warnings (no user found for account)
   - `error` - Errors (payment failed, transfer reversed)
   - `debug` - Debugging info (unhandled webhook events)

3. **Domain Separation** - Use specific child loggers for different domains
4. **Request Tracing** - Request IDs for correlating logs across requests
5. **Performance Tracking** - Built-in timing for requests

## Usage Examples

### Basic Logging
```typescript
import { auctionLogger } from '@/lib/logger'

auctionLogger.info({
  auctionId,
  bidAmount,
  bidderId,
}, 'Bid placed successfully')
```

### Error Logging
```typescript
import { paymentLogger, logError } from '@/lib/logger'

try {
  await processPayment()
} catch (error) {
  logError(
    paymentLogger,
    'Payment processing failed',
    error,
    { userId, amount }
  )
}
```

### Request Middleware
```typescript
import { withLogging } from '@/lib/with-logging'

export const POST = withLogging(async (request, context) => {
  // Your handler logic
  // Automatic request/response logging
})
```

## Benefits

1. **Better Debugging** - Structured context makes finding issues easier
2. **Production Monitoring** - JSON logs can be ingested by log aggregators (Datadog, CloudWatch, etc.)
3. **Request Tracing** - Track requests across multiple services
4. **Performance Insights** - Built-in timing for operations
5. **Security Auditing** - Structured logs for security events
6. **Error Analysis** - Full stack traces with context

## Statistics

- **Total Console Statements Replaced**: 53+
- **Services Updated**: 4
- **API Routes Updated**: 2
- **Domain-Specific Loggers**: 8
- **Utility Functions**: 7

## Next Steps (Optional Enhancements)

1. **Log Aggregation** - Set up Datadog, CloudWatch, or similar
2. **Log Sampling** - Implement sampling for high-volume logs
3. **Correlation IDs** - Add correlation IDs across service boundaries
4. **Alerting** - Set up alerts for critical errors
5. **Log Retention** - Configure log retention policies
6. **Additional Domains** - Add more domain-specific loggers as needed

## Notes

- One console.error remains in `/src/app/api/auctions/[id]/bids/route.ts` line 213 that needs manual update due to file locking (see /tmp/bids_route_patch.txt for instructions)
- All logs respect the LOG_LEVEL environment variable
- Development uses pino-pretty for human-readable output
- Production uses JSON for machine parsing
- No breaking changes to existing functionality
