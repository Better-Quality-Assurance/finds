/**
 * Image Processor Service Interface
 *
 * Defines contract for image processing operations including fetching,
 * metadata extraction, region blurring, and format conversion.
 *
 * Follows Interface Segregation Principle with focused responsibilities.
 */

/**
 * Image metadata extracted from a buffer
 */
export interface ImageMetadata {
  width: number
  height: number
  format: string
  hasAlpha: boolean
  channels: number
  size: number
}

/**
 * Region to blur in an image (pixel coordinates)
 */
export interface BlurRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Options for JPEG conversion
 */
export interface JpegOptions {
  quality?: number
}

/**
 * Options for PNG conversion
 */
export interface PngOptions {
  compressionLevel?: number
}

/**
 * Image processing service interface
 */
export interface IImageProcessor {
  /**
   * Fetch image from URL and return as buffer
   * @param url - URL of the image to fetch
   * @returns Promise resolving to image buffer
   * @throws Error if fetch fails or response is not OK
   */
  fetchImage(url: string): Promise<Buffer>

  /**
   * Get metadata from an image buffer
   * @param buffer - Image data
   * @returns Promise resolving to image metadata
   * @throws Error if image cannot be read
   */
  getMetadata(buffer: Buffer): Promise<ImageMetadata>

  /**
   * Blur specific regions in an image
   * @param buffer - Original image data
   * @param regions - Array of regions to blur (pixel coordinates)
   * @param blurRadius - Blur intensity (default 30)
   * @returns Promise resolving to blurred image buffer
   * @throws Error if processing fails
   */
  blurRegions(
    buffer: Buffer,
    regions: BlurRegion[],
    blurRadius?: number
  ): Promise<Buffer>

  /**
   * Convert image to JPEG format
   * @param buffer - Image data
   * @param options - JPEG conversion options
   * @returns Promise resolving to JPEG buffer
   * @throws Error if conversion fails
   */
  toJpeg(buffer: Buffer, options?: JpegOptions): Promise<Buffer>

  /**
   * Convert image to PNG format
   * @param buffer - Image data
   * @param options - PNG conversion options
   * @returns Promise resolving to PNG buffer
   * @throws Error if conversion fails
   */
  toPng(buffer: Buffer, options?: PngOptions): Promise<Buffer>
}
