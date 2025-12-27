/**
 * Sharp-based Image Processor Service
 *
 * Implements IImageProcessor using the Sharp library for high-performance
 * image processing operations.
 *
 * Follows Single Responsibility Principle - focuses only on image operations.
 */

import sharp from 'sharp'
import type {
  IImageProcessor,
  ImageMetadata,
  BlurRegion,
  JpegOptions,
  PngOptions,
} from '@/services/contracts/image-processor.interface'

/**
 * Sharp-based implementation of image processing service
 */
export class ImageProcessorService implements IImageProcessor {
  /**
   * Fetch image from URL and return as buffer
   */
  async fetchImage(url: string): Promise<Buffer> {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Get metadata from an image buffer
   */
  async getMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(buffer).metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not extract image dimensions')
    }

    if (!metadata.format) {
      throw new Error('Could not detect image format')
    }

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha || false,
      channels: metadata.channels || 3,
      size: metadata.size || buffer.length,
    }
  }

  /**
   * Blur specific regions in an image
   *
   * Strategy:
   * 1. Extract each region from the original image
   * 2. Apply blur to the extracted region
   * 3. Composite the blurred region back onto the image
   * 4. Repeat for all regions
   */
  async blurRegions(
    buffer: Buffer,
    regions: BlurRegion[],
    blurRadius: number = 30
  ): Promise<Buffer> {
    if (regions.length === 0) {
      return buffer
    }

    // Validate blur radius
    if (blurRadius <= 0) {
      throw new Error('Blur radius must be positive')
    }

    // Start with the original image
    let processedBuffer = buffer

    // Process each region sequentially
    for (const region of regions) {
      // Validate region dimensions
      if (region.width <= 0 || region.height <= 0) {
        console.warn('Skipping invalid region with non-positive dimensions:', region)
        continue
      }

      try {
        // Extract the region, blur it, and get the blurred buffer
        const blurredRegion = await sharp(buffer)
          .extract({
            left: region.x,
            top: region.y,
            width: region.width,
            height: region.height,
          })
          .blur(blurRadius)
          .toBuffer()

        // Composite the blurred region back onto the processed image
        processedBuffer = await sharp(processedBuffer)
          .composite([
            {
              input: blurredRegion,
              left: region.x,
              top: region.y,
            },
          ])
          .toBuffer()
      } catch (error) {
        console.error('Error blurring region:', region, error)
        throw new Error(
          `Failed to blur region at (${region.x}, ${region.y}): ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        )
      }
    }

    return processedBuffer
  }

  /**
   * Convert image to JPEG format
   */
  async toJpeg(buffer: Buffer, options?: JpegOptions): Promise<Buffer> {
    const quality = options?.quality ?? 90

    // Validate quality
    if (quality < 1 || quality > 100) {
      throw new Error('JPEG quality must be between 1 and 100')
    }

    return sharp(buffer).jpeg({ quality }).toBuffer()
  }

  /**
   * Convert image to PNG format
   */
  async toPng(buffer: Buffer, options?: PngOptions): Promise<Buffer> {
    const compressionLevel = options?.compressionLevel ?? 6

    // Validate compression level
    if (compressionLevel < 0 || compressionLevel > 9) {
      throw new Error('PNG compression level must be between 0 and 9')
    }

    return sharp(buffer).png({ compressionLevel }).toBuffer()
  }
}

/**
 * Create a new image processor service instance
 */
export function createImageProcessor(): IImageProcessor {
  return new ImageProcessorService()
}

/**
 * Default singleton instance for backward compatibility
 */
let defaultProcessor: IImageProcessor | undefined

/**
 * Get the default image processor instance
 */
export function getDefaultImageProcessor(): IImageProcessor {
  if (!defaultProcessor) {
    defaultProcessor = createImageProcessor()
  }
  return defaultProcessor
}
