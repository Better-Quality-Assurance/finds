/**
 * OpenRouter Vision Provider
 *
 * Implements IVisionProvider using OpenRouter's API
 * Wraps existing OpenRouter/Claude logic for vision analysis
 */

import { chatCompletionJSON, chatCompletion } from '@/lib/openrouter'
import type { ChatMessage, OpenRouterModel } from '@/lib/openrouter'
import type {
  IVisionProvider,
  VisionAnalysisOptions,
} from '@/services/contracts/vision-provider.interface'

/**
 * Default model for vision tasks
 */
const DEFAULT_VISION_MODEL: OpenRouterModel = 'anthropic/claude-3.5-sonnet'

/**
 * OpenRouter implementation of vision provider
 */
export class OpenRouterVisionProvider implements IVisionProvider {
  private readonly defaultModel: OpenRouterModel
  private readonly defaultTemperature: number
  private readonly defaultMaxTokens: number

  constructor(
    model: OpenRouterModel = DEFAULT_VISION_MODEL,
    temperature: number = 0.1,
    maxTokens: number = 4096
  ) {
    this.defaultModel = model
    this.defaultTemperature = temperature
    this.defaultMaxTokens = maxTokens
  }

  /**
   * Analyze an image with structured JSON response
   */
  async analyzeImage<T>(
    imageUrl: string,
    prompt: string,
    schema?: object
  ): Promise<T> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ]

    // Use chatCompletionJSON for structured responses
    const response = await chatCompletionJSON<T>(messages, {
      model: this.defaultModel,
      temperature: this.defaultTemperature,
      max_tokens: this.defaultMaxTokens,
    })

    return response
  }

  /**
   * Analyze an image with text response
   */
  async analyzeImageText(imageUrl: string, prompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ]

    const response = await chatCompletion(messages, {
      model: this.defaultModel,
      temperature: this.defaultTemperature,
      max_tokens: this.defaultMaxTokens,
    })

    return response.choices[0]?.message?.content || ''
  }

  /**
   * Analyze multiple images with shared prompt
   */
  async analyzeMultipleImages(
    imageUrls: string[],
    prompt: string
  ): Promise<string> {
    const content = [
      ...imageUrls.map((url) => ({
        type: 'image_url' as const,
        image_url: {
          url,
          detail: 'auto' as const,
        },
      })),
      {
        type: 'text' as const,
        text: prompt,
      },
    ]

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content,
      },
    ]

    const response = await chatCompletion(messages, {
      model: this.defaultModel,
      temperature: this.defaultTemperature,
      max_tokens: this.defaultMaxTokens,
    })

    return response.choices[0]?.message?.content || ''
  }

  /**
   * Create a vision provider with custom options
   */
  static withOptions(options: VisionAnalysisOptions): OpenRouterVisionProvider {
    return new OpenRouterVisionProvider(
      (options.model as OpenRouterModel) || DEFAULT_VISION_MODEL,
      options.temperature ?? 0.1,
      options.maxTokens ?? 4096
    )
  }
}

/**
 * Factory function for creating OpenRouter vision provider
 */
export function createOpenRouterVisionProvider(
  options?: VisionAnalysisOptions
): IVisionProvider {
  if (options) {
    return OpenRouterVisionProvider.withOptions(options)
  }
  return new OpenRouterVisionProvider()
}
