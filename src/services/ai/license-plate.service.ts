/**
 * AI License Plate Detection Service
 *
 * Detects license plates in car photos using vision AI.
 * Returns bounding box coordinates for blurring.
 * Respects user privacy by auto-blurring plates in public photos.
 *
 * Uses dependency injection to follow Open/Closed Principle.
 */

import type { IVisionProvider } from '@/services/contracts/vision-provider.interface'
import { createOpenRouterVisionProvider } from '@/services/providers/openrouter-vision.provider'
import sharp from 'sharp'

/**
 * Bounding box for a detected license plate
 * Coordinates are percentages (0-100) relative to image dimensions
 */
export interface PlateDetectionBox {
  x: number      // Left edge percentage
  y: number      // Top edge percentage
  width: number  // Width percentage
  height: number // Height percentage
  confidence: number // 0-1 confidence score
  plateType?: 'front' | 'rear' | 'temporary' | 'dealer' | 'unknown'
}

/**
 * Result of license plate detection
 */
export interface PlateDetectionResult {
  detected: boolean
  plates: PlateDetectionBox[]
  processingTime: number // milliseconds
  model: string
  error?: string
}

/**
 * Stored detection data (for database)
 */
export interface StoredPlateDetection {
  detected: boolean
  plates: PlateDetectionBox[]
  analyzedAt: string
  model: string
}

const LICENSE_PLATE_DETECTION_PROMPT = `Analyze this car photo for license plates. Your task is to detect ANY visible license plates (front, rear, temporary, dealer plates, etc.).

Look carefully for:
1. Front license plates - often visible in front-facing shots
2. Rear license plates - visible in back shots
3. Temporary plates in windows
4. Dealer plates
5. Partially visible or obscured plates

For each license plate found, provide:
- Bounding box coordinates as percentages of image dimensions (0-100)
- Confidence score (0-1)
- Type of plate

Respond ONLY in JSON format:
{
  "hasLicensePlate": true/false,
  "plates": [
    {
      "x": 0-100,
      "y": 0-100,
      "width": 0-100,
      "height": 0-100,
      "confidence": 0-1,
      "plateType": "front" | "rear" | "temporary" | "dealer" | "unknown"
    }
  ],
  "reasoning": "Brief explanation of what was detected"
}

If no license plates are visible, return:
{
  "hasLicensePlate": false,
  "plates": [],
  "reasoning": "No license plates visible in this image"
}

Be thorough - it's better to flag a potential plate than miss one.`

interface AIPlateDetectionResponse {
  hasLicensePlate: boolean
  plates: Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
    plateType?: string
  }>
  reasoning: string
}

/**
 * License Plate Detection Service
 * Uses dependency injection for vision provider
 */
export class LicensePlateDetectionService {
  private readonly visionProvider: IVisionProvider
  private readonly modelName: string

  constructor(visionProvider?: IVisionProvider) {
    this.visionProvider = visionProvider || createOpenRouterVisionProvider({
      model: 'anthropic/claude-3.5-sonnet',
      temperature: 0.1,
      maxTokens: 1024,
    })
    this.modelName = 'anthropic/claude-3.5-sonnet'
  }

  /**
   * Detect license plates in a single image
   */
  async detectLicensePlates(imageUrl: string): Promise<PlateDetectionResult> {
    const startTime = Date.now()

    try {
      const response = await this.visionProvider.analyzeImage<AIPlateDetectionResponse>(
        imageUrl,
        LICENSE_PLATE_DETECTION_PROMPT
      )

      const plates: PlateDetectionBox[] = response.plates.map((plate) => ({
        x: Math.max(0, Math.min(100, plate.x)),
        y: Math.max(0, Math.min(100, plate.y)),
        width: Math.max(0, Math.min(100, plate.width)),
        height: Math.max(0, Math.min(100, plate.height)),
        confidence: Math.max(0, Math.min(1, plate.confidence)),
        plateType: (plate.plateType as PlateDetectionBox['plateType']) || 'unknown',
      }))

      return {
        detected: response.hasLicensePlate && plates.length > 0,
        plates,
        processingTime: Date.now() - startTime,
        model: this.modelName,
      }
    } catch (error) {
      console.error('License plate detection error:', error)
      return {
        detected: false,
        plates: [],
        processingTime: Date.now() - startTime,
        model: this.modelName,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Batch detect license plates in multiple images
   * Returns a map of image URL to detection result
   */
  async batchDetectLicensePlates(
    imageUrls: string[],
    options: { concurrency?: number } = {}
  ): Promise<Map<string, PlateDetectionResult>> {
    const { concurrency = 3 } = options
    const results = new Map<string, PlateDetectionResult>()

    // Process in batches to respect rate limits
    for (let i = 0; i < imageUrls.length; i += concurrency) {
      const batch = imageUrls.slice(i, i + concurrency)
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const result = await this.detectLicensePlates(url)
          return { url, result }
        })
      )

      for (const { url, result } of batchResults) {
        results.set(url, result)
      }
    }

    return results
  }

  /**
   * Check if an image needs license plate blurring
   * Returns true if high-confidence plates are detected
   */
  async needsPlateBlurring(
    imageUrl: string,
    confidenceThreshold: number = 0.7
  ): Promise<boolean> {
    const result = await this.detectLicensePlates(imageUrl)

    if (!result.detected) {
      return false
    }

    // Check if any plate has high enough confidence
    return result.plates.some((plate) => plate.confidence >= confidenceThreshold)
  }

  /**
   * Detect and blur license plates in one step
   */
  async detectAndBlurPlates(
    imageUrl: string
  ): Promise<{
    detection: PlateDetectionResult
    blur?: BlurResult
  }> {
    // First detect plates
    const detection = await this.detectLicensePlates(imageUrl)

    // If plates detected with high confidence, blur them
    if (detection.detected) {
      const highConfidencePlates = detection.plates.filter(
        (p) => p.confidence >= 0.7
      )

      if (highConfidencePlates.length > 0) {
        const blur = await blurLicensePlates(imageUrl, highConfidencePlates)
        return { detection, blur }
      }
    }

    return { detection }
  }
}

// Default singleton instance for backward compatibility
const defaultService = new LicensePlateDetectionService()

/**
 * Detect license plates in a single image (backward compatible)
 * @deprecated Use LicensePlateDetectionService instance instead
 */
export async function detectLicensePlates(
  imageUrl: string
): Promise<PlateDetectionResult> {
  return defaultService.detectLicensePlates(imageUrl)
}

/**
 * Batch detect license plates in multiple images (backward compatible)
 * @deprecated Use LicensePlateDetectionService instance instead
 */
export async function batchDetectLicensePlates(
  imageUrls: string[],
  options: { concurrency?: number } = {}
): Promise<Map<string, PlateDetectionResult>> {
  return defaultService.batchDetectLicensePlates(imageUrls, options)
}

/**
 * Check if an image needs license plate blurring (backward compatible)
 * @deprecated Use LicensePlateDetectionService instance instead
 */
export async function needsPlateBlurring(
  imageUrl: string,
  confidenceThreshold: number = 0.7
): Promise<boolean> {
  return defaultService.needsPlateBlurring(imageUrl, confidenceThreshold)
}

/**
 * Create detection data for database storage
 */
export function createStoredDetection(
  result: PlateDetectionResult
): StoredPlateDetection {
  return {
    detected: result.detected,
    plates: result.plates,
    analyzedAt: new Date().toISOString(),
    model: result.model,
  }
}

/**
 * Calculate pixel coordinates from percentage-based bounding box
 */
export function calculatePixelCoordinates(
  box: PlateDetectionBox,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round((box.x / 100) * imageWidth),
    y: Math.round((box.y / 100) * imageHeight),
    width: Math.round((box.width / 100) * imageWidth),
    height: Math.round((box.height / 100) * imageHeight),
  }
}

/**
 * Expand bounding box by a margin (to ensure full plate coverage)
 * Margin is a percentage (e.g., 10 = 10% expansion on each side)
 */
export function expandBoundingBox(
  box: PlateDetectionBox,
  marginPercent: number = 10
): PlateDetectionBox {
  const expandX = (box.width * marginPercent) / 100
  const expandY = (box.height * marginPercent) / 100

  return {
    ...box,
    x: Math.max(0, box.x - expandX),
    y: Math.max(0, box.y - expandY),
    width: Math.min(100 - (box.x - expandX), box.width + 2 * expandX),
    height: Math.min(100 - (box.y - expandY), box.height + 2 * expandY),
  }
}

/**
 * Result of blurring license plates
 */
export interface BlurResult {
  success: boolean
  blurredBuffer?: Buffer
  blurredMimeType?: string
  platesBlurred: number
  error?: string
}

/**
 * Fetch image from URL as buffer
 */
async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Blur license plates in an image
 *
 * @param imageUrl - URL of the image to blur
 * @param plates - Array of detected plate bounding boxes
 * @param blurRadius - Blur intensity (default 30)
 * @returns Buffer of the blurred image
 */
export async function blurLicensePlates(
  imageUrl: string,
  plates: PlateDetectionBox[],
  blurRadius: number = 30
): Promise<BlurResult> {
  try {
    if (plates.length === 0) {
      return {
        success: true,
        platesBlurred: 0,
      }
    }

    // Fetch the image
    const imageBuffer = await fetchImageBuffer(imageUrl)

    // Get image metadata for calculating pixel coordinates
    const metadata = await sharp(imageBuffer).metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not get image dimensions')
    }

    const { width, height } = metadata

    // Start with the original image
    let processedImage = sharp(imageBuffer)

    // Process each plate
    for (const plate of plates) {
      // Expand bounding box slightly to ensure full coverage
      const expandedBox = expandBoundingBox(plate, 15)
      const pixelBox = calculatePixelCoordinates(expandedBox, width, height)

      // Ensure coordinates are within bounds
      const x = Math.max(0, Math.min(pixelBox.x, width - 1))
      const y = Math.max(0, Math.min(pixelBox.y, height - 1))
      const boxWidth = Math.min(pixelBox.width, width - x)
      const boxHeight = Math.min(pixelBox.height, height - y)

      if (boxWidth <= 0 || boxHeight <= 0) {
        continue
      }

      // Extract the plate region, blur it, and composite back
      const plateRegion = await sharp(imageBuffer)
        .extract({ left: x, top: y, width: boxWidth, height: boxHeight })
        .blur(blurRadius)
        .toBuffer()

      // Composite the blurred region back onto the image
      processedImage = sharp(await processedImage.toBuffer()).composite([
        {
          input: plateRegion,
          left: x,
          top: y,
        },
      ])
    }

    // Output as JPEG (or PNG if needed)
    const outputBuffer = await processedImage.jpeg({ quality: 90 }).toBuffer()

    return {
      success: true,
      blurredBuffer: outputBuffer,
      blurredMimeType: 'image/jpeg',
      platesBlurred: plates.length,
    }
  } catch (error) {
    console.error('Error blurring license plates:', error)
    return {
      success: false,
      platesBlurred: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Detect and blur license plates in one step (backward compatible)
 * @deprecated Use LicensePlateDetectionService instance instead
 */
export async function detectAndBlurPlates(
  imageUrl: string
): Promise<{
  detection: PlateDetectionResult
  blur?: BlurResult
}> {
  return defaultService.detectAndBlurPlates(imageUrl)
}
