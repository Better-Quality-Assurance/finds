# Image Processing Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    License Plate Service                         │
│                 (Orchestration Layer)                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  blurLicensePlates(url, plates, blur, processor?)      │    │
│  │                                                         │    │
│  │  Responsibilities:                                      │    │
│  │  - Coordinate workflow                                  │    │
│  │  - Validate inputs                                      │    │
│  │  - Handle errors                                        │    │
│  │  - Return results                                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            │ Uses                                │
│                            ▼                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────────┐  ┌──────────────────────────┐
│   IImageProcessor         │  │ Coordinate Transformer    │
│   (Interface)             │  │ (Pure Functions)          │
│                           │  │                           │
│  - fetchImage()           │  │  - percentageToPixel()    │
│  - getMetadata()          │  │  - pixelToPercentage()    │
│  - blurRegions()          │  │  - expandPercentageBox()  │
│  - toJpeg()               │  │  - expandPixelBox()       │
│  - toPng()                │  │  - clampToImageBounds()   │
└───────────┬───────────────┘  │  - isValidBox()           │
            │                  └──────────────────────────┘
            │ Implemented by
            ▼
┌───────────────────────────┐
│  ImageProcessorService    │
│  (Sharp Implementation)   │
│                           │
│  Uses Sharp library for:  │
│  - Image fetching         │
│  - Metadata extraction    │
│  - Region blurring        │
│  - Format conversion      │
└───────────────────────────┘
            │
            │ Uses
            ▼
┌───────────────────────────┐
│    Sharp Library          │
│  (External Dependency)    │
└───────────────────────────┘
```

## Data Flow

```
User Request
    │
    ├─→ 1. blurLicensePlates(imageUrl, plates)
    │       │
    │       ├─→ 2. processor.fetchImage(url)
    │       │       └─→ Sharp: Fetch from URL → Buffer
    │       │
    │       ├─→ 3. processor.getMetadata(buffer)
    │       │       └─→ Sharp: Extract metadata → { width, height, ... }
    │       │
    │       ├─→ 4. Transform coordinates
    │       │       ├─→ expandPercentageBox(plate, margin)
    │       │       ├─→ percentageToPixelCoordinates(box, dimensions)
    │       │       ├─→ clampToImageBounds(box, dimensions)
    │       │       └─→ isValidBox(box)
    │       │
    │       ├─→ 5. processor.blurRegions(buffer, regions)
    │       │       └─→ Sharp: Extract → Blur → Composite → Buffer
    │       │
    │       └─→ 6. processor.toJpeg(buffer, options)
    │               └─→ Sharp: Convert to JPEG → Buffer
    │
    └─→ Result: { success, blurredBuffer, platesBlurred }
```

## Dependency Graph

```
┌────────────────────────────────────────────────────┐
│                                                     │
│  Service Container (container.ts)                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  Production Container                        │ │
│  │  - imageProcessor: ImageProcessorService     │ │
│  │  - mediaProcessing: MediaProcessingService   │ │
│  │  - ... other services                        │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  Test Container                              │ │
│  │  - imageProcessor: Mock Implementation       │ │
│  │  - ... other mock services                   │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
└────────────────────────────────────────────────────┘
```

## Layer Separation

```
┌─────────────────────────────────────────────────────────┐
│  API Layer                                              │
│  - Route handlers                                       │
│  - Request validation                                   │
│  - Response formatting                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Service Layer (Business Logic)                         │
│  - LicensePlateDetectionService                         │
│  - blurLicensePlates (orchestrator)                     │
│  - MediaProcessingService                               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Infrastructure Layer                                   │
│  - ImageProcessorService                                │
│  - Coordinate Transformer (utilities)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  External Dependencies                                  │
│  - Sharp (image processing)                             │
│  - Fetch (HTTP requests)                                │
└─────────────────────────────────────────────────────────┘
```

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
Each component has one reason to change:

```
ImageProcessorService
├─ Reason to change: Image processing library updates
└─ NOT affected by: Coordinate math, business logic

CoordinateTransformer
├─ Reason to change: Coordinate calculation algorithms
└─ NOT affected by: Image operations, business logic

blurLicensePlates
├─ Reason to change: Workflow orchestration logic
└─ NOT affected by: Image operations, coordinate math
```

### Open/Closed Principle (OCP)
Extend functionality without modifying existing code:

```
Add WebP support:
  ✓ Add toWebp() to IImageProcessor interface
  ✓ Implement in ImageProcessorService
  ✗ No changes to blurLicensePlates needed

Add rotation transformation:
  ✓ Add rotateCoordinates() to coordinate-transformer
  ✗ No changes to ImageProcessorService needed
```

### Liskov Substitution Principle (LSP)
Any implementation of IImageProcessor can be substituted:

```
Production: ImageProcessorService (uses Sharp)
Testing: MockImageProcessor (uses stubs)
Alternative: JimpImageProcessor (uses Jimp library)

All work with blurLicensePlates() without changes
```

### Interface Segregation Principle (ISP)
Clients depend only on methods they use:

```
IImageProcessor is focused:
  - Only image operations
  - No coordinate math
  - No business logic
  - No database access

If you only need coordinate transforms:
  → Import from coordinate-transformer
  → Don't depend on IImageProcessor
```

### Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions:

```
blurLicensePlates depends on:
  ✓ IImageProcessor (abstraction)
  ✗ NOT Sharp directly (concrete)
  ✗ NOT ImageProcessorService directly (concrete)

Benefits:
  - Easy to swap implementations
  - Easy to test with mocks
  - Decoupled from external libraries
```

## Testing Strategy

```
┌─────────────────────────────────────────────────────────┐
│  Unit Tests                                             │
│                                                          │
│  coordinate-transformer.test.ts                         │
│  ├─ Test pure functions in isolation                    │
│  ├─ No mocks needed (pure functions)                    │
│  ├─ Fast execution (no I/O)                             │
│  └─ 100% coverage achievable                            │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Integration Tests                                       │
│                                                          │
│  image-processor.test.ts                                │
│  ├─ Test with real Sharp library                        │
│  ├─ Use test images                                     │
│  ├─ Verify actual blurring works                        │
│  └─ Slower but ensures Sharp integration                │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Service Tests                                           │
│                                                          │
│  license-plate.service.test.ts                          │
│  ├─ Mock IImageProcessor                                │
│  ├─ Test orchestration logic                            │
│  ├─ Verify coordinate transformations                   │
│  └─ Fast (no real image processing)                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Performance Characteristics

```
Operation                     Time Complexity    Space Complexity
─────────────────────────────────────────────────────────────────
fetchImage()                  O(n)               O(n)
getMetadata()                 O(1)               O(1)
percentageToPixelCoordinates  O(1)               O(1)
expandPercentageBox           O(1)               O(1)
blurRegions (k regions)       O(k * r²)          O(n + k*r²)
toJpeg()                      O(n)               O(n)

where:
  n = image size in bytes
  k = number of regions
  r = average region size
```

## Memory Management

```
┌─────────────────────────────────────────────────────────┐
│  Workflow                         Memory Usage           │
├─────────────────────────────────────────────────────────┤
│  1. fetchImage()                  +imageSize             │
│  2. getMetadata()                 +metadata (~1KB)       │
│  3. Transform coordinates         +regions (~100B)       │
│  4. blurRegions()                 +imageSize (working)   │
│  5. toJpeg()                      +outputSize            │
│  6. Return result                 Release working mem    │
└─────────────────────────────────────────────────────────┘

Peak memory: ~2.5x image size
```

## Error Handling

```
Error Type              Handled By                Action
──────────────────────────────────────────────────────────
Network error           ImageProcessor            Throw with context
Invalid image           ImageProcessor            Throw with context
Invalid coordinates     CoordinateTransformer     Clamp/filter
Blur error              ImageProcessor            Throw with context
Format error            ImageProcessor            Throw with context
Orchestration error     blurLicensePlates         Return error result
```

## Future Enhancements

### Planned
- [ ] WebP/AVIF output format support
- [ ] Batch processing optimization
- [ ] Image caching layer
- [ ] GPU-accelerated blurring
- [ ] Advanced blur algorithms (Gaussian, box, motion)

### Under Consideration
- [ ] Async/streaming image processing
- [ ] Progressive blurring for UX
- [ ] Client-side blurring (WebAssembly)
- [ ] Machine learning-based region detection
