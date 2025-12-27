# Image Processing Services

This directory contains image processing services following the Single Responsibility Principle (SRP).

## Architecture

The image processing functionality has been refactored from a monolithic function into separate concerns:

### Services

#### `image-processor.service.ts`
**Responsibility:** Image operations (fetch, metadata, blur, format conversion)

Implements `IImageProcessor` interface using Sharp library:
- `fetchImage(url)` - Fetch image from URL
- `getMetadata(buffer)` - Extract image metadata (width, height, format)
- `blurRegions(buffer, regions)` - Blur specific regions
- `toJpeg(buffer, options)` - Convert to JPEG
- `toPng(buffer, options)` - Convert to PNG

**Usage:**
```typescript
import { createImageProcessor } from '@/services/image/image-processor.service'

const processor = createImageProcessor()
const buffer = await processor.fetchImage(url)
const metadata = await processor.getMetadata(buffer)
```

### Utilities

#### `coordinate-transformer.ts`
**Responsibility:** Pure coordinate transformation functions

All functions are pure (no side effects):
- `percentageToPixelCoordinates(box, dimensions)` - Convert percentage coordinates to pixels
- `pixelToPercentageCoordinates(box, dimensions)` - Convert pixels to percentages
- `expandPercentageBox(box, margin)` - Expand percentage-based box
- `expandPixelBox(box, margin, dimensions)` - Expand pixel-based box
- `clampToImageBounds(box, dimensions)` - Ensure box fits in image
- `isValidBox(box)` - Validate box has positive dimensions

**Usage:**
```typescript
import { percentageToPixelCoordinates, expandPercentageBox } from '@/services/image/coordinate-transformer'

const percentBox = { x: 10, y: 20, width: 30, height: 40 }
const expanded = expandPercentageBox(percentBox, 15)
const pixelBox = percentageToPixelCoordinates(expanded, { width: 1000, height: 800 })
```

## Integration with License Plate Service

The `blurLicensePlates` function in `@/services/ai/license-plate.service.ts` now acts as an orchestrator:

**Before (SRP Violation):**
```typescript
// 350+ lines handling:
// - Image fetching
// - Metadata extraction
// - Coordinate transformation
// - Region extraction
// - Blurring
// - Compositing
// - Format conversion
```

**After (SRP Compliant):**
```typescript
export async function blurLicensePlates(
  imageUrl: string,
  plates: PlateDetectionBox[],
  blurRadius?: number,
  imageProcessor?: IImageProcessor
): Promise<BlurResult> {
  const processor = imageProcessor || getDefaultImageProcessor()

  // 1. Fetch image
  const buffer = await processor.fetchImage(imageUrl)

  // 2. Get metadata
  const metadata = await processor.getMetadata(buffer)

  // 3. Transform coordinates
  const regions = plates
    .map(plate => expandPercentageBox(plate, margin))
    .map(box => percentageToPixelCoordinates(box, metadata))
    .map(box => clampToImageBounds(box, metadata))
    .filter(isValidBox)

  // 4. Blur regions
  const blurred = await processor.blurRegions(buffer, regions, radius)

  // 5. Convert to JPEG
  return await processor.toJpeg(blurred, { quality: 90 })
}
```

## Dependency Injection

The `ImageProcessorService` is registered in the container (`@/lib/container.ts`):

```typescript
export type ServiceContainer = {
  // ... other services
  imageProcessor: IImageProcessor
  // ...
}

function createContainer(): ServiceContainer {
  return {
    // ... other services
    imageProcessor: new ImageProcessorService(),
    // ...
  }
}
```

This enables:
- **Testing:** Inject mock processors
- **Flexibility:** Swap implementations (e.g., use WebP instead of JPEG)
- **Testability:** Test blurring logic without actual image processing

## Testing

### Unit Tests

Coordinate transformer has comprehensive unit tests:
```bash
npm test -- coordinate-transformer.test.ts
```

### Integration Tests

Mock the image processor in tests:
```typescript
const mockProcessor: IImageProcessor = {
  fetchImage: jest.fn().mockResolvedValue(mockBuffer),
  getMetadata: jest.fn().mockResolvedValue({ width: 1000, height: 800 }),
  blurRegions: jest.fn().mockResolvedValue(mockBlurredBuffer),
  toJpeg: jest.fn().mockResolvedValue(mockJpegBuffer),
  toPng: jest.fn().mockResolvedValue(mockPngBuffer),
}

await blurLicensePlates(url, plates, 30, mockProcessor)
```

## Benefits of This Architecture

1. **Single Responsibility:** Each module has one reason to change
   - Image operations → `ImageProcessorService`
   - Coordinate math → `coordinate-transformer`
   - Orchestration → `blurLicensePlates`

2. **Testability:** Pure functions are easy to test
   - Coordinate transformations have 100% test coverage
   - Image processing can be mocked

3. **Reusability:** Services can be used independently
   - Use `ImageProcessor` for thumbnails, watermarks, etc.
   - Use coordinate transformer for any bounding box math

4. **Open/Closed Principle:** Easy to extend
   - Add new image operations to `IImageProcessor`
   - Add new coordinate transformations without changing existing code

5. **Dependency Inversion:** Depend on abstractions
   - `blurLicensePlates` depends on `IImageProcessor`, not Sharp
   - Easy to swap image processing library

## Migration Notes

The old helper functions are deprecated but still work for backward compatibility:
- `calculatePixelCoordinates()` → Use `percentageToPixelCoordinates()`
- `expandBoundingBox()` → Use `expandPercentageBox()`

These will be removed in a future version.
