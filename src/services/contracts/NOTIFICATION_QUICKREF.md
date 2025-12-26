# Notification Transport - Quick Reference

## Architecture at a Glance

```
High-Level Module          Abstract Interface          Low-Level Module
┌──────────────────┐      ┌────────────────────┐      ┌──────────────────────┐
│                  │      │                    │      │                      │
│  Notification    │─────>│ INotification      │<─────│  Pusher             │
│  Service         │      │ Transport          │      │  Transport           │
│                  │      │                    │      │                      │
│  Business logic  │      │  send()            │      │  Pusher SDK wrapper  │
│  Who/What/When   │      │  sendToUser()      │      │  Channel naming      │
│                  │      │                    │      │                      │
└──────────────────┘      └────────────────────┘      └──────────────────────┘
```

## Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `contracts/notification-transport.interface.ts` | Abstract interface | 24 |
| `pusher-notification-transport.ts` | Concrete Pusher impl | 42 |
| `notification.service.ts` | Business logic (modified) | 462 |
| `__tests__/mock-notification-transport.ts` | Test double | 95 |
| `__tests__/notification.service.test.ts` | Example tests | 65 |

## Usage Patterns

### Production Use (Default)
```typescript
import { sendUserNotification } from '@/services/notification.service'

// Automatically uses Pusher transport
await sendUserNotification('user-123', {
  type: 'AUCTION_WON',
  title: 'You Won!',
  message: 'Congratulations on winning the auction',
  link: '/auctions/auction-456'
})
```

### Testing
```typescript
import { setNotificationTransport } from '@/services/notification.service'
import { MockNotificationTransport } from '@/services/__tests__/mock-notification-transport'

describe('MyFeature', () => {
  let mockTransport: MockNotificationTransport

  beforeEach(() => {
    mockTransport = new MockNotificationTransport()
    setNotificationTransport(mockTransport)
  })

  it('should send notification', async () => {
    await myFeature()

    expect(mockTransport.getMessagesByUser('user-123')).toHaveLength(1)
  })
})
```

### Custom Transport
```typescript
import { INotificationTransport } from '@/services/contracts'
import { setNotificationTransport } from '@/services/notification.service'

class MyTransport implements INotificationTransport {
  async send(channel: string, event: string, data: unknown) {
    // Your implementation
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    // Your implementation
  }
}

setNotificationTransport(new MyTransport())
```

## Interface Contract

```typescript
export interface INotificationTransport {
  /**
   * Send to a named channel (e.g., 'public', 'auction-123')
   */
  send(channel: string, event: string, data: unknown): Promise<void>

  /**
   * Send to user-specific private channel
   */
  sendToUser(userId: string, event: string, data: unknown): Promise<void>
}
```

## MockTransport API

```typescript
const mock = new MockNotificationTransport()

// Inspection methods
mock.getMessages()                    // All messages
mock.getMessagesByChannel('public')   // Specific channel
mock.getMessagesByUser('user-123')    // Specific user
mock.getMessagesByEvent('notification') // Specific event
mock.getLastMessage()                 // Most recent
mock.getMessageCount()                // Total count

// Verification
mock.wasSent('public', 'auction-live')  // Boolean check

// Cleanup
mock.clear()                          // Reset all messages
```

## Common Test Scenarios

### Verify notification sent
```typescript
await sendUserNotification('user-123', notification)
expect(mockTransport.getMessagesByUser('user-123')).toHaveLength(1)
```

### Verify notification content
```typescript
await sendUserNotification('user-123', notification)
const messages = mockTransport.getMessagesByUser('user-123')
expect(messages[0].data).toMatchObject({
  type: 'AUCTION_WON',
  title: 'You Won!',
})
```

### Verify broadcast
```typescript
await broadcastPublic('auction-live', data)
expect(mockTransport.getMessagesByChannel('public')).toHaveLength(1)
```

### Multiple notifications
```typescript
await sendUserNotification('user-1', notification1)
await sendUserNotification('user-2', notification2)
expect(mockTransport.getMessageCount()).toBe(2)
```

## Benefits Summary

| Benefit | Description |
|---------|-------------|
| **Testability** | Mock transport for fast, isolated tests |
| **Flexibility** | Swap providers without changing business logic |
| **Maintainability** | Clear separation between transport and business logic |
| **Extensibility** | Add new providers by implementing interface |
| **Monitoring** | Wrap transport for logging, metrics, tracing |
| **Resilience** | Implement fallback strategies, retry logic |

## SOLID Principles

- **DIP**: High-level depends on abstraction, not concrete Pusher
- **ISP**: Minimal 2-method interface
- **SRP**: Transport handles delivery, service handles business logic
- **OCP**: Open for extension (new transports), closed for modification

## Migration Checklist

When switching from Pusher to another provider:

- [ ] Implement `INotificationTransport`
- [ ] Test implementation thoroughly
- [ ] Update `createNotificationTransport()` factory
- [ ] Deploy (zero changes to NotificationService)
- [ ] Monitor and verify
- [ ] Remove Pusher dependencies

## Performance Considerations

```typescript
// Bad: Blocking sequential sends
for (const user of users) {
  await transport.sendToUser(user.id, event, data)
}

// Good: Parallel sends
await Promise.allSettled(
  users.map(user => transport.sendToUser(user.id, event, data))
)
```

## Error Handling

```typescript
class ResilientTransport implements INotificationTransport {
  constructor(private inner: INotificationTransport) {}

  async sendToUser(userId: string, event: string, data: unknown) {
    try {
      await this.inner.sendToUser(userId, event, data)
    } catch (error) {
      console.error(`Failed to notify user ${userId}:`, error)
      // Don't throw - notification failures shouldn't break app
    }
  }
}
```

## See Also

- **NOTIFICATION_TRANSPORT.md**: Full architecture guide
- **NOTIFICATION_DI_SUMMARY.md**: Implementation details
- **notification.service.test.ts**: Test examples
