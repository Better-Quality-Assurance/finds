/**
 * Image Processing Examples
 *
 * Demonstrates how to use the image processing services
 */

import { createImageProcessor } from './image-processor.service'
import {
  percentageToPixelCoordinates,
  expandPercentageBox,
  clampToImageBounds,
  isValidBox,
} from './coordinate-transformer'
import { blurLicensePlates } from '../ai/license-plate.service'
import type { PlateDetectionBox } from '../ai/license-plate.service'

/**
 * Example 1: Basic image processing
 */
export async function basicImageProcessingExample() {
  const processor = createImageProcessor()

  // Fetch an image
  const imageUrl = 'https://example.com/car.jpg'
  const buffer = await processor.fetchImage(imageUrl)

  // Get metadata
  const metadata = await processor.getMetadata(buffer)
  console.log(`Image size: ${metadata.width}x${metadata.height}`)

  // Blur a specific region (license plate area)
  const regions = [
    { x: 100, y: 200, width: 300, height: 100 }
  ]
  const blurredBuffer = await processor.blurRegions(buffer, regions)

  // Convert to JPEG
  const jpegBuffer = await processor.toJpeg(blurredBuffer, { quality: 90 })
  console.log(`Output size: ${jpegBuffer.length} bytes`)

  return jpegBuffer
}

/**
 * Example 2: Coordinate transformation
 */
export function coordinateTransformationExample() {
  // Define a license plate in percentage coordinates
  const platePercentage = {
    x: 45,      // 45% from left
    y: 60,      // 60% from top
    width: 10,  // 10% of image width
    height: 5,  // 5% of image height
  }

  // Image dimensions
  const imageDimensions = { width: 2000, height: 1500 }

  // Expand box by 15% margin for full coverage
  const expandedBox = expandPercentageBox(platePercentage, 15)
  console.log('Expanded box (%):', expandedBox)

  // Convert to pixel coordinates
  const pixelBox = percentageToPixelCoordinates(expandedBox, imageDimensions)
  console.log('Pixel coordinates:', pixelBox)

  // Ensure it's within bounds
  const clampedBox = clampToImageBounds(pixelBox, imageDimensions)
  console.log('Clamped box:', clampedBox)

  // Validate
  const valid = isValidBox(clampedBox)
  console.log('Is valid:', valid)

  return clampedBox
}

/**
 * Example 3: Blur license plates with custom processor
 */
export async function blurLicensePlatesExample() {
  const imageUrl = 'https://example.com/car-with-plates.jpg'

  // Detected license plates (from AI detection)
  const detectedPlates: PlateDetectionBox[] = [
    {
      x: 45,
      y: 60,
      width: 10,
      height: 5,
      confidence: 0.95,
      plateType: 'front',
    },
    {
      x: 48,
      y: 85,
      width: 8,
      height: 4,
      confidence: 0.88,
      plateType: 'rear',
    },
  ]

  // Use default processor
  const result = await blurLicensePlates(imageUrl, detectedPlates)

  if (result.success && result.blurredBuffer) {
    console.log(`Successfully blurred ${result.platesBlurred} plates`)
    console.log(`Output type: ${result.blurredMimeType}`)
    return result.blurredBuffer
  } else {
    console.error('Blurring failed:', result.error)
    throw new Error(result.error)
  }
}

/**
 * Example 4: Custom image processor for testing
 */
export async function customProcessorExample() {
  // Create a custom processor (or mock for testing)
  const customProcessor = createImageProcessor()

  const imageUrl = 'https://example.com/test-car.jpg'
  const plates: PlateDetectionBox[] = [
    { x: 50, y: 70, width: 8, height: 4, confidence: 0.9, plateType: 'front' },
  ]

  // Pass custom processor
  const result = await blurLicensePlates(
    imageUrl,
    plates,
    40, // Custom blur radius
    customProcessor
  )

  return result
}

/**
 * Example 5: Batch processing multiple regions
 */
export async function batchBlurExample() {
  const processor = createImageProcessor()

  const imageUrl = 'https://example.com/car.jpg'
  const buffer = await processor.fetchImage(imageUrl)
  const metadata = await processor.getMetadata(buffer)

  // Multiple sensitive regions to blur (plates, faces, VINs, etc.)
  const sensitiveRegions = [
    { x: 45, y: 60, width: 10, height: 5 },  // Front plate
    { x: 48, y: 85, width: 8, height: 4 },   // Rear plate
    { x: 20, y: 30, width: 5, height: 7 },   // Face in window
    { x: 65, y: 50, width: 12, height: 3 },  // VIN on dashboard
  ]

  // Convert all to pixel coordinates with expansion
  const pixelRegions = sensitiveRegions
    .map(region => expandPercentageBox(region, 15))
    .map(region => percentageToPixelCoordinates(region, metadata))
    .map(region => clampToImageBounds(region, metadata))
    .filter(isValidBox)

  console.log(`Blurring ${pixelRegions.length} regions`)

  // Blur all regions in one operation
  const blurredBuffer = await processor.blurRegions(buffer, pixelRegions, 35)
  const output = await processor.toJpeg(blurredBuffer, { quality: 85 })

  return output
}

/**
 * Example 6: Error handling
 */
export async function errorHandlingExample() {
  try {
    const processor = createImageProcessor()

    // Invalid URL
    await processor.fetchImage('not-a-valid-url')
  } catch (error) {
    console.error('Fetch failed:', error)
  }

  try {
    const processor = createImageProcessor()

    // Invalid buffer
    const invalidBuffer = Buffer.from('not-an-image')
    await processor.getMetadata(invalidBuffer)
  } catch (error) {
    console.error('Metadata extraction failed:', error)
  }

  try {
    const processor = createImageProcessor()

    const buffer = await processor.fetchImage('https://example.com/car.jpg')

    // Invalid region (negative dimensions)
    await processor.blurRegions(buffer, [
      { x: 100, y: 100, width: -50, height: 100 }
    ])
  } catch (error) {
    console.error('Blur failed:', error)
  }
}
