# License Plate Detection Architecture

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Code                               │
│  (API Routes, Admin Pages, Upload Handlers)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│         LicensePlateDetectionService                        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ + detectLicensePlates(url): PlateDetectionResult      │ │
│  │ + batchDetectLicensePlates(urls): Map<url, result>   │ │
│  │ + needsPlateBlurring(url): boolean                    │ │
│  │ + detectAndBlurPlates(url): {detection, blur}         │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ depends on (DI)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              IVisionProvider (Interface)                    │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ + analyzeImage<T>(url, prompt): Promise<T>            │ │
│  │ + analyzeImageText(url, prompt): Promise<string>      │ │
│  │ + analyzeMultipleImages(urls, prompt): Promise<str>   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ implements
          ┌───────────┴───────────┬───────────────────┐
          ▼                       ▼                   ▼
┌────────────────────┐  ┌──────────────────┐  ┌──────────────┐
│ OpenRouterVision   │  │ GoogleVision     │  │ MockVision   │
│ Provider           │  │ Provider         │  │ Provider     │
│                    │  │                  │  │              │
│ Uses:              │  │ Uses:            │  │ Uses:        │
│ - chatCompletionJ  │  │ - Google Vision  │  │ - In-memory  │
│ - OpenRouter API   │  │   API            │  │   mock data  │
│ - Claude 3.5       │  │ - Vertex AI      │  │              │
└────────────────────┘  └──────────────────┘  └──────────────┘
```

## Class Diagram

```typescript
┌──────────────────────────────────────────────────────────────┐
│ <<interface>>                                                │
│ IVisionProvider                                              │
├──────────────────────────────────────────────────────────────┤
│ + analyzeImage<T>(url: string, prompt: string): Promise<T>  │
│ + analyzeImageText(url: string, prompt: string): Promise<S> │
│ + analyzeMultipleImages(urls: string[], ...): Promise<S>    │
└──────────────────────────────────────────────────────────────┘
                           ▲
                           │ implements
                           │
┌──────────────────────────┴───────────────────────────────────┐
│                                                               │
│  OpenRouterVisionProvider                                    │
├───────────────────────────────────────────────────────────────┤
│ - defaultModel: OpenRouterModel                              │
│ - defaultTemperature: number                                 │
│ - defaultMaxTokens: number                                   │
├───────────────────────────────────────────────────────────────┤
│ + constructor(model?, temp?, maxTokens?)                     │
│ + analyzeImage<T>(url, prompt): Promise<T>                   │
│ + analyzeImageText(url, prompt): Promise<string>             │
│ + analyzeMultipleImages(urls, prompt): Promise<string>       │
│ + static withOptions(opts): OpenRouterVisionProvider         │
└───────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────┐
│ LicensePlateDetectionService                                 │
├───────────────────────────────────────────────────────────────┤
│ - visionProvider: IVisionProvider                            │
│ - modelName: string                                          │
├───────────────────────────────────────────────────────────────┤
│ + constructor(visionProvider?: IVisionProvider)              │
│ + detectLicensePlates(url): Promise<PlateDetectionResult>   │
│ + batchDetectLicensePlates(urls): Promise<Map<...>>         │
│ + needsPlateBlurring(url, threshold?): Promise<boolean>     │
│ + detectAndBlurPlates(url): Promise<{detection, blur}>      │
└───────────────────────────────────────────────────────────────┘
```

## Sequence Diagram: License Plate Detection

```
API Route                Service                Provider               OpenRouter
   │                        │                        │                      │
   │  detectLicensePlates() │                        │                      │
   │───────────────────────>│                        │                      │
   │                        │                        │                      │
   │                        │  analyzeImage<T>()     │                      │
   │                        │───────────────────────>│                      │
   │                        │                        │                      │
   │                        │                        │  POST /chat/compl... │
   │                        │                        │─────────────────────>│
   │                        │                        │                      │
   │                        │                        │  {hasLicensePlate... │
   │                        │                        │<─────────────────────│
   │                        │                        │                      │
   │                        │  AIPlateDetectionResp  │                      │
   │                        │<───────────────────────│                      │
   │                        │                        │                      │
   │  PlateDetectionResult  │                        │                      │
   │<───────────────────────│                        │                      │
   │                        │                        │                      │
```

## Data Flow

```
Input Image URL
      │
      ▼
┌──────────────────────────┐
│  LicensePlateDetection   │
│  Service                 │
└──────────┬───────────────┘
           │
           │ Prompt: "Analyze this car photo for license plates..."
           ▼
┌──────────────────────────┐
│  IVisionProvider         │
│  (OpenRouterVision)      │
└──────────┬───────────────┘
           │
           │ HTTP Request with image + prompt
           ▼
┌──────────────────────────┐
│  OpenRouter API          │
│  (Claude 3.5 Sonnet)     │
└──────────┬───────────────┘
           │
           │ JSON Response
           ▼
┌──────────────────────────┐
│  {                       │
│    hasLicensePlate: true │
│    plates: [             │
│      {                   │
│        x: 10,            │
│        y: 20,            │
│        width: 30,        │
│        height: 5,        │
│        confidence: 0.95  │
│      }                   │
│    ]                     │
│  }                       │
└──────────┬───────────────┘
           │
           │ Normalize coordinates (0-100 range)
           ▼
┌──────────────────────────┐
│  PlateDetectionResult    │
│  {                       │
│    detected: true,       │
│    plates: [...],        │
│    processingTime: 450ms │
│    model: "claude-3.5"   │
│  }                       │
└──────────────────────────┘
```

## Component Responsibilities

### 1. IVisionProvider Interface
**Responsibility:** Define contract for vision analysis
**Location:** `/src/services/contracts/vision-provider.interface.ts`
**Exports:**
- `IVisionProvider` - Core interface
- `VisionAnalysisOptions` - Configuration type

### 2. OpenRouterVisionProvider
**Responsibility:** Implement vision analysis using OpenRouter API
**Location:** `/src/services/providers/openrouter-vision.provider.ts`
**Dependencies:**
- `@/lib/openrouter` - OpenRouter client
**Exports:**
- `OpenRouterVisionProvider` - Class implementation
- `createOpenRouterVisionProvider()` - Factory function

### 3. LicensePlateDetectionService
**Responsibility:** Business logic for license plate detection
**Location:** `/src/services/ai/license-plate.service.ts`
**Dependencies:**
- `IVisionProvider` - Vision analysis abstraction
**Exports:**
- `LicensePlateDetectionService` - Main service class
- `detectLicensePlates()` - Backward-compatible function (deprecated)
- `PlateDetectionResult`, `PlateDetectionBox` - Types

## Dependency Graph

```
LicensePlateDetectionService
    │
    ├─> IVisionProvider (interface)
    │       │
    │       └─> OpenRouterVisionProvider (implementation)
    │               │
    │               └─> OpenRouter Client (@/lib/openrouter)
    │                       │
    │                       └─> OpenRouter API (external)
    │
    └─> sharp (image processing)
```

## Extension Points

### Adding a New Provider

1. **Create Provider Class**
```typescript
// src/services/providers/google-vision.provider.ts
export class GoogleVisionProvider implements IVisionProvider {
  async analyzeImage<T>(url: string, prompt: string): Promise<T> {
    // Google Vision API implementation
  }
}
```

2. **Export from Providers**
```typescript
// src/services/providers/index.ts
export { GoogleVisionProvider } from './google-vision.provider'
```

3. **Use in Service**
```typescript
// Usage
const googleProvider = new GoogleVisionProvider()
const service = new LicensePlateDetectionService(googleProvider)
```

### Adding Decorators

```typescript
// Caching decorator
class CachedVisionProvider implements IVisionProvider {
  constructor(private provider: IVisionProvider) {}
  // ... implementation with caching
}

// Rate limiting decorator
class RateLimitedVisionProvider implements IVisionProvider {
  constructor(private provider: IVisionProvider) {}
  // ... implementation with rate limiting
}

// Compose decorators
const provider = new RateLimitedVisionProvider(
  new CachedVisionProvider(
    new OpenRouterVisionProvider()
  )
)
```

## Testing Strategy

### Unit Tests
- Mock `IVisionProvider` for fast, isolated tests
- Test business logic without external dependencies
- Location: `/src/services/ai/__tests__/license-plate.service.test.ts`

### Integration Tests
- Test real `OpenRouterVisionProvider` with API
- Verify JSON schema parsing
- Test error handling

### E2E Tests
- Test full flow from image upload to plate detection
- Verify blurring functionality
- Test with various image types

## Performance Characteristics

| Operation | Complexity | Typical Time |
|-----------|-----------|--------------|
| Single detection | O(1) | 500-2000ms |
| Batch detection (n images) | O(n) | n × 500ms |
| Coordinate normalization | O(p) | < 1ms |
| Blurring | O(w×h×p) | 50-200ms |

Where:
- n = number of images
- p = number of plates detected
- w, h = image dimensions

## Configuration

### Environment Variables
```env
OPENROUTER_API_KEY=sk-or-...
NEXTAUTH_URL=https://finds.ro
```

### Provider Options
```typescript
const provider = createOpenRouterVisionProvider({
  model: 'anthropic/claude-3.5-sonnet',
  temperature: 0.1,
  maxTokens: 1024,
  imageDetail: 'high',
})
```

## Error Handling

```
LicensePlateDetectionService
    │
    ├─> Vision API Error
    │   └─> Return { detected: false, error: 'API error' }
    │
    ├─> Invalid Image URL
    │   └─> Return { detected: false, error: 'Invalid URL' }
    │
    ├─> JSON Parse Error
    │   └─> Return { detected: false, error: 'Parse error' }
    │
    └─> Network Timeout
        └─> Return { detected: false, error: 'Timeout' }
```

## Future Roadmap

1. **Q1 2025:** Add caching layer for repeated detections
2. **Q2 2025:** Implement Google Vision provider
3. **Q3 2025:** Add Azure Computer Vision provider
4. **Q4 2025:** Implement provider failover strategy
5. **Future:** Consider edge runtime for faster processing
