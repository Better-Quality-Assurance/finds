# Manual Update Required

## File: `/src/app/api/auctions/[id]/bids/route.ts`

Due to auto-formatting conflicts, one console.error statement needs manual replacement:

### Location: Line 213 (approximately)

**Current code:**
```typescript
      .catch(error => {
        console.error('Failed to notify watchers about new bid:', error)
      })

    return successResponse({
```

**Replace with:**
```typescript
      .catch(error => {
        logError(
          auctionLogger,
          'Failed to notify watchers about new bid',
          error,
          { auctionId: id, bidId: bid.id }
        )
      })

    auctionLogger.info({
      auctionId: id,
      bidderId: session.user.id,
      bidAmount: Number(bid.amount),
      extended,
      reserveMet: auction.reserveMet,
    }, 'Bid placed successfully')

    return successResponse({
```

### Steps:
1. Add import at top if not present:
   ```typescript
   import { auctionLogger, logError } from '@/lib/logger'
   ```

2. Replace the console.error on line ~213

3. Add the success logging before the return statement

This will complete the structured logging implementation for all bid-related operations.
