/**
 * Coordinate Transformation Utilities
 *
 * Pure functions for transforming coordinates between percentage-based
 * and pixel-based coordinate systems.
 *
 * Follows Single Responsibility Principle - only handles coordinate math.
 */

/**
 * Percentage-based bounding box (0-100)
 */
export interface PercentageBox {
  x: number      // Left edge percentage
  y: number      // Top edge percentage
  width: number  // Width percentage
  height: number // Height percentage
}

/**
 * Pixel-based bounding box
 */
export interface PixelBox {
  x: number      // Left edge in pixels
  y: number      // Top edge in pixels
  width: number  // Width in pixels
  height: number // Height in pixels
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number
  height: number
}

/**
 * Convert percentage-based coordinates to pixel coordinates
 *
 * @param box - Bounding box in percentage coordinates (0-100)
 * @param dimensions - Image dimensions in pixels
 * @returns Bounding box in pixel coordinates
 *
 * @example
 * const percentBox = { x: 10, y: 20, width: 30, height: 40 }
 * const dims = { width: 1000, height: 800 }
 * const pixelBox = percentageToPixelCoordinates(percentBox, dims)
 * // Result: { x: 100, y: 160, width: 300, height: 320 }
 */
export function percentageToPixelCoordinates(
  box: PercentageBox,
  dimensions: ImageDimensions
): PixelBox {
  return {
    x: Math.round((box.x / 100) * dimensions.width),
    y: Math.round((box.y / 100) * dimensions.height),
    width: Math.round((box.width / 100) * dimensions.width),
    height: Math.round((box.height / 100) * dimensions.height),
  }
}

/**
 * Convert pixel coordinates to percentage-based coordinates
 *
 * @param box - Bounding box in pixel coordinates
 * @param dimensions - Image dimensions in pixels
 * @returns Bounding box in percentage coordinates (0-100)
 *
 * @example
 * const pixelBox = { x: 100, y: 160, width: 300, height: 320 }
 * const dims = { width: 1000, height: 800 }
 * const percentBox = pixelToPercentageCoordinates(pixelBox, dims)
 * // Result: { x: 10, y: 20, width: 30, height: 40 }
 */
export function pixelToPercentageCoordinates(
  box: PixelBox,
  dimensions: ImageDimensions
): PercentageBox {
  return {
    x: (box.x / dimensions.width) * 100,
    y: (box.y / dimensions.height) * 100,
    width: (box.width / dimensions.width) * 100,
    height: (box.height / dimensions.height) * 100,
  }
}

/**
 * Expand a percentage-based bounding box by a margin
 *
 * @param box - Original bounding box in percentage coordinates
 * @param marginPercent - Expansion margin as percentage of box size (e.g., 10 = 10%)
 * @returns Expanded bounding box, clamped to 0-100 range
 *
 * @example
 * const box = { x: 20, y: 30, width: 40, height: 20 }
 * const expanded = expandPercentageBox(box, 10)
 * // Expands by 10% of width/height on all sides
 * // Result: { x: 16, y: 28, width: 48, height: 24 }
 */
export function expandPercentageBox(
  box: PercentageBox,
  marginPercent: number
): PercentageBox {
  const expandX = (box.width * marginPercent) / 100
  const expandY = (box.height * marginPercent) / 100

  const newX = Math.max(0, box.x - expandX)
  const newY = Math.max(0, box.y - expandY)
  const newWidth = Math.min(100 - newX, box.width + 2 * expandX)
  const newHeight = Math.min(100 - newY, box.height + 2 * expandY)

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  }
}

/**
 * Expand a pixel-based bounding box by a margin
 *
 * @param box - Original bounding box in pixel coordinates
 * @param marginPixels - Expansion margin in pixels
 * @param dimensions - Image dimensions for bounds checking
 * @returns Expanded bounding box, clamped to image dimensions
 *
 * @example
 * const box = { x: 100, y: 100, width: 200, height: 150 }
 * const dims = { width: 1000, height: 800 }
 * const expanded = expandPixelBox(box, 20, dims)
 * // Result: { x: 80, y: 80, width: 240, height: 190 }
 */
export function expandPixelBox(
  box: PixelBox,
  marginPixels: number,
  dimensions: ImageDimensions
): PixelBox {
  const newX = Math.max(0, box.x - marginPixels)
  const newY = Math.max(0, box.y - marginPixels)
  const newWidth = Math.min(
    dimensions.width - newX,
    box.width + 2 * marginPixels
  )
  const newHeight = Math.min(
    dimensions.height - newY,
    box.height + 2 * marginPixels
  )

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  }
}

/**
 * Clamp pixel coordinates to valid image bounds
 *
 * @param box - Bounding box in pixel coordinates
 * @param dimensions - Image dimensions
 * @returns Bounding box clamped to image bounds
 *
 * @example
 * const box = { x: -10, y: 5, width: 2000, height: 100 }
 * const dims = { width: 1000, height: 800 }
 * const clamped = clampToImageBounds(box, dims)
 * // Result: { x: 0, y: 5, width: 1000, height: 100 }
 */
export function clampToImageBounds(
  box: PixelBox,
  dimensions: ImageDimensions
): PixelBox {
  const x = Math.max(0, Math.min(box.x, dimensions.width - 1))
  const y = Math.max(0, Math.min(box.y, dimensions.height - 1))
  const width = Math.min(box.width, dimensions.width - x)
  const height = Math.min(box.height, dimensions.height - y)

  return { x, y, width, height }
}

/**
 * Check if a bounding box is valid (non-zero dimensions)
 *
 * @param box - Bounding box to validate
 * @returns True if box has positive width and height
 */
export function isValidBox(box: PixelBox | PercentageBox): boolean {
  return box.width > 0 && box.height > 0
}
