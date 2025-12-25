# Service Contracts

This directory contains TypeScript interfaces for all services in the Finds auction platform. These interfaces enable proper dependency injection, testability, and loose coupling between components.

## Overview

The service contracts define the public API of each service without coupling to the implementation. This allows for:

- **Dependency Injection**: Pass interfaces instead of concrete implementations
- **Testability**: Mock services easily in unit tests
- **Flexibility**: Swap implementations without changing dependent code
- **Documentation**: Clear contract of what each service provides

## Available Interfaces

### Core Services

- **`INotificationService`** - Real-time notifications via Pusher
- **`IAuditService`** - Comprehensive audit logging
- **`IListingService`** - Listing creation and management
- **`IAuctionService`** - Auction lifecycle and bidding
- **`IFraudService`** - Fraud detection and prevention

### Payment Services

The payment service is split into three focused interfaces:

- **`IBidDepositService`** - Bid deposit lifecycle (hold, release, capture)
- **`IBuyerFeeService`** - Buyer fee charging after auction win
- **`ISellerPayoutService`** - Seller payouts via Stripe Connect

### Infrastructure Services

- **`IStorageService`** - R2/S3 file storage operations
- **`IEmailService`** - Transactional emails via Resend

## Usage Examples

### Basic Usage

```typescript
import type { INotificationService, IAuctionService } from '@/services/contracts'

// Use interface as type for dependency
class BidController {
  constructor(
    private notificationService: INotificationService,
    private auctionService: IAuctionService
  ) {}

  async placeBid(auctionId: string, bidderId: string, amount: number) {
    const result = await this.auctionService.placeBid(auctionId, bidderId, amount)

    // Notify watchers
    await this.notificationService.notifyWatchersNewBid(
      auctionId,
      amount,
      'EUR',
      'Anonymous'
    )

    return result
  }
}
```

### Testing with Mocks

```typescript
import type { INotificationService } from '@/services/contracts'
import { describe, it, expect, vi } from 'vitest'

describe('BidController', () => {
  it('should notify watchers after placing bid', async () => {
    // Create mock implementation
    const mockNotificationService: INotificationService = {
      sendUserNotification: vi.fn(),
      broadcastPublic: vi.fn(),
      notifyListingApproved: vi.fn(),
      notifyWatchersNewBid: vi.fn().mockResolvedValue(undefined),
      // ... other methods
    }

    const controller = new BidController(
      mockNotificationService,
      mockAuctionService
    )

    await controller.placeBid('auction-1', 'user-1', 1000)

    expect(mockNotificationService.notifyWatchersNewBid).toHaveBeenCalledWith(
      'auction-1',
      1000,
      'EUR',
      'Anonymous'
    )
  })
})
```

### Dependency Injection Container

```typescript
import type {
  INotificationService,
  IAuditService,
  IFraudService,
  IAuctionService,
} from '@/services/contracts'

import * as NotificationService from '@/services/notification.service'
import * as AuditService from '@/services/audit.service'
import * as FraudService from '@/services/fraud.service'
import * as AuctionService from '@/services/auction.service'

// Create a simple DI container
class ServiceContainer {
  private services = new Map<string, unknown>()

  register<T>(name: string, implementation: T): void {
    this.services.set(name, implementation)
  }

  resolve<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not registered`)
    }
    return service as T
  }
}

// Register implementations
const container = new ServiceContainer()
container.register<INotificationService>('notification', NotificationService)
container.register<IAuditService>('audit', AuditService)
container.register<IFraudService>('fraud', FraudService)
container.register<IAuctionService>('auction', AuctionService)

// Resolve and use
const notificationService = container.resolve<INotificationService>('notification')
await notificationService.broadcastPublic('auction-started', { id: '123' })
```

### API Route Handler Example

```typescript
import type { IBidDepositService, IFraudService } from '@/services/contracts'
import * as BidDepositService from '@/services/payment.service'
import * as FraudService from '@/services/fraud.service'

export async function POST(request: Request) {
  const { auctionId, amount } = await request.json()
  const userId = 'current-user-id' // from auth

  // Use services via their interfaces
  const depositService: IBidDepositService = BidDepositService
  const fraudService: IFraudService = FraudService

  // Check fraud
  const fraudCheck = await fraudService.runBidFraudChecks({
    userId,
    auctionId,
    bidAmount: amount,
  })

  if (!fraudCheck.passed) {
    return Response.json({ error: 'Fraud check failed' }, { status: 403 })
  }

  // Create deposit
  const result = await depositService.createBidDeposit({
    userId,
    auctionId,
    bidAmount: amount,
  })

  return Response.json(result)
}
```

## Interface Organization

### Split Interfaces

Some services are split into multiple interfaces for better separation of concerns:

**Payment Service** is divided into:
- `IBidDepositService` - Handles bidder deposits (pre-bid holds)
- `IBuyerFeeService` - Handles final payment from auction winner
- `ISellerPayoutService` - Handles payouts to sellers

This allows you to inject only the specific functionality needed:

```typescript
class BidHandler {
  constructor(private depositService: IBidDepositService) {}
  // Only has access to deposit operations
}

class CheckoutHandler {
  constructor(private buyerFeeService: IBuyerFeeService) {}
  // Only has access to buyer fee operations
}

class PayoutHandler {
  constructor(private sellerPayoutService: ISellerPayoutService) {}
  // Only has access to payout operations
}
```

## Type Safety

All interfaces use strict TypeScript types:

```typescript
// Correct usage with type checking
const result: DepositResult = await depositService.createBidDeposit({
  userId: 'user-123',
  auctionId: 'auction-456',
  bidAmount: 1000,
})

if (result.success && result.deposit) {
  console.log('Deposit created:', result.deposit.id)
} else if (result.requiresAction && result.clientSecret) {
  // Handle 3D Secure
  console.log('Additional action required:', result.clientSecret)
} else {
  console.error('Error:', result.error)
}
```

## Extending Interfaces

To add new methods to a service:

1. Update the interface in `/src/services/contracts/`
2. Implement the method in the service file
3. Update tests to cover the new method
4. Update this README if needed

Example:

```typescript
// In notification.interface.ts
export interface INotificationService {
  // ... existing methods

  /**
   * New method: Notify users about auction extension
   */
  notifyAuctionExtended(
    auctionId: string,
    newEndTime: Date,
    extensionMinutes: number
  ): Promise<void>
}

// In notification.service.ts
export async function notifyAuctionExtended(
  auctionId: string,
  newEndTime: Date,
  extensionMinutes: number
): Promise<void> {
  // Implementation
}
```

## Best Practices

1. **Use interfaces in function signatures** instead of concrete implementations
2. **Keep interfaces focused** - Split large interfaces into smaller ones (Interface Segregation Principle)
3. **Document parameters** with JSDoc comments
4. **Use descriptive return types** - Create specific types instead of generic objects
5. **Export types alongside interfaces** for better developer experience
6. **Version interfaces carefully** - Breaking changes affect all consumers

## Migration Guide

To migrate existing code to use these interfaces:

### Before (Tightly Coupled)

```typescript
import { createBidDeposit } from '@/services/payment.service'
import { runBidFraudChecks } from '@/services/fraud.service'

async function handleBid() {
  const fraudCheck = await runBidFraudChecks({...})
  const deposit = await createBidDeposit({...})
}
```

### After (Loosely Coupled)

```typescript
import type { IBidDepositService, IFraudService } from '@/services/contracts'
import * as PaymentService from '@/services/payment.service'
import * as FraudService from '@/services/fraud.service'

class BidHandler {
  constructor(
    private depositService: IBidDepositService = PaymentService,
    private fraudService: IFraudService = FraudService
  ) {}

  async handleBid() {
    const fraudCheck = await this.fraudService.runBidFraudChecks({...})
    const deposit = await this.depositService.createBidDeposit({...})
  }
}
```

## Related Documentation

- [Service Architecture](../../docs/architecture/services.md) (if exists)
- [Testing Guide](../../docs/testing/unit-tests.md) (if exists)
- [API Documentation](../../docs/api/README.md) (if exists)

## Questions?

For questions about these interfaces or how to use them, please:
1. Check the JSDoc comments in the interface files
2. Review the corresponding service implementation
3. Look at existing usage in the codebase
4. Consult the team documentation
