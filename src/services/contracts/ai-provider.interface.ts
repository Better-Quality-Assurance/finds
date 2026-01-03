/**
 * AI Provider Interface
 *
 * Abstracts AI model access for dependency injection and testability.
 * Allows swapping between OpenRouter, direct API calls, or mock providers.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'auto' | 'low' | 'high'
  }
}

export interface AICompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AICompletionResult {
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface IAIProvider {
  /**
   * Send a chat completion request
   */
  complete(
    messages: ChatMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResult>

  /**
   * Send a chat completion request expecting JSON response
   */
  completeJSON<T>(
    messages: ChatMessage[],
    options?: AICompletionOptions
  ): Promise<{ data: T; usage: AICompletionResult['usage'] }>

  /**
   * Analyze images with a vision model
   */
  analyzeImages(
    imageUrls: string[],
    prompt: string,
    options?: AICompletionOptions
  ): Promise<AICompletionResult>

  /**
   * Check if rate limit allows a request
   */
  checkRateLimit(): { allowed: boolean; retryAfter?: number }
}

export interface AIProviderConfig {
  defaultModel: string
  visionModel: string
  maxRetries: number
  retryDelayMs: number
  rateLimitPerMinute: number
}

export const DEFAULT_AI_PROVIDER_CONFIG: AIProviderConfig = {
  defaultModel: '@preset/finds',
  visionModel: 'openai/gpt-4o',
  maxRetries: 3,
  retryDelayMs: 1000,
  rateLimitPerMinute: 50,
}
