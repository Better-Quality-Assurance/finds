# Service Provider Implementations

This directory contains concrete implementations of service provider interfaces.

## SMS Providers

### MockSMSProvider
**File:** `mock-sms.provider.ts`

Development/testing implementation that logs SMS messages to console.

```typescript
import { MockSMSProvider } from '@/services/providers'

const provider = new MockSMSProvider()
await provider.sendSMS('+40712345678', 'Your verification code is: 123456')
```

**Features:**
- No external dependencies
- Logs messages with formatted output
- Simulates async operation
- Safe for development/testing

### TwilioSMSProvider
**File:** `twilio-sms.provider.ts`

Production implementation using Twilio API for real SMS delivery.

```typescript
import { TwilioSMSProvider } from '@/services/providers'

const provider = new TwilioSMSProvider({
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  fromNumber: process.env.TWILIO_PHONE_NUMBER!,
})

await provider.sendSMS('+40712345678', 'Your verification code is: 123456')
```

**Features:**
- Real SMS delivery via Twilio
- Graceful handling of missing `twilio` package
- Falls back to logging if package not installed
- Validates message length (max 1600 chars)
- Proper error handling and reporting

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Installation:**
```bash
npm install twilio
```

## Usage in Container

The DI container automatically selects the appropriate provider:

```typescript
// In src/lib/container.ts
function createSMSProvider(): ISMSProvider {
  if (TWILIO_CREDENTIALS_PRESENT) {
    return new TwilioSMSProvider({ ... })
  }
  return new MockSMSProvider()
}
```

## Adding New Providers

To add a new SMS provider:

1. Create implementation file: `your-provider.provider.ts`
2. Implement `ISMSProvider` interface
3. Export from `index.ts`
4. Optionally update container factory

Example:

```typescript
// sendgrid-sms.provider.ts
import type { ISMSProvider } from '@/services/contracts'

export class SendGridSMSProvider implements ISMSProvider {
  constructor(private apiKey: string) {}

  async sendSMS(to: string, body: string): Promise<void> {
    // SendGrid implementation
  }
}
```

## Testing

### Unit Tests
```typescript
import { MockSMSProvider } from '@/services/providers'

const provider = new MockSMSProvider()
await provider.sendSMS('+40712345678', 'test message')
// Check console output
```

### Integration Tests
```typescript
import { initializePhoneVerificationService } from '@/services/phone-verification.service'
import { MockSMSProvider } from '@/services/providers'

beforeEach(() => {
  const mockProvider = new MockSMSProvider()
  initializePhoneVerificationService(mockProvider)
})
```

## Vision Providers

### OpenRouterVisionProvider
**File:** `openrouter-vision.provider.ts`

Vision analysis using OpenRouter's vision-capable models.

See the file for detailed usage and configuration.
