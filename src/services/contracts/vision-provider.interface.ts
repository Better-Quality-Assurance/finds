/**
 * Vision Provider Interface
 *
 * Abstraction for AI vision services that analyze images.
 * Supports the Open/Closed Principle by allowing new providers
 * without modifying existing code.
 */

/**
 * Vision provider for AI-powered image analysis
 */
export interface IVisionProvider {
  /**
   * Analyze an image with a prompt and optional schema validation
   *
   * @param imageUrl - URL of the image to analyze
   * @param prompt - Text prompt describing what to analyze
   * @param schema - Optional JSON schema for structured responses
   * @returns Promise resolving to typed analysis result
   */
  analyzeImage<T>(imageUrl: string, prompt: string, schema?: object): Promise<T>

  /**
   * Analyze an image and return a plain text response
   *
   * @param imageUrl - URL of the image to analyze
   * @param prompt - Text prompt describing what to analyze
   * @returns Promise resolving to text analysis
   */
  analyzeImageText(imageUrl: string, prompt: string): Promise<string>

  /**
   * Analyze multiple images with a shared prompt
   *
   * @param imageUrls - Array of image URLs to analyze together
   * @param prompt - Text prompt describing what to analyze
   * @returns Promise resolving to text analysis
   */
  analyzeMultipleImages(imageUrls: string[], prompt: string): Promise<string>
}

/**
 * Configuration options for vision analysis
 */
export interface VisionAnalysisOptions {
  /** Model to use for analysis */
  model?: string

  /** Temperature for response randomness (0-1) */
  temperature?: number

  /** Maximum tokens in response */
  maxTokens?: number

  /** Image detail level (low, high, auto) */
  imageDetail?: 'low' | 'high' | 'auto'
}
