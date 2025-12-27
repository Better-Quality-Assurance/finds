/**
 * License Plate Detection Service Tests
 *
 * Demonstrates improved testability after OCP refactoring
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import type { IVisionProvider } from '@/services/contracts/vision-provider.interface'
import { LicensePlateDetectionService } from '../license-plate.service'
import type { PlateDetectionResult } from '../license-plate.service'

/**
 * Mock Vision Provider for testing
 * No external API calls required
 */
class MockVisionProvider implements IVisionProvider {
  private mockResponse: any = {
    hasLicensePlate: true,
    plates: [
      {
        x: 10,
        y: 20,
        width: 30,
        height: 5,
        confidence: 0.95,
        plateType: 'front',
      },
    ],
    reasoning: 'Mock detected front license plate',
  }

  setMockResponse(response: any): void {
    this.mockResponse = response
  }

  async analyzeImage<T>(imageUrl: string, prompt: string): Promise<T> {
    return this.mockResponse as T
  }

  async analyzeImageText(imageUrl: string, prompt: string): Promise<string> {
    return 'Mock text response'
  }

  async analyzeMultipleImages(
    imageUrls: string[],
    prompt: string
  ): Promise<string> {
    return 'Mock batch response'
  }
}

describe('LicensePlateDetectionService', () => {
  let mockProvider: MockVisionProvider
  let service: LicensePlateDetectionService

  beforeEach(() => {
    mockProvider = new MockVisionProvider()
    service = new LicensePlateDetectionService(mockProvider)
  })

  describe('detectLicensePlates', () => {
    it('should detect license plates with high confidence', async () => {
      const result = await service.detectLicensePlates(
        'https://example.com/car.jpg'
      )

      expect(result.detected).toBe(true)
      expect(result.plates).toHaveLength(1)
      expect(result.plates[0]?.confidence).toBe(0.95)
      expect(result.plates[0]?.plateType).toBe('front')
    })

    it('should normalize bounding box coordinates', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 150, // Over 100
            y: -10, // Negative
            width: 30,
            height: 5,
            confidence: 0.9,
            plateType: 'rear',
          },
        ],
        reasoning: 'Test coordinate normalization',
      })

      const result = await service.detectLicensePlates('test-url')

      expect(result.plates[0]?.x).toBe(100) // Clamped to max
      expect(result.plates[0]?.y).toBe(0) // Clamped to min
    })

    it('should handle no plates detected', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: false,
        plates: [],
        reasoning: 'No license plates visible',
      })

      const result = await service.detectLicensePlates('test-url')

      expect(result.detected).toBe(false)
      expect(result.plates).toHaveLength(0)
    })

    it('should handle multiple plates', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 10,
            y: 20,
            width: 30,
            height: 5,
            confidence: 0.95,
            plateType: 'front',
          },
          {
            x: 50,
            y: 60,
            width: 30,
            height: 5,
            confidence: 0.88,
            plateType: 'rear',
          },
        ],
        reasoning: 'Detected front and rear plates',
      })

      const result = await service.detectLicensePlates('test-url')

      expect(result.detected).toBe(true)
      expect(result.plates).toHaveLength(2)
      expect(result.plates[0]?.plateType).toBe('front')
      expect(result.plates[1]?.plateType).toBe('rear')
    })

    it('should include processing time', async () => {
      const result = await service.detectLicensePlates('test-url')

      expect(result.processingTime).toBeGreaterThan(0)
      expect(typeof result.processingTime).toBe('number')
    })

    it('should include model name', async () => {
      const result = await service.detectLicensePlates('test-url')

      expect(result.model).toBe('anthropic/claude-3.5-sonnet')
    })
  })

  describe('batchDetectLicensePlates', () => {
    it('should process multiple images', async () => {
      const imageUrls = [
        'https://example.com/car1.jpg',
        'https://example.com/car2.jpg',
        'https://example.com/car3.jpg',
      ]

      const results = await service.batchDetectLicensePlates(imageUrls)

      expect(results.size).toBe(3)
      expect(results.has(imageUrls[0]!)).toBe(true)
      expect(results.has(imageUrls[1]!)).toBe(true)
      expect(results.has(imageUrls[2]!)).toBe(true)
    })

    it('should respect concurrency limit', async () => {
      const imageUrls = Array.from(
        { length: 10 },
        (_, i) => `https://example.com/car${i}.jpg`
      )

      const results = await service.batchDetectLicensePlates(imageUrls, {
        concurrency: 2,
      })

      expect(results.size).toBe(10)
    })
  })

  describe('needsPlateBlurring', () => {
    it('should return true for high confidence plates', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 10,
            y: 20,
            width: 30,
            height: 5,
            confidence: 0.95,
            plateType: 'front',
          },
        ],
        reasoning: 'High confidence plate',
      })

      const needsBlur = await service.needsPlateBlurring('test-url', 0.7)

      expect(needsBlur).toBe(true)
    })

    it('should return false for low confidence plates', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 10,
            y: 20,
            width: 30,
            height: 5,
            confidence: 0.5,
            plateType: 'front',
          },
        ],
        reasoning: 'Low confidence plate',
      })

      const needsBlur = await service.needsPlateBlurring('test-url', 0.7)

      expect(needsBlur).toBe(false)
    })

    it('should return false when no plates detected', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: false,
        plates: [],
        reasoning: 'No plates',
      })

      const needsBlur = await service.needsPlateBlurring('test-url')

      expect(needsBlur).toBe(false)
    })

    it('should use custom confidence threshold', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 10,
            y: 20,
            width: 30,
            height: 5,
            confidence: 0.85,
            plateType: 'front',
          },
        ],
        reasoning: 'Moderate confidence plate',
      })

      // Should pass with lower threshold
      expect(await service.needsPlateBlurring('test-url', 0.8)).toBe(true)

      // Should fail with higher threshold
      expect(await service.needsPlateBlurring('test-url', 0.9)).toBe(false)
    })
  })

  describe('detectAndBlurPlates', () => {
    it('should detect and blur high confidence plates', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 10,
            y: 20,
            width: 30,
            height: 5,
            confidence: 0.95,
            plateType: 'front',
          },
        ],
        reasoning: 'High confidence plate',
      })

      const result = await service.detectAndBlurPlates('test-url')

      expect(result.detection.detected).toBe(true)
      // Blur result would be undefined in this test since we're not mocking blurLicensePlates
    })

    it('should not blur low confidence plates', async () => {
      mockProvider.setMockResponse({
        hasLicensePlate: true,
        plates: [
          {
            x: 10,
            y: 20,
            width: 30,
            height: 5,
            confidence: 0.5,
            plateType: 'front',
          },
        ],
        reasoning: 'Low confidence plate',
      })

      const result = await service.detectAndBlurPlates('test-url')

      expect(result.detection.detected).toBe(true)
      expect(result.blur).toBeUndefined()
    })
  })
})
