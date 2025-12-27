/**
 * Coordinate Transformer Tests
 *
 * Tests for pure coordinate transformation functions
 */

import {
  percentageToPixelCoordinates,
  pixelToPercentageCoordinates,
  expandPercentageBox,
  expandPixelBox,
  clampToImageBounds,
  isValidBox,
} from '../coordinate-transformer'

describe('Coordinate Transformer', () => {
  const dimensions = { width: 1000, height: 800 }

  describe('percentageToPixelCoordinates', () => {
    it('should convert percentage coordinates to pixels', () => {
      const percentBox = { x: 10, y: 20, width: 30, height: 40 }
      const result = percentageToPixelCoordinates(percentBox, dimensions)

      expect(result).toEqual({
        x: 100,
        y: 160,
        width: 300,
        height: 320,
      })
    })

    it('should handle edge values (0 and 100)', () => {
      const percentBox = { x: 0, y: 0, width: 100, height: 100 }
      const result = percentageToPixelCoordinates(percentBox, dimensions)

      expect(result).toEqual({
        x: 0,
        y: 0,
        width: 1000,
        height: 800,
      })
    })

    it('should round to nearest pixel', () => {
      const percentBox = { x: 10.5, y: 20.7, width: 30.3, height: 40.9 }
      const result = percentageToPixelCoordinates(percentBox, dimensions)

      expect(result.x).toBe(105)
      expect(result.y).toBe(166)
      expect(result.width).toBe(303)
      expect(result.height).toBe(327)
    })
  })

  describe('pixelToPercentageCoordinates', () => {
    it('should convert pixel coordinates to percentages', () => {
      const pixelBox = { x: 100, y: 160, width: 300, height: 320 }
      const result = pixelToPercentageCoordinates(pixelBox, dimensions)

      expect(result).toEqual({
        x: 10,
        y: 20,
        width: 30,
        height: 40,
      })
    })

    it('should handle full image dimensions', () => {
      const pixelBox = { x: 0, y: 0, width: 1000, height: 800 }
      const result = pixelToPercentageCoordinates(pixelBox, dimensions)

      expect(result).toEqual({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      })
    })
  })

  describe('expandPercentageBox', () => {
    it('should expand box by margin percentage', () => {
      const box = { x: 20, y: 30, width: 40, height: 20 }
      const result = expandPercentageBox(box, 10)

      // Width 40 * 10% = 4, so expand by 4 on each side (8 total)
      // Height 20 * 10% = 2, so expand by 2 on each side (4 total)
      expect(result.x).toBe(16) // 20 - 4
      expect(result.y).toBe(28) // 30 - 2
      expect(result.width).toBe(48) // 40 + 8
      expect(result.height).toBe(24) // 20 + 4
    })

    it('should clamp to 0-100 range', () => {
      const box = { x: 5, y: 5, width: 10, height: 10 }
      const result = expandPercentageBox(box, 100) // 100% expansion

      expect(result.x).toBeGreaterThanOrEqual(0)
      expect(result.y).toBeGreaterThanOrEqual(0)
      expect(result.x + result.width).toBeLessThanOrEqual(100)
      expect(result.y + result.height).toBeLessThanOrEqual(100)
    })
  })

  describe('expandPixelBox', () => {
    it('should expand box by margin pixels', () => {
      const box = { x: 100, y: 100, width: 200, height: 150 }
      const result = expandPixelBox(box, 20, dimensions)

      expect(result.x).toBe(80) // 100 - 20
      expect(result.y).toBe(80) // 100 - 20
      expect(result.width).toBe(240) // 200 + 40
      expect(result.height).toBe(190) // 150 + 40
    })

    it('should clamp to image dimensions', () => {
      const box = { x: 5, y: 5, width: 100, height: 100 }
      const result = expandPixelBox(box, 1000, dimensions)

      expect(result.x).toBeGreaterThanOrEqual(0)
      expect(result.y).toBeGreaterThanOrEqual(0)
      expect(result.x + result.width).toBeLessThanOrEqual(dimensions.width)
      expect(result.y + result.height).toBeLessThanOrEqual(dimensions.height)
    })
  })

  describe('clampToImageBounds', () => {
    it('should clamp negative coordinates to 0', () => {
      const box = { x: -10, y: -5, width: 100, height: 100 }
      const result = clampToImageBounds(box, dimensions)

      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
      expect(result.width).toBe(100)
      expect(result.height).toBe(100)
    })

    it('should clamp oversized boxes to image bounds', () => {
      const box = { x: 900, y: 700, width: 500, height: 500 }
      const result = clampToImageBounds(box, dimensions)

      expect(result.x).toBe(900)
      expect(result.y).toBe(700)
      expect(result.width).toBe(100) // Clamped to fit in 1000px width
      expect(result.height).toBe(100) // Clamped to fit in 800px height
    })

    it('should handle already valid boxes', () => {
      const box = { x: 100, y: 100, width: 200, height: 150 }
      const result = clampToImageBounds(box, dimensions)

      expect(result).toEqual(box)
    })
  })

  describe('isValidBox', () => {
    it('should return true for valid boxes', () => {
      expect(isValidBox({ x: 0, y: 0, width: 100, height: 100 })).toBe(true)
      expect(isValidBox({ x: 10, y: 20, width: 1, height: 1 })).toBe(true)
    })

    it('should return false for invalid boxes', () => {
      expect(isValidBox({ x: 0, y: 0, width: 0, height: 100 })).toBe(false)
      expect(isValidBox({ x: 0, y: 0, width: 100, height: 0 })).toBe(false)
      expect(isValidBox({ x: 0, y: 0, width: -10, height: 100 })).toBe(false)
    })
  })
})
