# Error Handling System - Finds Auction Platform

## Overview

This document describes the comprehensive error handling system implemented for the Finds auction platform. The system provides:

- **Typed error classes** with proper HTTP status codes
- **Standardized API responses** with consistent structure
- **Automatic error logging** and audit trail
- **Request ID tracking** for debugging
- **Zod validation** error handling
- **Type-safe error codes** and messages

## Architecture

### Core Components

1. **`/src/lib/error-codes.ts`** - Error code constants and messages
2. **`/src/lib/errors.ts`** - Custom error class hierarchy
3. **`/src/lib/api-response.ts`** - Standardized response helpers
4. **`/src/lib/with-error-handler.ts`** - Higher-order function wrapper for routes

## Error Classes

### Base Class: `AppError`

All custom errors extend from `AppError`:

```typescript
export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>
  public readonly timestamp: string
  public readonly isOperational: boolean
}
```

### Error Types

#### Authentication & Authorization

- **`UnauthorizedError`** (401) - Authentication required
- **`ForbiddenError`** (403) - Insufficient permissions

#### Validation

- **`ValidationError`** (400) - Request validation failed

#### Resources

- **`NotFoundError`** (404) - Resource not found

#### Payment

- **`PaymentError`** (402) - Payment processing failed
- **`InsufficientDepositError`** (402) - Deposit required or insufficient

#### Rate Limiting

- **`RateLimitError`** (429) - Too many requests

#### Fraud & Security

- **`FraudDetectedError`** (403) - Suspicious activity detected

#### Business Logic

- **`AuctionClosedError`** (400) - Auction is closed
- **`AuctionStateError`** (400) - Auction not in expected state
- **`BidValidationError`** (400) - Bid validation failed
- **`ConflictError`** (409) - Resource conflict (e.g., duplicate user)

#### System

- **`InternalServerError`** (500) - Unexpected server error
- **`DatabaseError`** (500) - Database operation failed
- **`ExternalServiceError`** (500) - External service call failed

## Error Codes

Error codes follow the pattern `CATEGORY_SPECIFIC_ERROR`:

```typescript
// Authentication
AUTH_REQUIRED
AUTH_EMAIL_NOT_VERIFIED
AUTH_BIDDING_DISABLED

// Validation
VALIDATION_INVALID_INPUT
VALIDATION_INVALID_AMOUNT

// Resources
USER_NOT_FOUND
AUCTION_NOT_FOUND

// Payments
PAYMENT_FAILED
DEPOSIT_REQUIRED

// Fraud
FRAUD_DETECTED
FRAUD_RATE_LIMIT_EXCEEDED

// Auctions
AUCTION_NOT_ACTIVE
AUCTION_ENDED
BID_TOO_LOW

// Rate Limiting
RATE_LIMIT_EXCEEDED
```

See `/src/lib/error-codes.ts` for the complete list.

## API Response Format

### Success Response

```typescript
{
  success: true,
  data: { /* your data */ },
  requestId: "abc123...",
  timestamp: "2025-12-25T10:00:00.000Z"
}
```

### Error Response

```typescript
{
  success: false,
  error: {
    message: "User-friendly error message",
    code: "ERROR_CODE",
    statusCode: 400,
    details: { /* optional error details */ },
    requestId: "abc123...",
    timestamp: "2025-12-25T10:00:00.000Z"
  }
}
```

### Action Required Response

For operations requiring client action (e.g., 3DS authentication):

```typescript
{
  success: true,
  data: {
    requiresAction: true,
    message: "Payment authentication required",
    clientSecret: "pi_xxx_secret_yyy",
    paymentIntentId: "pi_xxx"
  },
  requestId: "abc123...",
  timestamp: "2025-12-25T10:00:00.000Z"
}
```

## Usage Guide

### Basic Route with Error Handling

```typescript
import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

export const GET = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const { id } = await params
    const data = await fetchData(id)

    if (!data) {
      throw new NotFoundError(
        'Resource not found',
        ERROR_CODES.RESOURCE_NOT_FOUND
      )
    }

    return successResponse(data)
  },
  {
    requiresAuth: true,
    auditLog: true,
    resourceType: 'auction',
    action: 'auction.view',
  }
)
```

### Simple Route (No Params)

```typescript
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const data = await processRequest(request)
    return successResponse(data, 201)
  },
  {
    requiresAuth: true,
    resourceType: 'listing',
    action: 'listing.create',
  }
)
```

### Throwing Errors with Details

```typescript
// Simple error
throw new ValidationError('Invalid input')

// Error with specific code
throw new ValidationError(
  'Invalid amount',
  ERROR_CODES.VALIDATION_INVALID_AMOUNT
)

// Error with details
throw new FraudDetectedError(
  'Suspicious activity detected',
  ERROR_CODES.FRAUD_DETECTED,
  {
    userId: user.id,
    ipAddress: '1.2.3.4',
    alertCount: 5
  }
)
```

### Converting Service Errors

Sometimes service functions throw generic `Error` objects. Convert them to typed errors:

```typescript
try {
  await placeBid(auctionId, userId, amount)
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('not active')) {
      throw new AuctionStateError(
        error.message,
        ERROR_CODES.AUCTION_NOT_ACTIVE
      )
    }
    if (error.message.includes('Bid must be at least')) {
      throw new BidValidationError(
        error.message,
        ERROR_CODES.BID_TOO_LOW
      )
    }
  }
  throw error
}
```

### Zod Validation

Zod errors are automatically converted to `ValidationError`:

```typescript
const schema = z.object({
  amount: z.number().positive(),
  email: z.string().email(),
})

// This will automatically throw ValidationError if invalid
const { amount, email } = schema.parse(body)
```

### Action Required Responses

For payment flows requiring 3DS authentication:

```typescript
import { actionRequiredResponse } from '@/lib/api-response'

if (paymentResult.requiresAction) {
  return actionRequiredResponse(
    'Additional authentication required',
    {
      clientSecret: paymentResult.clientSecret,
      paymentIntentId: paymentResult.paymentIntent?.id,
    }
  )
}
```

## Error Handler Options

The `withErrorHandler` function accepts these options:

```typescript
interface ErrorHandlerOptions {
  // Whether to log errors to the audit log (default: true for authenticated routes)
  auditLog?: boolean

  // Custom error handler function called before the default handler
  onError?: (error: unknown, requestId: string, request: NextRequest) => void | Promise<void>

  // Whether this route requires authentication
  requiresAuth?: boolean

  // Resource type for audit logging
  resourceType?: string

  // Action name for audit logging
  action?: string
}
```

### Example with Custom Error Handler

```typescript
export const POST = withErrorHandler(
  async (request) => {
    // ... handler code
  },
  {
    requiresAuth: true,
    resourceType: 'payment',
    action: 'payment.charge',
    onError: async (error, requestId, request) => {
      // Custom logging or notification
      await notifyAdmins({
        error,
        requestId,
        url: request.url,
      })
    },
  }
)
```

## Logging and Monitoring

### Automatic Logging

The error handler automatically:

1. **Logs to console** with appropriate severity
   - Client errors (4xx): `console.warn()`
   - Server errors (5xx): `console.error()` with stack trace

2. **Creates audit log entries** (when `auditLog: true`)
   - Logs successful requests with duration
   - Logs failed requests with error details
   - Includes request ID for tracking

3. **Adds request tracking headers**
   - `X-Request-ID` header on all responses

### Request ID Tracking

Every request gets a unique ID for tracking:

```typescript
// Automatically generated
const requestId = generateRequestId() // e.g., "a3f8d9e2b1c4..."

// Available in response headers
X-Request-ID: a3f8d9e2b1c4...

// Included in response body
{
  success: true,
  requestId: "a3f8d9e2b1c4...",
  // ...
}
```

## Error Utilities

### Type Guards

```typescript
import { isAppError, isOperationalError } from '@/lib/errors'

if (isAppError(error)) {
  console.log(error.code, error.statusCode)
}

if (isOperationalError(error)) {
  // This is an expected business logic error
}
```

### Error Conversion

```typescript
import { toAppError, getErrorMessage } from '@/lib/errors'

// Convert any error to AppError
const appError = toAppError(unknownError)

// Safely extract error message
const message = getErrorMessage(unknownError)
```

## Migration Guide

### Converting Existing Routes

#### Before

```typescript
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await processData()
    return NextResponse.json({ data })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
```

#### After

```typescript
import { NextRequest } from 'next/server'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const data = await processData()
    return successResponse(data)
  },
  {
    requiresAuth: true,
    resourceType: 'resource',
    action: 'resource.action',
  }
)
```

## Best Practices

1. **Use specific error types** instead of generic errors
   - ✅ `throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND)`
   - ❌ `throw new Error('Not found')`

2. **Include error codes** for programmatic handling
   ```typescript
   throw new ValidationError(
     'Invalid amount',
     ERROR_CODES.VALIDATION_INVALID_AMOUNT
   )
   ```

3. **Add relevant details** for debugging
   ```typescript
   throw new PaymentError(
     'Payment failed',
     ERROR_CODES.PAYMENT_FAILED,
     {
       paymentIntentId: 'pi_xxx',
       amount: 1000,
       currency: 'USD',
     }
   )
   ```

4. **Let the wrapper handle logging** - don't manually log in handlers
   - The error wrapper automatically logs with proper context

5. **Use `successResponse()` consistently**
   - Ensures consistent response format
   - Includes request ID tracking

6. **Enable audit logging for important operations**
   ```typescript
   {
     requiresAuth: true,
     auditLog: true,  // ✅ Track important operations
     resourceType: 'auction',
     action: 'auction.bid.place',
   }
   ```

## Updated Routes

The following routes have been updated to use the new error handling system:

1. **`/api/auctions/[id]/bids/route.ts`**
   - GET: Bid history retrieval
   - POST: Place a bid with fraud checks and deposit validation

2. **`/api/payments/charge-fee/route.ts`**
   - POST: Charge buyer fee with 3DS support

3. **`/api/auth/register/route.ts`**
   - POST: User registration with rate limiting

## Examples from Real Routes

### Bid Placement (Complex)

```typescript
export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError('You must be logged in to place a bid')
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { biddingEnabled: true, emailVerified: true },
    })

    if (!user) {
      throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND)
    }

    if (!user.emailVerified) {
      throw new ForbiddenError(
        'Please verify your email before bidding',
        ERROR_CODES.AUTH_EMAIL_NOT_VERIFIED
      )
    }

    // ... more logic
    return successResponse({ bid, auction })
  },
  {
    requiresAuth: true,
    auditLog: true,
    resourceType: 'auction',
    action: 'auction.bid.place',
  }
)
```

### Payment with 3DS

```typescript
const result = await container.fees.chargeBuyerFee(auctionId, userId)

if (!result.success) {
  if (result.requiresAction) {
    return actionRequiredResponse(
      'Additional authentication required',
      {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntent?.id,
      }
    )
  }

  throw new PaymentError(
    result.error || 'Payment processing failed',
    ERROR_CODES.PAYMENT_FAILED
  )
}

return successResponse({
  paymentIntentId: result.paymentIntent?.id,
  message: 'Payment processed successfully',
})
```

## Testing

### Testing Error Responses

```typescript
// Client-side handling
const response = await fetch('/api/endpoint', { method: 'POST' })
const data = await response.json()

if (!data.success) {
  // Handle error
  console.error(data.error.message)
  console.error(data.error.code) // Use for programmatic handling

  if (data.error.code === 'DEPOSIT_REQUIRED') {
    // Show deposit UI
  }
}
```

### Testing with curl

```bash
# Success response
curl -X GET https://api.example.com/auctions/123/bids
{
  "success": true,
  "data": { "bids": [...] },
  "requestId": "abc123",
  "timestamp": "2025-12-25T10:00:00.000Z"
}

# Error response
curl -X POST https://api.example.com/auctions/123/bids
{
  "success": false,
  "error": {
    "message": "You must be logged in to place a bid",
    "code": "AUTH_REQUIRED",
    "statusCode": 401,
    "requestId": "def456",
    "timestamp": "2025-12-25T10:00:00.000Z"
  }
}
```

## Future Enhancements

Potential improvements to consider:

1. **Sentry Integration** - Automatic error reporting to Sentry
2. **Error Rate Monitoring** - Track error rates by endpoint
3. **Client Error SDK** - TypeScript SDK for frontend error handling
4. **Localized Error Messages** - i18n support for error messages
5. **Error Recovery Suggestions** - Actionable suggestions in error responses
6. **GraphQL Support** - Adapt error handling for GraphQL endpoints

## Support

For questions or issues:
- Check the inline documentation in each file
- Review the example routes
- Contact the development team
