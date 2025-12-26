/**
 * OpenRouter AI Client
 *
 * Provides unified access to multiple AI models via OpenRouter API.
 * Used for content moderation, car analysis, and market value estimation.
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type OpenRouterModel =
  | 'anthropic/claude-3.5-sonnet'
  | 'anthropic/claude-3-haiku'
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'google/gemini-pro-1.5'

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

export interface OpenRouterOptions {
  model?: OpenRouterModel
  temperature?: number
  max_tokens?: number
  top_p?: number
  response_format?: { type: 'json_object' }
}

export interface OpenRouterResponse {
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

/**
 * Send a chat completion request to OpenRouter
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: OpenRouterOptions = {}
): Promise<OpenRouterResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
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
      model: options.model || 'anthropic/claude-3.5-sonnet',
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 4096,
      top_p: options.top_p,
      response_format: options.response_format,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`)
  }

  return response.json()
}

/**
 * Send a chat completion request expecting JSON response
 */
export async function chatCompletionJSON<T>(
  messages: ChatMessage[],
  options: Omit<OpenRouterOptions, 'response_format'> = {}
): Promise<T> {
  const response = await chatCompletion(messages, {
    ...options,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content in OpenRouter response')
  }

  try {
    return JSON.parse(content) as T
  } catch {
    throw new Error(`Failed to parse OpenRouter JSON response: ${content}`)
  }
}

/**
 * Analyze an image using vision-capable model
 */
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  options: OpenRouterOptions = {}
): Promise<string> {
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
    model: options.model || 'openai/gpt-4o',
    ...options,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Analyze multiple images
 */
export async function analyzeImages(
  imageUrls: string[],
  prompt: string,
  options: OpenRouterOptions = {}
): Promise<string> {
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

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content,
    },
  ]

  const response = await chatCompletion(messages, {
    model: options.model || 'openai/gpt-4o',
    ...options,
  })

  return response.choices[0]?.message?.content || ''
}

/**
 * Rate limiting helper - tracks API usage
 */
const rateLimitState = {
  requestCount: 0,
  windowStart: Date.now(),
  windowDuration: 60000, // 1 minute
  maxRequests: 50, // per minute
}

export function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()

  // Reset window if expired
  if (now - rateLimitState.windowStart > rateLimitState.windowDuration) {
    rateLimitState.requestCount = 0
    rateLimitState.windowStart = now
  }

  if (rateLimitState.requestCount >= rateLimitState.maxRequests) {
    const retryAfter = rateLimitState.windowDuration - (now - rateLimitState.windowStart)
    return { allowed: false, retryAfter }
  }

  rateLimitState.requestCount++
  return { allowed: true }
}
