# Notification Dependency Inversion - Code Example

## Before: Tight Coupling (Violates DIP)

```typescript
// notification.service.ts - BEFORE
import { pusher, CHANNELS } from '@/lib/pusher'  // ❌ Direct dependency on concrete class

export async function sendUserNotification(userId: string, notification: NotificationPayload) {
  await pusher.trigger(CHANNELS.userNotifications(userId), 'notification', notification)
}
```

**Problems:**
- NotificationService knows about Pusher internals
- Can't swap providers without modifying service code
- Difficult to test (requires Pusher credentials)
- High coupling to low-level implementation

## After: Dependency Inversion (Follows DIP)

### 1. Define Abstract Interface

```typescript
// contracts/notification-transport.interface.ts
export interface INotificationTransport {
  send(channel: string, event: string, data: unknown): Promise<void>
  sendToUser(userId: string, event: string, data: unknown): Promise<void>
}
```

### 2. Implement Concrete Transport

```typescript
// pusher-notification-transport.ts
import { pusher, CHANNELS } from '@/lib/pusher'

export class PusherNotificationTransport implements INotificationTransport {
  async send(channel: string, event: string, data: unknown) {
    await pusher.trigger(channel, event, data)
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    await pusher.trigger(CHANNELS.userNotifications(userId), event, data)
  }
}

export function createNotificationTransport(): INotificationTransport {
  return new PusherNotificationTransport()
}
```

### 3. Depend on Abstraction

```typescript
// notification.service.ts - AFTER
import { INotificationTransport } from './contracts/notification-transport.interface'  // ✓ Depends on interface
import { createNotificationTransport } from './pusher-notification-transport'

let transport: INotificationTransport = createNotificationTransport()

export function setNotificationTransport(customTransport: INotificationTransport) {
  transport = customTransport
}

export async function sendUserNotification(userId: string, notification: NotificationPayload) {
  await transport.sendToUser(userId, 'notification', notification)  // ✓ Uses abstraction
}
```

## Benefits in Practice

### Easy Testing

```typescript
// __tests__/mock-notification-transport.ts
export class MockNotificationTransport implements INotificationTransport {
  private messages: any[] = []

  async send(channel: string, event: string, data: unknown) {
    this.messages.push({ channel, event, data })
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    this.messages.push({ channel: `user-${userId}`, event, data })
  }

  getMessages() { return this.messages }
  clear() { this.messages = [] }
}

// In tests
const mock = new MockNotificationTransport()
setNotificationTransport(mock)

await sendUserNotification('user-123', notification)
expect(mock.getMessages()).toHaveLength(1)  // ✓ Easy verification
```

### Easy Provider Switching

```typescript
// websocket-notification-transport.ts
export class WebSocketTransport implements INotificationTransport {
  async send(channel: string, event: string, data: unknown) {
    // Send via WebSocket instead of Pusher
    this.wss.send(JSON.stringify({ channel, event, data }))
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    const userSocket = this.getUserSocket(userId)
    userSocket?.send(JSON.stringify({ event, data }))
  }
}

// Switch transport in one line
setNotificationTransport(new WebSocketTransport())  // ✓ No service changes needed
```

### Advanced: Hybrid Strategy

```typescript
// Send to multiple transports simultaneously
class MultiTransport implements INotificationTransport {
  constructor(private transports: INotificationTransport[]) {}

  async send(channel: string, event: string, data: unknown) {
    await Promise.allSettled(
      this.transports.map(t => t.send(channel, event, data))
    )
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    await Promise.allSettled(
      this.transports.map(t => t.sendToUser(userId, event, data))
    )
  }
}

// Use both Pusher AND WebSockets
setNotificationTransport(new MultiTransport([
  new PusherNotificationTransport(),
  new WebSocketTransport()
]))
```

### Advanced: Monitoring Decorator

```typescript
class MonitoredTransport implements INotificationTransport {
  constructor(private inner: INotificationTransport) {}

  async send(channel: string, event: string, data: unknown) {
    const start = performance.now()
    try {
      await this.inner.send(channel, event, data)
      console.log(`✓ Sent to ${channel} in ${performance.now() - start}ms`)
    } catch (error) {
      console.error(`✗ Failed to send to ${channel}:`, error)
      throw error
    }
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    // Similar monitoring
  }
}

// Add monitoring without changing business logic
setNotificationTransport(
  new MonitoredTransport(
    new PusherNotificationTransport()
  )
)
```

## Dependency Flow Comparison

### Before (Bad)
```
┌─────────────────────────┐
│  NotificationService    │
│  (High-level logic)     │
└───────────┬─────────────┘
            │
            │ depends on (❌ violation of DIP)
            ▼
┌─────────────────────────┐
│  Pusher SDK             │
│  (Low-level impl)       │
└─────────────────────────┘
```

### After (Good)
```
┌─────────────────────────┐
│  NotificationService    │
│  (High-level logic)     │
└───────────┬─────────────┘
            │
            │ depends on ✓
            ▼
┌─────────────────────────┐
│  INotificationTransport │
│  (Abstraction)          │
└───────────┬─────────────┘
            │
            │ implements ✓
            ▼
┌─────────────────────────┐
│  PusherNotification     │
│  Transport              │
│  (Low-level impl)       │
└─────────────────────────┘
```

## Real-World Usage

### Production
```typescript
// Uses Pusher by default
import { sendUserNotification } from '@/services/notification.service'

await sendUserNotification('user-123', {
  type: 'AUCTION_WON',
  title: 'You Won!',
  message: 'Congratulations',
})
```

### Testing
```typescript
import { setNotificationTransport, sendUserNotification } from '@/services/notification.service'
import { MockNotificationTransport } from '@/services/__tests__/mock-notification-transport'

describe('Auction Service', () => {
  let mockTransport: MockNotificationTransport

  beforeEach(() => {
    mockTransport = new MockNotificationTransport()
    setNotificationTransport(mockTransport)
  })

  it('should notify winner', async () => {
    await auctionService.endAuction('auction-123')

    const notifications = mockTransport.getMessagesByUser('winner-id')
    expect(notifications).toHaveLength(1)
    expect(notifications[0].data.type).toBe('AUCTION_WON')
  })
})
```

## Migration Path

If you need to migrate from Pusher to another provider:

```typescript
// Step 1: Implement interface
class NewProviderTransport implements INotificationTransport {
  async send(channel: string, event: string, data: unknown) {
    // Your new provider logic
  }
  async sendToUser(userId: string, event: string, data: unknown) {
    // Your new provider logic
  }
}

// Step 2: Update factory (one line change)
export function createNotificationTransport(): INotificationTransport {
  return new NewProviderTransport()  // Changed from PusherNotificationTransport
}

// Step 3: Deploy - all business logic unchanged! ✓
```

## Key Takeaways

1. **High-level modules should not depend on low-level modules**
   - Both should depend on abstractions

2. **Abstractions should not depend on details**
   - Details should depend on abstractions

3. **Benefits realized:**
   - ✓ Easy to test (mock transport)
   - ✓ Easy to extend (new transports)
   - ✓ Easy to maintain (decoupled code)
   - ✓ Easy to modify (swap providers)

4. **No breaking changes:**
   - Existing code continues to work
   - New capabilities added without modification
   - Open for extension, closed for modification (OCP)
