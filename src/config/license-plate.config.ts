/**
 * License Plate Detection Configuration
 *
 * Centralized configuration for AI-powered license plate detection.
 * All values can be overridden via environment variables.
 */

export const LICENSE_PLATE_CONFIG = {
  // Vision AI model configuration
  visionModel: process.env.LICENSE_PLATE_VISION_MODEL || 'anthropic/claude-3.5-sonnet',
  temperature: parseFloat(process.env.LICENSE_PLATE_TEMPERATURE || '0.1'),
  maxTokens: parseInt(process.env.LICENSE_PLATE_MAX_TOKENS || '1024', 10),

  // Detection thresholds
  confidenceThreshold: parseFloat(process.env.LICENSE_PLATE_CONFIDENCE || '0.7'),

  // Blurring parameters
  blurRadius: parseInt(process.env.LICENSE_PLATE_BLUR_RADIUS || '30', 10),
  marginExpansion: parseInt(process.env.LICENSE_PLATE_MARGIN || '15', 10),

  // Retry configuration
  maxRetries: parseInt(process.env.LICENSE_PLATE_MAX_RETRIES || '3', 10),
  retryBaseDelay: parseInt(process.env.LICENSE_PLATE_RETRY_DELAY || '1000', 10),

  // Batch processing
  defaultConcurrency: parseInt(process.env.LICENSE_PLATE_CONCURRENCY || '3', 10),
} as const

// Type-safe config export
export type LicensePlateConfig = typeof LICENSE_PLATE_CONFIG
