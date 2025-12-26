/**
 * OpenRouter AI Provider
 *
 * Implements IAIProvider interface for OpenRouter API access.
 * Includes retry logic, rate limiting, and proper error handling.
 */

import type {
  IAIProvider,
  ChatMessage,
  ContentPart,
  AICompletionOptions,
  AICompletionResult,
  AIProviderConfig,
} from '@/services/contracts/ai-provider.interface'
import { DEFAULT_AI_PROVIDER_CONFIG } from '@/services/contracts/ai-provider.interface'
import { prisma } from './db'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface OpenRouterResponse {
  id: string
  model: string
  choices: {
    message: {
      role: 'assistant'
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterProvider implements IAIProvider {
  private config: AIProviderConfig
  private requestCount = 0
  private windowStart = Date.now()

  constructor(config: Partial<AIProviderConfig> = {}) {
    this.config = { ...DEFAULT_AI_PROVIDER_CONFIG, ...config }
  }

  async complete(
    messages: ChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    return this.executeWithRetry(async () => {
      const response = await this.makeRequest(messages, options)
      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      }
    })
  }

  async completeJSON<T>(
    messages: ChatMessage[],
    options: AICompletionOptions = {}
  ): Promise<{ data: T; usage: AICompletionResult['usage'] }> {
    return this.executeWithRetry(async () => {
      const response = await this.makeRequest(messages, options, true)
      const content = response.choices[0]?.message?.content

      if (!content) {
        throw new Error('No content in OpenRouter response')
      }

      try {
        const data = JSON.parse(content) as T
        return {
          data,
          usage: {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          },
        }
      } catch {
        throw new Error(`Failed to parse JSON response: ${content.substring(0, 200)}...`)
      }
    })
  }

  async analyzeImages(
    imageUrls: string[],
    prompt: string,
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const content: ContentPart[] = [
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

    const messages: ChatMessage[] = [{ role: 'user', content }]

    return this.complete(messages, {
      model: options.model || this.config.visionModel,
      ...options,
    })
  }

  checkRateLimit(): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()
    const windowDuration = 60000

    if (now - this.windowStart > windowDuration) {
      this.requestCount = 0
      this.windowStart = now
    }

    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const retryAfter = windowDuration - (now - this.windowStart)
      return { allowed: false, retryAfter }
    }

    this.requestCount++
    return { allowed: true }
  }

  private async makeRequest(
    messages: ChatMessage[],
    options: AICompletionOptions,
    jsonMode = false
  ): Promise<OpenRouterResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set')
    }

    const rateCheck = this.checkRateLimit()
    if (!rateCheck.allowed) {
      throw new RateLimitError(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://finds.ro',
        'X-Title': 'Finds Auction Platform',
      },
      body: JSON.stringify({
        model: options.model || this.config.defaultModel,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
        ...(jsonMode && { response_format: { type: 'json_object' } }),
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      if (response.status === 429) {
        throw new RateLimitError(`OpenRouter rate limit: ${errorBody}`)
      }
      if (response.status >= 500) {
        throw new RetryableError(`OpenRouter server error: ${response.status} - ${errorBody}`)
      }
      throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`)
    }

    return response.json()
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        if (error instanceof RateLimitError || error instanceof RetryableError) {
          if (attempt < this.config.maxRetries) {
            const delay = this.config.retryDelayMs * Math.pow(2, attempt)
            await this.sleep(delay)
            continue
          }
        }

        throw error
      }
    }

    throw lastError || new Error('Unknown error during retry')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

class RetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableError'
  }
}

// Singleton instance for convenience
let defaultProvider: OpenRouterProvider | null = null

export function getAIProvider(): IAIProvider {
  if (!defaultProvider) {
    defaultProvider = new OpenRouterProvider()
  }
  return defaultProvider
}

export function createAIProvider(config?: Partial<AIProviderConfig>): IAIProvider {
  return new OpenRouterProvider(config)
}
