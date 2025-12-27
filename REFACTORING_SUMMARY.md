# License Plate Blurring Service - SRP Refactoring

## Overview

Refactored the `blurLicensePlates` function to eliminate Single Responsibility Principle (SRP) violations by separating concerns into dedicated services and utilities.

## Problem

The original `blurLicensePlates` function (lines 348-424) handled 6 different responsibilities:

1. Image fetching from URLs
2. Image metadata extraction
3. Coordinate transformation (percentage to pixels)
4. Plate region extraction and blurring
5. Image compositing
6. Format conversion (to JPEG)

This violated SRP - the function had too many reasons to change.

## Solution

### New Architecture

Created three focused modules:

#### 1. Image Processor Service (`src/services/image/image-processor.service.ts`)
**Responsibility:** All image operations using Sharp library

```typescript
interface IImageProcessor {
  fetchImage(url: string): Promise<Buffer>
  getMetadata(buffer: Buffer): Promise<ImageMetadata>
  blurRegions(buffer: Buffer, regions: BlurRegion[], blurRadius?: number): Promise<Buffer>
  toJpeg(buffer: Buffer, options?: JpegOptions): Promise<Buffer>
  toPng(buffer: Buffer, options?: PngOptions): Promise<Buffer>
}
```

#### 2. Coordinate Transformer (`src/services/image/coordinate-transformer.ts`)
**Responsibility:** Pure coordinate transformation functions

```typescript
// Pure functions (no side effects)
percentageToPixelCoordinates(box, dimensions): PixelBox
pixelToPercentageCoordinates(box, dimensions): PercentageBox
expandPercentageBox(box, margin): PercentageBox
expandPixelBox(box, margin, dimensions): PixelBox
clampToImageBounds(box, dimensions): PixelBox
isValidBox(box): boolean
```

#### 3. Simplified Orchestrator (`blurLicensePlates`)
**Responsibility:** Coordinate the blurring workflow

```typescript
export async function blurLicensePlates(
  imageUrl: string,
  plates: PlateDetectionBox[],
  blurRadius?: number,
  imageProcessor?: IImageProcessor  // DI support
): Promise<BlurResult>
```

## Before vs After

### Before (SRP Violation)
```typescript
export async function blurLicensePlates(...) {
  // 80+ lines doing everything:
  const response = await fetch(imageUrl)           // Fetching
  const metadata = await sharp(buffer).metadata()  // Metadata
  const pixelBox = calculatePixelCoordinates(...)  // Coordinates
  const plateRegion = await sharp(buffer).extract(...).blur(...)  // Blurring
  processedImage = sharp(...).composite(...)       // Compositing
  const output = await processedImage.jpeg(...)    // Conversion
}
```

### After (SRP Compliant)
```typescript
export async function blurLicensePlates(...) {
  const processor = imageProcessor || getDefaultImageProcessor()

  // 1. Fetch image (delegates to ImageProcessor)
  const buffer = await processor.fetchImage(imageUrl)

  // 2. Get metadata (delegates to ImageProcessor)
  const metadata = await processor.getMetadata(buffer)

  // 3. Transform coordinates (uses coordinate-transformer)
  const regions = plates
    .map(plate => expandPercentageBox(plate, margin))
    .map(box => percentageToPixelCoordinates(box, metadata))
    .map(box => clampToImageBounds(box, metadata))
    .filter(isValidBox)

  // 4. Blur regions (delegates to ImageProcessor)
  const blurred = await processor.blurRegions(buffer, regions, blurRadius)

  // 5. Convert format (delegates to ImageProcessor)
  const output = await processor.toJpeg(blurred, { quality: 90 })

  return { success: true, blurredBuffer: output, ... }
}
```

## Files Created

1. `/src/services/contracts/image-processor.interface.ts` - Service contract
2. `/src/services/image/image-processor.service.ts` - Sharp implementation
3. `/src/services/image/coordinate-transformer.ts` - Pure coordinate functions
4. `/src/services/image/__tests__/coordinate-transformer.test.ts` - Unit tests
5. `/src/services/image/README.md` - Architecture documentation
6. `/src/services/image/examples.ts` - Usage examples

## Files Modified

1. `/src/services/ai/license-plate.service.ts` - Refactored `blurLicensePlates`
2. `/src/services/contracts/index.ts` - Export new interface
3. `/src/lib/container.ts` - Register ImageProcessor service

## Dependency Injection

The `ImageProcessorService` is now registered in the DI container:

```typescript
// Production container
export type ServiceContainer = {
  // ... other services
  imageProcessor: IImageProcessor
}

const container = createContainer()
container.imageProcessor.blurRegions(...)
```

## Benefits

### 1. Single Responsibility
Each module has one reason to change:
- **ImageProcessor** - Changes to image operations (new blur algorithms, formats)
- **CoordinateTransformer** - Changes to coordinate math
- **blurLicensePlates** - Changes to orchestration logic

### 2. Testability
- Pure functions in `coordinate-transformer` are trivial to test
- Image operations can be mocked via `IImageProcessor`
- No need for actual images in unit tests

```typescript
// Easy to mock
const mockProcessor: IImageProcessor = {
  fetchImage: jest.fn().mockResolvedValue(mockBuffer),
  getMetadata: jest.fn().mockResolvedValue({ width: 1000, height: 800 }),
  // ...
}
```

### 3. Reusability
Services can be used independently:
- Use `ImageProcessor` for thumbnails, watermarks, resizing
- Use coordinate functions for any bounding box calculations
- Use `blurRegions` for blurring faces, VINs, or any sensitive data

### 4. Open/Closed Principle
Easy to extend without modifying existing code:
- Add WebP support → Extend `IImageProcessor`
- Add new transformations → Add to `coordinate-transformer`
- No changes to existing functions

### 5. Dependency Inversion
- `blurLicensePlates` depends on `IImageProcessor`, not Sharp
- Easy to swap image libraries (Jimp, Canvas, etc.)
- Test with mocks, run with real implementation

## Backward Compatibility

Old helper functions still work but are deprecated:

```typescript
// Deprecated but functional
export function calculatePixelCoordinates(...) {
  return percentageToPixelCoordinates(...)  // Delegates to new function
}

export function expandBoundingBox(...) {
  return expandPercentageBox(...)  // Delegates to new function
}
```

## Migration Guide

### For Existing Code
No changes needed - `blurLicensePlates` signature is backward compatible.

### For New Code
Use the new services directly:

```typescript
import { createImageProcessor } from '@/services/image/image-processor.service'
import { percentageToPixelCoordinates } from '@/services/image/coordinate-transformer'

const processor = createImageProcessor()
const buffer = await processor.fetchImage(url)
const metadata = await processor.getMetadata(buffer)
```

### For Tests
Inject mock processor:

```typescript
const mockProcessor = createMockImageProcessor()
await blurLicensePlates(url, plates, 30, mockProcessor)
```

## Testing

Run the new tests:
```bash
npm test -- coordinate-transformer.test.ts
```

All existing tests continue to pass without modification.

## Performance

No performance impact:
- Same Sharp operations under the hood
- Minimal overhead from function calls (negligible)
- Benefits from better code organization outweigh any theoretical overhead

## Future Enhancements

Now that responsibilities are separated:

1. Add WebP/AVIF support easily (`toPng`, `toWebp`, `toAvif`)
2. Batch processing optimization in `ImageProcessor`
3. Caching layer for fetched images
4. GPU-accelerated blurring
5. Different blur algorithms (Gaussian, box, motion blur)
6. Advanced coordinate transformations (rotation, skew)

All without touching the orchestration logic in `blurLicensePlates`.

## Conclusion

The refactoring successfully eliminates the SRP violation while:
- Maintaining backward compatibility
- Improving testability
- Enabling reusability
- Following SOLID principles
- Adding comprehensive documentation

The codebase is now more maintainable, testable, and extensible.
