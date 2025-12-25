# Dependency Injection Container

The Finds auction platform uses a simple dependency injection (DI) container to manage service instances and dependencies.

## Overview

The DI container provides:

- **Centralized service management** - Single source of truth for all services
- **Easy testing** - Swap real implementations for mocks in tests
- **Clear boundaries** - Service interfaces define clear contracts
- **Type safety** - Full TypeScript support with proper types

## File Structure

```
/src
  /lib
    container.ts              # Main container implementation
    container.test.ts         # Container tests
    container-usage.example.ts # Usage examples
  /services
    /contracts              # Service interface definitions
      index.ts             # Re-exports all interfaces
      notification.interface.ts
      audit.interface.ts
      fraud.interface.ts
      payment.interface.ts
      storage.interface.ts
      email.interface.ts
```

## Service Interfaces

The container manages these services:

### Core Services

- **`notifications`** - Send real-time notifications via Pusher
- **`audit`** - Log and retrieve audit events
- **`fraud`** - Run fraud detection checks on bids
- **`email`** - Send transactional emails (Resend)
- **`storage`** - Manage file uploads to Cloudflare R2

### Payment Services

- **`deposits`** - Manage bid deposits (hold/release/capture)
- **`fees`** - Charge buyer fees after auction win
- **`payouts`** - Create seller payouts via Stripe Connect

### Database

- **`prisma`** - Prisma Client instance for database access

## Usage

### Basic Usage

```typescript
import { getContainer } from '@/lib/container'

export async function myApiRoute() {
  const container = getContainer()

  // Use any service
  await container.notifications.sendUserNotification('user-123', {
    type: 'AUCTION_WON',
    title: 'Congratulations!',
    message: 'You won the auction',
  })

  // Services work together
  const fraudCheck = await container.fraud.runBidFraudChecks({
    userId: 'user-123',
    auctionId: 'auction-456',
    bidAmount: 5000,
  })

  if (!fraudCheck.passed) {
    await container.audit.logAuditEvent({
      action: 'BID_BLOCKED',
      resourceType: 'AUCTION',
      resourceId: 'auction-456',
      severity: 'HIGH',
    })
  }
}
```

### Using in Tests

```typescript
import { createTestContainer, setContainer, resetContainer } from '@/lib/container'

describe('My Feature', () => {
  beforeEach(() => {
    // Use mock container for tests
    const testContainer = createTestContainer()
    setContainer(testContainer)
  })

  afterEach(() => {
    // Reset to production container
    resetContainer()
  })

  it('should handle notifications', async () => {
    const container = getContainer()

    // This uses the mock implementation
    await container.notifications.sendUserNotification('user-123', {
      type: 'LISTING_APPROVED',
      title: 'Approved',
      message: 'Your listing was approved',
    })

    // No actual notification is sent!
  })
})
```

### Complex Workflows

```typescript
import { getContainer } from '@/lib/container'

export async function endAuctionWorkflow(
  auctionId: string,
  winnerId: string,
  losers: string[]
) {
  const container = getContainer()

  // 1. Release non-winning deposits
  const released = await container.deposits.releaseNonWinningDeposits(
    auctionId,
    winnerId
  )

  // 2. Set payment deadline for winner
  await container.fees.setPaymentDeadline(auctionId)

  // 3. Notify winner
  await container.notifications.notifyAuctionWon(
    winnerId,
    auctionId,
    'Classic Ferrari 250 GT',
    50000,
    'EUR'
  )

  // 4. Notify losers
  for (const userId of losers) {
    await container.notifications.notifyAuctionLost(
      auctionId,
      'Classic Ferrari 250 GT',
      winnerId
    )
  }

  // 5. Log audit trail
  await container.audit.logAuditEvent({
    action: 'AUCTION_ENDED',
    resourceType: 'AUCTION',
    resourceId: auctionId,
    severity: 'MEDIUM',
    status: 'SUCCESS',
    details: {
      winnerId,
      releasedDeposits: released,
      notifiedUsers: losers.length + 1,
    },
  })
}
```

## Container Functions

### `createContainer(): ServiceContainer`

Creates a new container with real service implementations. Use this when you need a fresh container instance (rare).

```typescript
import { createContainer } from '@/lib/container'

const container = createContainer()
```

### `createTestContainer(): ServiceContainer`

Creates a container with mock implementations for testing. All services return safe mock data and don't perform actual operations.

```typescript
import { createTestContainer } from '@/lib/container'

const testContainer = createTestContainer()
```

### `getContainer(): ServiceContainer`

Returns the singleton container instance. This is the most common way to access services.

```typescript
import { getContainer } from '@/lib/container'

const container = getContainer()
```

### `setContainer(container: ServiceContainer): void`

Replaces the global container with a custom instance. Useful for testing.

```typescript
import { setContainer, createTestContainer } from '@/lib/container'

setContainer(createTestContainer())
```

### `resetContainer(): void`

Clears the global container, forcing `getContainer()` to create a new one.

```typescript
import { resetContainer } from '@/lib/container'

resetContainer() // Next getContainer() will create fresh instance
```

## Service Interfaces

All services implement interfaces defined in `/src/services/contracts/`. These interfaces ensure:

- **Consistent APIs** - All implementations follow the same contract
- **Easy mocking** - Tests can provide mock implementations
- **Type safety** - TypeScript validates all service usage
- **Documentation** - Interfaces serve as documentation

Example interface:

```typescript
// /src/services/contracts/notification.interface.ts
export interface INotificationService {
  sendUserNotification(userId: string, notification: NotificationPayload): Promise<void>
  broadcastPublic(event: string, data: Record<string, unknown>): Promise<void>
  notifyAuctionWon(/* ... */): Promise<void>
  // ... more methods
}
```

## Mock Behavior

The test container provides these mock behaviors:

### Notifications
- All notification methods do nothing (void promises)
- No actual Pusher events are sent

### Audit
- `logAuditEvent()` returns a mock audit log with provided data
- `getAuditLogs()` returns empty arrays
- `getAuditStats()` returns zeros

### Deposits
- `checkBiddingEligibility()` always returns eligible
- `createBidDeposit()` returns success with mock deposit
- All deposit operations succeed

### Fees
- `chargeBuyerFee()` always succeeds
- `getAuctionPaymentStatus()` returns UNPAID status

### Payouts
- All payout operations succeed with mock data

### Fraud
- `runBidFraudChecks()` always passes with no alerts
- `createFraudAlert()` returns mock alert

### Storage
- `uploadToR2()` returns mock URLs
- All operations succeed without actual file operations

### Email
- All email operations succeed without sending actual emails

## Best Practices

### 1. Use getContainer() in API Routes

```typescript
// Good
export async function POST(req: Request) {
  const container = getContainer()
  await container.audit.logAuditEvent(/* ... */)
}

// Avoid - creates new container each time
export async function POST(req: Request) {
  const container = createContainer()
  await container.audit.logAuditEvent(/* ... */)
}
```

### 2. Use Test Container in Tests

```typescript
// Good
beforeEach(() => {
  setContainer(createTestContainer())
})

// Bad - uses real services in tests
test('my test', async () => {
  const container = getContainer() // This might use real Pusher, Stripe, etc.
})
```

### 3. Compose Services for Complex Workflows

```typescript
// Good - clear workflow
async function processPayment(auctionId: string) {
  const container = getContainer()

  const payment = await container.fees.chargeBuyerFee(auctionId, userId)
  if (payment.success) {
    await container.payouts.createSellerPayout(auctionId)
    await container.audit.logAuditEvent(/* ... */)
  }
}

// Avoid - mixing concerns
async function processPayment(auctionId: string) {
  // Direct imports mixed with container
  import * as paymentService from '@/services/payment.service'
  const container = getContainer()
  // ...
}
```

### 4. Keep Service Interfaces Small

Each service should have a focused responsibility:
- ✅ `INotificationService` - handles all notifications
- ✅ `IBidDepositService` - handles bid deposits
- ❌ `ISuperService` - handles everything

## Adding New Services

To add a new service to the container:

1. **Create the interface**

```typescript
// /src/services/contracts/myservice.interface.ts
export interface IMyService {
  doSomething(param: string): Promise<void>
}
```

2. **Export from contracts/index.ts**

```typescript
export type { IMyService } from './myservice.interface'
```

3. **Implement the service**

```typescript
// /src/services/myservice.service.ts
export async function doSomething(param: string): Promise<void> {
  // implementation
}
```

4. **Add to container type**

```typescript
// /src/lib/container.ts
export type ServiceContainer = {
  // ... existing services
  myService: IMyService
}
```

5. **Create adapter function**

```typescript
function createMyService(): IMyService {
  return {
    doSomething: myServiceImpl.doSomething,
  }
}
```

6. **Add to createContainer()**

```typescript
export function createContainer(): ServiceContainer {
  return {
    // ... existing services
    myService: createMyService(),
  }
}
```

7. **Add mock to createTestContainer()**

```typescript
export function createTestContainer(): ServiceContainer {
  return {
    // ... existing mocks
    myService: {
      doSomething: async () => {},
    },
  }
}
```

## Troubleshooting

### "Cannot find module '@/services/contracts'"

Make sure your `tsconfig.json` has the path alias configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Services are undefined

Make sure you're calling `getContainer()` and not importing the container type:

```typescript
// Wrong
import { ServiceContainer } from '@/lib/container'
const container: ServiceContainer // undefined!

// Correct
import { getContainer } from '@/lib/container'
const container = getContainer() // ✓
```

### Test mocks aren't working

Make sure to set the test container before running tests:

```typescript
beforeEach(() => {
  setContainer(createTestContainer())
})

afterEach(() => {
  resetContainer()
})
```

## Architecture Decisions

### Why not a full IoC framework?

We chose a simple container over frameworks like InversifyJS because:
- **Simplicity** - Easy to understand and maintain
- **No decorators** - Works with plain TypeScript
- **Type safety** - Full TypeScript support without magic
- **Small footprint** - No additional dependencies
- **Explicit** - Clear what services are available

### Why interfaces?

Interfaces provide:
- **Clear contracts** - Define what services must implement
- **Easy testing** - Mock implementations for tests
- **Documentation** - Self-documenting code
- **Type safety** - Compile-time checking

### Why singleton pattern?

The singleton pattern (via `getContainer()`) ensures:
- **Single source of truth** - One container instance across app
- **Performance** - Services are initialized once
- **State consistency** - All code uses same service instances
- **Easy testing** - Can swap container in tests

## Related Documentation

- [Service Contracts README](/src/services/contracts/README.md)
- [Container Usage Examples](/src/lib/container-usage.example.ts)
- [Container Tests](/src/lib/container.test.ts)
