/**
 * Image Processing Services - Public API
 *
 * This module exports all image processing utilities and services.
 * Use this for clean imports throughout the application.
 */

// Image Processor Service
export {
  ImageProcessorService,
  createImageProcessor,
  getDefaultImageProcessor,
} from './image-processor.service'

// Coordinate Transformer Utilities
export {
  percentageToPixelCoordinates,
  pixelToPercentageCoordinates,
  expandPercentageBox,
  expandPixelBox,
  clampToImageBounds,
  isValidBox,
  type PercentageBox,
  type PixelBox,
  type ImageDimensions,
} from './coordinate-transformer'

// Re-export types from contracts for convenience
export type {
  IImageProcessor,
  ImageMetadata,
  BlurRegion,
  JpegOptions,
  PngOptions,
} from '@/services/contracts/image-processor.interface'
