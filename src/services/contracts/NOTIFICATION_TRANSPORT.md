# Notification Transport - Dependency Inversion

## Overview

The notification transport layer demonstrates the **Dependency Inversion Principle (DIP)** from SOLID. The high-level `NotificationService` depends on the abstract `INotificationTransport` interface rather than concrete Pusher implementation.

## Architecture

```
┌─────────────────────────────────────┐
│   NotificationService               │
│   (High-level business logic)       │
│                                     │
│   - sendUserNotification()          │
│   - broadcastPublic()               │
│   - notifyAuctionWon()              │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│   INotificationTransport            │
│   (Abstract interface)              │
│                                     │
│   + send(channel, event, data)      │
│   + sendToUser(userId, event, data) │
└──────────────┬──────────────────────┘
               │ implemented by
               ▼
┌─────────────────────────────────────┐
│   PusherNotificationTransport       │
│   (Concrete implementation)         │
│                                     │
│   - Uses Pusher SDK                 │
│   - Handles channel naming          │
│   - Error handling                  │
└─────────────────────────────────────┘
```

## Benefits

### 1. Swappable Implementations
Easily switch notification providers without changing business logic:
- Pusher → WebSockets
- Pusher → Server-Sent Events (SSE)
- Pusher → Custom solution
- Pusher → Multiple transports simultaneously

### 2. Testability
Use mock transport in tests without Pusher credentials:

```typescript
import { MockNotificationTransport } from './__tests__/mock-notification-transport'
import { setNotificationTransport, sendUserNotification } from './notification.service'

// In test setup
const mockTransport = new MockNotificationTransport()
setNotificationTransport(mockTransport)

// Send notification
await sendUserNotification('user-123', { ... })

// Verify in test
expect(mockTransport.getMessagesByUser('user-123')).toHaveLength(1)
```

### 3. Loose Coupling
NotificationService doesn't know about Pusher, channels, or connection details. It only knows about the abstract transport interface.

### 4. Single Responsibility
- **INotificationTransport**: Low-level message delivery
- **NotificationService**: High-level business notifications (who, when, why)

## File Structure

```
src/services/
├── contracts/
│   ├── notification-transport.interface.ts  # Abstract interface (DIP)
│   └── notification.interface.ts            # Service interface
├── pusher-notification-transport.ts         # Pusher implementation
├── notification.service.ts                  # Business logic
└── __tests__/
    ├── mock-notification-transport.ts       # Test implementation
    └── notification.service.test.ts         # Example tests
```

## Usage

### Default (Production)
```typescript
import { sendUserNotification } from '@/services/notification.service'

// Uses Pusher by default
await sendUserNotification('user-123', {
  type: 'AUCTION_WON',
  title: 'You Won!',
  message: 'Congratulations...',
})
```

### Testing
```typescript
import { setNotificationTransport } from '@/services/notification.service'
import { MockNotificationTransport } from '@/services/__tests__/mock-notification-transport'

const mockTransport = new MockNotificationTransport()
setNotificationTransport(mockTransport)

// Now all notifications go through mock
```

### Custom Transport
```typescript
import { INotificationTransport } from '@/services/contracts'

class WebSocketTransport implements INotificationTransport {
  async send(channel: string, event: string, data: unknown) {
    // Custom WebSocket implementation
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    // Custom user-specific delivery
  }
}

setNotificationTransport(new WebSocketTransport())
```

## Alternative Implementations

### Server-Sent Events (SSE)
```typescript
class SSETransport implements INotificationTransport {
  private connections = new Map<string, Response>()

  async sendToUser(userId: string, event: string, data: unknown) {
    const userConnection = this.connections.get(userId)
    if (userConnection) {
      await userConnection.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }
  }

  async send(channel: string, event: string, data: unknown) {
    // Broadcast to all connections subscribed to channel
  }
}
```

### Hybrid Transport
```typescript
class HybridTransport implements INotificationTransport {
  constructor(
    private primary: INotificationTransport,
    private fallback: INotificationTransport
  ) {}

  async send(channel: string, event: string, data: unknown) {
    try {
      await this.primary.send(channel, event, data)
    } catch (error) {
      console.warn('Primary transport failed, using fallback')
      await this.fallback.send(channel, event, data)
    }
  }

  async sendToUser(userId: string, event: string, data: unknown) {
    try {
      await this.primary.sendToUser(userId, event, data)
    } catch (error) {
      await this.fallback.sendToUser(userId, event, data)
    }
  }
}

// Usage: Pusher primary, SSE fallback
const transport = new HybridTransport(
  new PusherNotificationTransport(),
  new SSETransport()
)
setNotificationTransport(transport)
```

## Design Principles Applied

### Dependency Inversion Principle (DIP)
- High-level modules (NotificationService) depend on abstractions (INotificationTransport)
- Low-level modules (PusherNotificationTransport) depend on the same abstractions
- Neither depends on the other's concrete implementation

### Interface Segregation Principle (ISP)
- `INotificationTransport` is minimal and focused
- Only two methods: `send()` and `sendToUser()`
- No client forced to depend on unused methods

### Open/Closed Principle (OCP)
- Open for extension: Create new transport implementations
- Closed for modification: NotificationService unchanged when adding transports

## Testing Benefits

### Before (Tightly Coupled)
```typescript
// Required Pusher credentials and live connection
// Difficult to verify messages were sent
// Slow tests due to network I/O
```

### After (Dependency Inversion)
```typescript
// No external dependencies
// Full message inspection and verification
// Fast, isolated unit tests
const messages = mockTransport.getMessages()
expect(messages[0].data.type).toBe('AUCTION_WON')
```

## Migration Path

To migrate away from Pusher:

1. Implement `INotificationTransport` with new provider
2. Test new implementation
3. Update `createNotificationTransport()` factory
4. Deploy (no changes to NotificationService needed)

```typescript
// pusher-notification-transport.ts
export function createNotificationTransport(): INotificationTransport {
  // Switch based on environment variable
  if (process.env.NOTIFICATION_PROVIDER === 'websocket') {
    return new WebSocketTransport()
  }
  return new PusherNotificationTransport() // Default
}
```

## Related Patterns

- **Adapter Pattern**: `PusherNotificationTransport` adapts Pusher API to `INotificationTransport`
- **Strategy Pattern**: Transport can be swapped at runtime via `setNotificationTransport()`
- **Factory Pattern**: `createNotificationTransport()` encapsulates transport creation
