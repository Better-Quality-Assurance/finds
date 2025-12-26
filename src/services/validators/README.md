# Status Validators

Centralized validators for all status-based business logic in the Finds platform.

## Overview

Status validators ensure consistent status checks across the application. Instead of scattering status comparison logic throughout the codebase, all status validation logic is centralized in dedicated validator classes.

## Benefits

1. **Consistency**: All status checks use the same logic
2. **Maintainability**: Adding new statuses only requires updating the validator
3. **Type Safety**: Validators use TypeScript enums for compile-time safety
4. **Readability**: `isEditable(status)` is clearer than `['DRAFT', 'CHANGES_REQUESTED'].includes(status)`
5. **Business Rules**: Validators document valid state transitions

## Available Validators

### ListingStatusValidator

Validates listing status and determines what actions are allowed.

```typescript
import { listingStatusValidator } from '@/services/validators'

// Check if listing can be edited
if (listingStatusValidator.isEditable(listing.status)) {
  // Allow editing
}

// Check if listing can be submitted for review
if (listingStatusValidator.canSubmitForReview(listing.status)) {
  // Allow submission
}

// Check if listing is under review
if (listingStatusValidator.isUnderReview(listing.status)) {
  // Show review status
}
```

**Available Methods:**
- `isEditable(status)` - Can edit listing (DRAFT, CHANGES_REQUESTED)
- `canSubmitForReview(status)` - Can submit for review (DRAFT, CHANGES_REQUESTED)
- `isUnderReview(status)` - Currently under review (PENDING_REVIEW)
- `isApproved(status)` - Has been approved (APPROVED)
- `isRejected(status)` - Has been rejected (REJECTED)
- `canApprove(status)` - Can be approved (PENDING_REVIEW)
- `canReject(status)` - Can be rejected (PENDING_REVIEW)
- `canRequestChanges(status)` - Can request changes (PENDING_REVIEW)
- `canWithdraw(status)` - Can be withdrawn (DRAFT, APPROVED, ACTIVE)
- `isTerminal(status)` - Cannot be changed (REJECTED, SOLD, WITHDRAWN, EXPIRED)
- `isActive(status)` - Currently in auction (ACTIVE)
- `getPossibleTransitions(status)` - Get valid next statuses
- `canTransitionTo(current, target)` - Validate status transition
- `getStatusDescription(status)` - Get human-readable description

### AuctionStatusValidator

Validates auction status and determines what actions are allowed.

```typescript
import { auctionStatusValidator } from '@/services/validators'

// Check if auction is active and accepting bids
if (auctionStatusValidator.canPlaceBid(auction.status)) {
  // Allow bid placement
}

// Check if auction has ended
if (auctionStatusValidator.isEnded(auction.status)) {
  // Show ended state
}

// Check if auction can be cancelled
if (auctionStatusValidator.canCancel(auction.status)) {
  // Allow cancellation
}
```

**Available Methods:**
- `isActive(status)` - Is active (ACTIVE, EXTENDED)
- `canPlaceBid(status)` - Can place bids (ACTIVE, EXTENDED)
- `isEnded(status)` - Has ended (ENDED, SOLD, NO_SALE, CANCELLED)
- `isScheduled(status)` - Is scheduled (SCHEDULED)
- `isExtended(status)` - Is in extended time (EXTENDED)
- `isSold(status)` - Successfully sold (SOLD)
- `isNoSale(status)` - Ended without sale (NO_SALE)
- `isCancelled(status)` - Was cancelled (CANCELLED)
- `isTerminal(status)` - Cannot be changed (SOLD, NO_SALE, CANCELLED)
- `canCancel(status)` - Can be cancelled (SCHEDULED, ACTIVE)
- `canExtend(status)` - Can be extended (ACTIVE, EXTENDED)
- `canStart(status)` - Can be started (SCHEDULED)
- `canEnd(status)` - Can end (ACTIVE, EXTENDED)
- `canProcessPayment(status)` - Can process payment (ENDED, SOLD)
- `isAwaitingPayment(status)` - Awaiting payment (ENDED)
- `getPossibleTransitions(status)` - Get valid next statuses
- `canTransitionTo(current, target)` - Validate status transition
- `getStatusDescription(status)` - Get human-readable description
- `getTransitionError(current, target)` - Get transition error message

## Usage Examples

### Before (scattered status checks)

```typescript
// DON'T DO THIS
if (!['DRAFT', 'CHANGES_REQUESTED'].includes(listing.status)) {
  throw new Error('Cannot edit listing')
}

if (auction.status !== 'ACTIVE') {
  throw new Error('Auction is not active')
}
```

### After (using validators)

```typescript
// DO THIS INSTEAD
import { listingStatusValidator, auctionStatusValidator } from '@/services/validators'

if (!listingStatusValidator.isEditable(listing.status)) {
  throw new Error('Cannot edit listing')
}

if (!auctionStatusValidator.canPlaceBid(auction.status)) {
  throw new Error('Auction is not accepting bids')
}
```

## Adding New Statuses

When adding a new status:

1. Add the status to the Prisma enum in `schema.prisma`
2. Run `npm run db:generate` to update Prisma types
3. Update the validator methods to include the new status where appropriate
4. Update `getPossibleTransitions()` to define valid transitions
5. Update `getStatusDescription()` to provide a human-readable description
6. Run tests to ensure all status checks still work

## Testing Status Transitions

The validators provide `canTransitionTo()` to validate state transitions:

```typescript
// Validate a status transition before performing it
if (!listingStatusValidator.canTransitionTo('DRAFT', 'PENDING_REVIEW')) {
  throw new Error('Invalid status transition')
}

// Get possible transitions for UI display
const nextStatuses = auctionStatusValidator.getPossibleTransitions(auction.status)
// Returns: ['ENDED', 'CANCELLED'] for ACTIVE auction
```

## Integration with Services

All service functions that check status should use validators:

```typescript
// listing.service.ts
import { listingStatusValidator } from '@/services/validators'

export async function updateListing(id: string, sellerId: string, input: UpdateListingInput) {
  const listing = await prisma.listing.findUnique({ where: { id } })

  if (!listingStatusValidator.isEditable(listing.status)) {
    throw new Error('Cannot edit listing in current status')
  }

  // ... perform update
}

// auction.service.ts
import { auctionStatusValidator } from '@/services/validators'

export async function placeBid(auctionId: string, bidderId: string, amount: number) {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } })

  if (!auctionStatusValidator.canPlaceBid(auction.status)) {
    throw new Error('Auction is not accepting bids')
  }

  // ... place bid
}
```

## Files Updated

The following files have been updated to use validators:

- `/Users/brad/Code2/finds/src/services/listing.service.ts`
- `/Users/brad/Code2/finds/src/services/auction.service.ts`
- `/Users/brad/Code2/finds/src/app/api/listings/[id]/media/route.ts`

Additional files may benefit from using validators. Search for:
- `.includes(status)` patterns
- `status === 'CONSTANT'` patterns
- Direct status comparisons
