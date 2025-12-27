# Vision Provider Refactoring - Open/Closed Principle

## Overview

The license plate detection system has been refactored to follow the **Open/Closed Principle** by introducing a `IVisionProvider` interface. This allows the system to be extended with new vision providers without modifying existing code.

## Architecture

### Before (OCP Violation)
```typescript
// Direct dependency on OpenRouter implementation
import { chatCompletionJSON } from '@/lib/openrouter'

export async function detectLicensePlates(imageUrl: string) {
  const response = await chatCompletionJSON<AIPlateDetectionResponse>(
    messages,
    { model, temperature: 0.1, max_tokens: 1024 }
  )
  // ...
}
```

**Problems:**
- Tight coupling to OpenRouter
- Cannot swap providers without code changes
- Difficult to test (requires mocking HTTP calls)
- Violates Open/Closed Principle

### After (OCP Compliant)
```typescript
// Dependency on abstraction
import type { IVisionProvider } from '@/services/contracts/vision-provider.interface'

export class LicensePlateDetectionService {
  constructor(private readonly visionProvider: IVisionProvider) {}

  async detectLicensePlates(imageUrl: string) {
    const response = await this.visionProvider.analyzeImage<AIPlateDetectionResponse>(
      imageUrl,
      LICENSE_PLATE_DETECTION_PROMPT
    )
    // ...
  }
}
```

**Benefits:**
- Depends on abstraction (IVisionProvider)
- Easy to swap providers via dependency injection
- Simple to test with mock providers
- Open for extension, closed for modification

## Files Created

1. **Interface:** `/src/services/contracts/vision-provider.interface.ts`
   - Defines `IVisionProvider` contract
   - Specifies `analyzeImage<T>()`, `analyzeImageText()`, `analyzeMultipleImages()`

2. **Implementation:** `/src/services/providers/openrouter-vision.provider.ts`
   - `OpenRouterVisionProvider` class implementing `IVisionProvider`
   - Wraps existing OpenRouter/Claude logic
   - Factory function `createOpenRouterVisionProvider()`

3. **Refactored Service:** `/src/services/ai/license-plate.service.ts`
   - New `LicensePlateDetectionService` class with DI
   - Backward-compatible function exports (deprecated)
   - Default singleton for existing code

## Usage Examples

### Basic Usage (Backward Compatible)
```typescript
import { detectLicensePlates } from '@/services/ai/license-plate.service'

// Works exactly as before
const result = await detectLicensePlates('https://example.com/car.jpg')
```

### Recommended: Using the Service Class
```typescript
import { LicensePlateDetectionService } from '@/services/ai/license-plate.service'
import { createOpenRouterVisionProvider } from '@/services/providers/openrouter-vision.provider'

// Create with default provider
const service = new LicensePlateDetectionService()
const result = await service.detectLicensePlates(imageUrl)

// Or with custom provider configuration
const customProvider = createOpenRouterVisionProvider({
  model: 'openai/gpt-4o',
  temperature: 0.2,
  maxTokens: 2048,
})
const customService = new LicensePlateDetectionService(customProvider)
```

### Testing with Mock Provider
```typescript
import { IVisionProvider } from '@/services/contracts/vision-provider.interface'
import { LicensePlateDetectionService } from '@/services/ai/license-plate.service'

class MockVisionProvider implements IVisionProvider {
  async analyzeImage<T>(imageUrl: string, prompt: string): Promise<T> {
    return {
      hasLicensePlate: true,
      plates: [
        { x: 10, y: 20, width: 30, height: 40, confidence: 0.9, plateType: 'front' }
      ],
      reasoning: 'Mock detected plate'
    } as T
  }

  async analyzeImageText(imageUrl: string, prompt: string): Promise<string> {
    return 'Mock response'
  }

  async analyzeMultipleImages(imageUrls: string[], prompt: string): Promise<string> {
    return 'Mock batch response'
  }
}

// Use in tests
const mockProvider = new MockVisionProvider()
const service = new LicensePlateDetectionService(mockProvider)

// Test without external API calls
const result = await service.detectLicensePlates('test-url')
expect(result.detected).toBe(true)
expect(result.plates).toHaveLength(1)
```

### Adding a New Provider (Future: Google Vision)
```typescript
// src/services/providers/google-vision.provider.ts
import type { IVisionProvider } from '@/services/contracts/vision-provider.interface'

export class GoogleVisionProvider implements IVisionProvider {
  async analyzeImage<T>(imageUrl: string, prompt: string): Promise<T> {
    // Google Vision API implementation
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      // ... Google-specific logic
    })
    return response.json() as T
  }

  // ... other methods
}

// Usage - no changes to license-plate.service.ts needed!
const googleProvider = new GoogleVisionProvider()
const service = new LicensePlateDetectionService(googleProvider)
```

## Benefits Demonstrated

### 1. Open/Closed Principle
- **Open for extension:** Add new vision providers by implementing `IVisionProvider`
- **Closed for modification:** `LicensePlateDetectionService` doesn't change when adding providers

### 2. Dependency Inversion Principle
- High-level module (`LicensePlateDetectionService`) depends on abstraction (`IVisionProvider`)
- Low-level module (`OpenRouterVisionProvider`) depends on same abstraction
- Both can vary independently

### 3. Single Responsibility Principle
- `IVisionProvider`: Define vision analysis contract
- `OpenRouterVisionProvider`: Implement OpenRouter-specific logic
- `LicensePlateDetectionService`: Handle license plate detection business logic

### 4. Testability
```typescript
// Before: Hard to test (requires mocking fetch, OpenRouter API)
const result = await detectLicensePlates(url)

// After: Easy to test (inject mock provider)
const mockProvider = new MockVisionProvider()
const service = new LicensePlateDetectionService(mockProvider)
const result = await service.detectLicensePlates(url)
```

### 5. Flexibility
```typescript
// Switch providers based on environment
const provider = process.env.VISION_PROVIDER === 'google'
  ? new GoogleVisionProvider()
  : createOpenRouterVisionProvider()

const service = new LicensePlateDetectionService(provider)
```

## API Reference

### IVisionProvider Interface
```typescript
interface IVisionProvider {
  analyzeImage<T>(imageUrl: string, prompt: string, schema?: object): Promise<T>
  analyzeImageText(imageUrl: string, prompt: string): Promise<string>
  analyzeMultipleImages(imageUrls: string[], prompt: string): Promise<string>
}
```

### LicensePlateDetectionService
```typescript
class LicensePlateDetectionService {
  constructor(visionProvider?: IVisionProvider)

  detectLicensePlates(imageUrl: string): Promise<PlateDetectionResult>
  batchDetectLicensePlates(imageUrls: string[], options?: { concurrency?: number }): Promise<Map<string, PlateDetectionResult>>
  needsPlateBlurring(imageUrl: string, confidenceThreshold?: number): Promise<boolean>
  detectAndBlurPlates(imageUrl: string): Promise<{ detection: PlateDetectionResult; blur?: BlurResult }>
}
```

## Migration Guide

### Existing Code
No changes required! All existing function exports are maintained with backward compatibility.

### New Code (Recommended)
Use the class-based approach with dependency injection:

```typescript
// Before
import { detectLicensePlates } from '@/services/ai/license-plate.service'
const result = await detectLicensePlates(url)

// After (recommended)
import { LicensePlateDetectionService } from '@/services/ai/license-plate.service'
const service = new LicensePlateDetectionService()
const result = await service.detectLicensePlates(url)
```

## Future Enhancements

1. **Service Locator Integration:** Register vision provider in service locator
2. **Additional Providers:** Google Vision, AWS Rekognition, Azure Computer Vision
3. **Provider Selection:** Environment-based or feature-flag-based provider selection
4. **Caching Layer:** Add caching decorator for vision providers
5. **Rate Limiting:** Provider-specific rate limiting strategies
