# Sentry Quick Reference

Quick copy-paste examples for common Sentry usage patterns.

## Import Statements

```typescript
// Most common
import { capturePaymentError, captureAuctionError } from '@/lib/sentry'

// All available functions
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
  trackPerformance,
  captureMessage,
} from '@/lib/sentry'
```

## Payment Errors

```typescript
try {
  const paymentIntent = await stripe.paymentIntents.create({...})
} catch (error) {
  capturePaymentError(error as Error, {
    userId: session.user.id,
    amount: 5000, // in cents
    currency: 'RON',
    type: 'deposit', // 'deposit' | 'fee' | 'payout' | 'refund' | 'setup'
    paymentIntentId: 'pi_xxx',
    paymentMethodId: 'pm_xxx',
    auctionId: 'auction-123',
    metadata: { customField: 'value' },
  })
  throw error
}
```

## Auction Errors

```typescript
try {
  await placeBid(auctionId, userId, amount)
} catch (error) {
  captureAuctionError(error as Error, {
    auctionId: 'auction-123',
    listingId: 'listing-456',
    sellerId: 'user-789',
    currentBid: 1000,
    bidCount: 5,
    status: 'ACTIVE',
    endTime: auction.endTime,
    operation: 'bid', // 'create' | 'bid' | 'end' | 'cancel' | 'activate'
    metadata: { bidAmount: amount },
  })
  throw error
}
```

## Listing Errors

```typescript
try {
  await createListing(data)
} catch (error) {
  captureListingError(error as Error, {
    listingId: 'listing-123',
    sellerId: session.user.id,
    title: 'Vintage Watch',
    status: 'DRAFT',
    operation: 'create', // 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'media_upload'
    metadata: { ...data },
  })
  throw error
}
```

## Authentication Errors

```typescript
try {
  await sendVerificationEmail(email)
} catch (error) {
  captureAuthError(error as Error, {
    email: email,
    operation: 'verify', // 'login' | 'register' | 'verify' | 'reset_password' | 'forgot_password'
    userId: user?.id,
    metadata: { attempt: 3 },
  })
  throw error
}
```

## Fraud Alerts

```typescript
if (fraudScore > 80) {
  captureFraudAlert(new Error('High fraud risk detected'), {
    userId: user.id,
    auctionId: auction.id,
    fraudType: 'rapid_bidding', // or 'shill_bidding', 'account_creation', etc.
    riskScore: fraudScore,
    indicators: ['new_account', 'multiple_bids_same_minute'],
    metadata: { ipAddress, userAgent },
  })
}
```

## Database Errors

```typescript
try {
  await prisma.auction.update({...})
} catch (error) {
  captureDatabaseError(error as Error, {
    operation: 'update',
    model: 'Auction',
    metadata: { auctionId: 'auction-123' },
  })
  throw error
}
```

## API Errors (Manual Capture)

```typescript
// For routes NOT using withErrorHandler
try {
  // ... your logic
} catch (error) {
  captureAPIError(error as Error, {
    route: '/api/custom/route',
    method: 'POST',
    statusCode: 500,
    userId: session?.user?.id,
    metadata: { customContext: 'value' },
  })

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Cron Job Errors

```typescript
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ... cron job logic
  } catch (error) {
    captureCronError(error as Error, {
      jobName: 'process-payments',
      startTime: new Date(startTime),
      metadata: {
        recordsProcessed: count,
        failures: failures,
      },
    })

    return NextResponse.json(
      { error: 'Job failed' },
      { status: 500 }
    )
  }
}
```

## Performance Tracking

```typescript
// Track performance of critical operations
const result = await trackPerformance(
  'auction.bid.placement',
  async () => {
    return await placeBid(auctionId, userId, amount)
  },
  {
    auctionId,
    userId,
    bidAmount: amount,
  }
)
```

## Informational Messages

```typescript
// Successful fraud prevention
captureMessage(
  'Blocked suspicious bid attempt',
  'warning',
  {
    userId: user.id,
    auctionId: auction.id,
    fraudScore: score,
  }
)

// Important system events
captureMessage(
  'Auction ended successfully',
  'info',
  {
    auctionId: auction.id,
    finalPrice: price,
    winnerId: winner.id,
  }
)
```

## API Routes with Auto-Capture

```typescript
// Use withErrorHandler - automatically captures ALL errors
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'

export const POST = withErrorHandler(
  async (request, { params }) => {
    // Your code here
    // Any thrown error is automatically captured with full context

    return successResponse({ data })
  },
  {
    resourceType: 'auction',
    action: 'auction.create',
    requiresAuth: true,
  }
)
```

## User Context

```typescript
// Set user context (done automatically in auth callbacks)
setUserContext({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
})

// Clear user context (on logout)
clearUserContext()
```

## Error Severity Levels

```typescript
captureMessage('Info message', 'info')      // Informational
captureMessage('Warning', 'warning')        // Warning
captureMessage('Error occurred', 'error')   // Error (default)
captureMessage('Critical!', 'critical')     // Critical
```

## Custom Tags (for filtering in Sentry)

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.withScope(scope => {
  scope.setTag('feature', 'bidding')
  scope.setTag('user_type', 'premium')
  Sentry.captureException(error)
})
```

## Testing Sentry

```typescript
// Trigger a test error (remove after testing)
throw new Error('Test Sentry integration')

// Or log a test message
captureMessage('Testing Sentry integration', 'info')
```

## When to Use Each Function

| Function | When to Use |
|----------|-------------|
| `capturePaymentError` | Stripe operations, deposits, fees, payouts |
| `captureAuctionError` | Bid placement, auction ending, activation |
| `captureListingError` | Creating/updating listings, media upload |
| `captureAuthError` | Login, registration, email verification |
| `captureAdminError` | Admin actions, moderation, reviews |
| `captureFraudAlert` | Fraud detection, suspicious activity |
| `captureDatabaseError` | Direct Prisma errors (rare - usually auto-captured) |
| `captureAPIError` | Routes NOT using `withErrorHandler` |
| `captureCronError` | Scheduled job failures |
| `trackPerformance` | Critical operation performance |
| `captureMessage` | Info/warning messages, successful events |

## Common Patterns

### Try-Catch with Capture

```typescript
try {
  await riskyOperation()
} catch (error) {
  // Capture with context
  captureXxxError(error as Error, { ...context })

  // Still handle the error normally
  throw error // or return error response
}
```

### Conditional Capture

```typescript
if (condition) {
  captureMessage('Unusual condition detected', 'warning', {
    context: 'value',
  })
}
```

### Non-Blocking Alerts

```typescript
// Don't throw, just alert
if (isHighRisk) {
  captureFraudAlert(new Error('High risk transaction'), { ...context })
  // Continue execution
}
```

---

For full documentation, see `SENTRY_SETUP.md`
