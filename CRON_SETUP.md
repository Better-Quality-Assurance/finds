# Cron Jobs Setup Guide

This document explains how to set up and configure the automated cron jobs for the Finds auction platform.

## Overview

The platform uses Vercel Cron to automatically handle auction lifecycle transitions:

1. **Activate Auctions** - Activates scheduled auctions when their start time arrives
2. **End Auctions** - Ends active auctions when their end time is reached
3. **Release Deposits** - Releases bid deposits after 30 days

## Configuration

### 1. Environment Variables

Add the following environment variable to your Vercel project and local `.env.local`:

```bash
# Cron Security Secret
# Generate a secure random string (e.g., using `openssl rand -base64 32`)
CRON_SECRET=your-super-secret-cron-token-here
```

**Important:** Use a strong, randomly generated secret. This protects your cron endpoints from unauthorized access.

### 2. Vercel Configuration

The `vercel.json` file is already configured with the following cron schedules:

```json
{
  "crons": [
    {
      "path": "/api/cron/activate-auctions",
      "schedule": "* * * * *"  // Every minute
    },
    {
      "path": "/api/cron/end-auctions",
      "schedule": "* * * * *"  // Every minute
    },
    {
      "path": "/api/cron/release-deposits",
      "schedule": "0 * * * *"  // Every hour
    }
  ]
}
```

### 3. Vercel Deployment

1. Ensure your project is deployed to Vercel
2. Add the `CRON_SECRET` environment variable in your Vercel project settings
3. Redeploy to activate the cron jobs

## Cron Job Details

### Activate Auctions (`/api/cron/activate-auctions`)

**Schedule:** Every minute
**Purpose:** Transitions SCHEDULED auctions to ACTIVE when their startTime has passed

**Actions:**
- Finds all auctions with status=SCHEDULED and startTime <= now
- Updates their status to ACTIVE
- Broadcasts `AUCTION_STARTING` event via Pusher to auction channel
- Logs audit event for each activation

**Response:**
```json
{
  "success": true,
  "activatedCount": 2,
  "auctions": [
    {
      "id": "auction_123",
      "listingTitle": "1967 Ford Mustang",
      "startTime": "2025-12-25T10:00:00Z"
    }
  ],
  "executionTimeMs": 145
}
```

### End Auctions (`/api/cron/end-auctions`)

**Schedule:** Every minute
**Purpose:** Ends ACTIVE auctions when their currentEndTime has passed

**Actions:**
- Finds all auctions with status=ACTIVE and currentEndTime <= now
- Determines final status (SOLD if reserve met, NO_SALE otherwise)
- Updates listing status to SOLD or EXPIRED
- Broadcasts `AUCTION_ENDED` event via Pusher to auction channel
- Notifies winner via private Pusher channel (if sold)
- Notifies watchlist users via private Pusher channels
- Logs detailed audit events

**Response:**
```json
{
  "success": true,
  "totalAuctions": 3,
  "successCount": 3,
  "failureCount": 0,
  "results": [
    {
      "auctionId": "auction_456",
      "listingTitle": "1967 Ford Mustang",
      "status": "SOLD",
      "finalPrice": 45000,
      "winnerId": "user_789",
      "success": true
    }
  ],
  "executionTimeMs": 320
}
```

### Release Deposits (`/api/cron/release-deposits`)

**Schedule:** Every hour
**Purpose:** Releases bid deposits that have been held for more than 30 days

**Actions:**
- Finds all deposits with status=HELD and heldAt <= 30 days ago
- Cancels the Stripe payment intent
- Updates deposit status to RELEASED
- Logs audit event for each release

**Response:**
```json
{
  "success": true,
  "totalDeposits": 5,
  "successCount": 5,
  "failureCount": 0,
  "totalAmountReleased": 2500.00,
  "currency": "EUR",
  "results": [
    {
      "depositId": "deposit_123",
      "userId": "user_456",
      "userEmail": "buyer@example.com",
      "amount": 500.00,
      "heldAt": "2025-11-25T10:00:00Z",
      "success": true
    }
  ],
  "executionTimeMs": 890
}
```

## Security

All cron endpoints are protected by the `CRON_SECRET` environment variable:

```
Authorization: Bearer YOUR_CRON_SECRET
```

Vercel automatically includes this header when calling cron jobs. Manual calls without the correct secret will receive a 401 Unauthorized response and be logged as security events.

## Monitoring & Audit Logs

All cron job executions are logged to the audit system:

- **Success/Failure status** for each job run
- **Execution time** in milliseconds
- **Detailed results** including affected auctions/deposits
- **Error messages** for any failures

View audit logs at: `/admin/audit` (requires ADMIN role)

Filter by:
- **Action:** `CRON_JOB_EXECUTED`, `AUCTION_STARTED`, `AUCTION_ENDED`, `DEPOSIT_RELEASED`
- **Resource Type:** `CRON`, `AUCTION`, `BID_DEPOSIT`
- **Severity:** `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **Status:** `SUCCESS`, `FAILURE`, `BLOCKED`

## Real-time Events

### Public Auction Channel Events

Events broadcast to `auction-{auctionId}` channel:

1. **AUCTION_STARTING**
   ```typescript
   {
     auctionId: string
     listingId: string
     listingTitle: string
     startingPrice: number
     currentEndTime: string
   }
   ```

2. **AUCTION_ENDED**
   ```typescript
   {
     auctionId: string
     status: 'SOLD' | 'NO_SALE' | 'CANCELLED'
     finalPrice: number | null
     winnerId: string | null
   }
   ```

### Private User Notification Events

Events broadcast to `private-user-{userId}-notifications` channel:

1. **auction-won** (Winner notification)
   ```typescript
   {
     auctionId: string
     listingTitle: string
     finalPrice: number
     buyerFee: number
   }
   ```

2. **watchlist-ended** (Watchlist notification)
   ```typescript
   {
     auctionId: string
     listingTitle: string
     status: 'SOLD' | 'NO_SALE' | 'CANCELLED'
     finalPrice: number | null
   }
   ```

## Testing Cron Jobs Locally

You can manually trigger cron jobs for testing:

```bash
# Set your CRON_SECRET
export CRON_SECRET="your-secret-here"

# Activate auctions
curl -X GET http://localhost:3000/api/cron/activate-auctions \
  -H "Authorization: Bearer $CRON_SECRET"

# End auctions
curl -X GET http://localhost:3000/api/cron/end-auctions \
  -H "Authorization: Bearer $CRON_SECRET"

# Release deposits
curl -X GET http://localhost:3000/api/cron/release-deposits \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Troubleshooting

### Cron jobs not running

1. Check that `vercel.json` is in the project root
2. Verify `CRON_SECRET` is set in Vercel environment variables
3. Check Vercel deployment logs for cron execution
4. Ensure your Vercel plan supports cron jobs

### Authentication errors

1. Verify `CRON_SECRET` matches in both local and Vercel environments
2. Check audit logs for `CRON_UNAUTHORIZED` events
3. Ensure the Authorization header is being sent correctly

### Auctions not ending/starting

1. Check auction status in database (should be SCHEDULED or ACTIVE)
2. Verify startTime/currentEndTime values are correct
3. Review audit logs for specific error messages
4. Check Pusher configuration for real-time events

### Deposits not releasing

1. Verify deposits have status=HELD and heldAt is set
2. Check Stripe dashboard for payment intent status
3. Review audit logs for Stripe API errors
4. Ensure STRIPE_SECRET_KEY is configured correctly

## Production Considerations

### Scaling

- **Batch processing:** Release deposits job processes max 100 at a time to avoid timeouts
- **Concurrent execution:** Jobs may overlap if processing takes longer than schedule interval
- **Database indexes:** Ensure indexes exist on `auctions(status, startTime)`, `auctions(status, currentEndTime)`, `bid_deposits(status, heldAt)`

### Performance

- Expected execution times:
  - Activate auctions: 100-300ms (depends on number of auctions)
  - End auctions: 200-500ms per auction (includes Pusher broadcasts)
  - Release deposits: 500-1000ms per deposit (includes Stripe API calls)

### Error Handling

- Individual failures don't stop batch processing
- All errors are logged with full context
- Failed operations can be retried manually via admin panel
- Critical failures trigger high-severity audit logs

## Support

For issues or questions:
1. Check audit logs at `/admin/audit`
2. Review Vercel deployment logs
3. Check Stripe dashboard for payment issues
4. Contact development team with audit log IDs
