# Payment Service Refactoring

## Overview

The large `payment.service.ts` (959 lines) has been split into three focused services following the Single Responsibility Principle:

1. **Deposit Service** - Handles bid deposit management
2. **Buyer Fee Service** - Handles buyer fee charging and payment
3. **Seller Payout Service** - Handles seller payouts via Stripe Connect

## New Service Structure

```
src/services/
├── deposit.service.ts           # Bid deposit management (469 lines)
├── buyer-fee.service.ts         # Buyer fee payment (365 lines)
├── seller-payout.service.ts     # Seller payout handling (273 lines)
├── payment.service.ts           # Backward compatibility layer (93 lines)
└── contracts/
    └── payment.interface.ts     # All payment-related interfaces
```

## Service Details

### 1. Deposit Service (`deposit.service.ts`)

**Responsibility:** Manage bid deposits for auction participation

**Class:** `DepositService implements IBidDepositService`

**Methods:**
- `enableBidding(userId)` - Enable bidding for a user
- `setupBiddingPayment(user)` - Set up Stripe customer and return SetupIntent
- `checkBiddingEligibility(userId)` - Check if user can bid
- `createBidDeposit(params)` - Create/update bid deposit
- `confirmDeposit(depositId)` - Confirm pending deposit after 3DS
- `releaseBidDeposit(depositId)` - Release deposit when outbid
- `captureBidDeposit(depositId)` - Capture deposit on win
- `releaseNonWinningDeposits(auctionId, winnerId?)` - Release all non-winning deposits
- `getUserDeposits(userId)` - Get user's active deposits
- `getAuctionDeposit(userId, auctionId)` - Get deposit for specific auction
- `hasValidDeposit(userId, auctionId)` - Check if user has valid deposit

**Factory:** `createDepositService(): DepositService`

**Usage:**
```typescript
import { DepositService, createDepositService } from '@/services/deposit.service'

// Option 1: Use factory
const depositService = createDepositService()
const result = await depositService.createBidDeposit({ userId, auctionId, bidAmount })

// Option 2: Use exported functions (backward compatible)
import { createBidDeposit } from '@/services/deposit.service'
const result = await createBidDeposit({ userId, auctionId, bidAmount })

// Option 3: Use dependency injection
import { DepositService } from '@/services/deposit.service'
class MyClass {
  constructor(private depositService: DepositService) {}
}
```

### 2. Buyer Fee Service (`buyer-fee.service.ts`)

**Responsibility:** Handle buyer fee charging after auction win

**Class:** `BuyerFeeService implements IBuyerFeeService`

**Methods:**
- `chargeBuyerFee(auctionId, userId)` - Charge buyer fee after win
- `confirmBuyerFeePayment(paymentIntentId)` - Confirm payment after 3DS
- `getAuctionPaymentStatus(auctionId)` - Get payment status and breakdown
- `setPaymentDeadline(auctionId)` - Set payment deadline when auction ends
- `checkOverduePayments()` - Check for overdue payments and handle defaults

**Factory:** `createBuyerFeeService(): BuyerFeeService`

**Usage:**
```typescript
import { BuyerFeeService, createBuyerFeeService } from '@/services/buyer-fee.service'

// Option 1: Use factory
const buyerFeeService = createBuyerFeeService()
const result = await buyerFeeService.chargeBuyerFee(auctionId, userId)

// Option 2: Use exported functions (backward compatible)
import { chargeBuyerFee } from '@/services/buyer-fee.service'
const result = await chargeBuyerFee(auctionId, userId)

// Option 3: Use dependency injection
import { BuyerFeeService } from '@/services/buyer-fee.service'
class MyClass {
  constructor(private buyerFeeService: BuyerFeeService) {}
}
```

### 3. Seller Payout Service (`seller-payout.service.ts`)

**Responsibility:** Handle seller payouts via Stripe Connect

**Class:** `SellerPayoutService implements ISellerPayoutService`

**Methods:**
- `createSellerPayout(auctionId)` - Create payout to seller's Connect account
- `getSellerPayoutStatus(auctionId)` - Get payout status for auction
- `retrySellerPayout(auctionId)` - Retry failed payout

**Factory:** `createSellerPayoutService(): SellerPayoutService`

**Usage:**
```typescript
import { SellerPayoutService, createSellerPayoutService } from '@/services/seller-payout.service'

// Option 1: Use factory
const sellerPayoutService = createSellerPayoutService()
const result = await sellerPayoutService.createSellerPayout(auctionId)

// Option 2: Use exported functions (backward compatible)
import { createSellerPayout } from '@/services/seller-payout.service'
const result = await createSellerPayout(auctionId)

// Option 3: Use dependency injection
import { SellerPayoutService } from '@/services/seller-payout.service'
class MyClass {
  constructor(private sellerPayoutService: SellerPayoutService) {}
}
```

## Backward Compatibility

The original `payment.service.ts` has been updated to re-export all functions from the new services, ensuring **100% backward compatibility**. Existing code will continue to work without changes:

```typescript
// This still works
import { createBidDeposit, chargeBuyerFee, createSellerPayout } from '@/services/payment.service'
```

## Migration Guide

### For New Code

Import from the specific service:

```typescript
// Before
import { createBidDeposit } from '@/services/payment.service'

// After (recommended)
import { createBidDeposit } from '@/services/deposit.service'
```

### For Existing Code

No changes required! The payment.service.ts re-exports everything.

### For Tests

Use the service classes for easier mocking:

```typescript
import { DepositService } from '@/services/deposit.service'

// Create mock
const mockDepositService: jest.Mocked<DepositService> = {
  createBidDeposit: jest.fn(),
  // ... other methods
}

// Or use dependency injection
class AuctionHandler {
  constructor(
    private depositService: DepositService,
    private buyerFeeService: BuyerFeeService
  ) {}
}

// In tests
const handler = new AuctionHandler(mockDepositService, mockBuyerFeeService)
```

## Dependency Injection

Each service accepts dependencies as constructor parameters:

```typescript
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'
import { DepositService } from '@/services/deposit.service'

const prisma = new PrismaClient()
const stripe = new Stripe(apiKey)

const depositService = new DepositService(prisma, stripe)
```

This enables:
- Easy testing with mocks
- Different configurations per environment
- Better testability and modularity

## Service Container

The dependency injection container (`src/lib/container.ts`) has been updated to use the new services:

```typescript
import { createDepositService, createBuyerFeeService, createSellerPayoutService } from '@/services/...'

const container = {
  deposits: createDepositService(),
  fees: createBuyerFeeService(),
  payouts: createSellerPayoutService(),
  // ... other services
}
```

## Type Safety

All services implement their corresponding interfaces from `@/services/contracts/payment.interface.ts`:

- `IBidDepositService`
- `IBuyerFeeService`
- `ISellerPayoutService`

Import types:

```typescript
import type {
  DepositResult,
  PaymentResult,
  PayoutResult,
  BiddingEligibility,
  PaymentStatusDetails,
  SellerPayoutStatus,
} from '@/services/contracts/payment.interface'
```

## Benefits

1. **Single Responsibility** - Each service has one clear purpose
2. **Easier Testing** - Smaller services are easier to test in isolation
3. **Better Maintainability** - Changes to deposits don't affect payouts
4. **Improved Readability** - ~350 lines vs 959 lines per file
5. **Type Safety** - Interfaces enforce contracts
6. **Dependency Injection** - Services accept dependencies, enabling mocking
7. **Backward Compatible** - Existing code continues to work

## File Sizes

| File | Lines | Responsibility |
|------|-------|----------------|
| `deposit.service.ts` | 469 | Bid deposit lifecycle |
| `buyer-fee.service.ts` | 365 | Buyer fee payment |
| `seller-payout.service.ts` | 273 | Seller payouts |
| `payment.service.ts` | 93 | Backward compatibility |
| **Total** | **1200** | (vs 959 in original) |

The slight increase in total lines is due to:
- Service class boilerplate (constructors, imports)
- Factory functions for each service
- Better separation of concerns
- More comprehensive documentation

## Next Steps

Consider:
1. Update API routes to use specific services instead of payment.service
2. Add unit tests for each service independently
3. Add integration tests for the complete payment flow
4. Consider adding a `PaymentOrchestrator` service to coordinate complex workflows
5. Add metrics/logging decorators to service methods

## Related Files

- `/src/services/contracts/payment.interface.ts` - All payment interfaces
- `/src/lib/container.ts` - Dependency injection container
- `/src/lib/stripe.ts` - Stripe client and utilities
- `/src/domain/auction/rules.ts` - Business rules (e.g., payment deadline calculation)
