import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limiter'
import {
  getAllAISettings,
  updateAllAISettings,
  validateAIModerationConfig,
  validateLicensePlateConfig,
  type AISettingsResponse,
} from '@/services/system-config.service'
import { getModerationStats } from '@/services/ai-moderation.service'

// Rate limit config: 10 updates per minute per user
const CONFIG_UPDATE_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
}

// Zod schema for runtime validation of AI settings updates
const AISettingsUpdateSchema = z.object({
  moderation: z.object({
    commentAutoApproveThreshold: z.number().min(0).max(1).optional(),
    commentAutoRejectThreshold: z.number().min(0).max(1).optional(),
    listingFlagThreshold: z.number().min(0).max(1).optional(),
    suspicionScoreThreshold: z.number().min(0).max(1).optional(),
    bidAnalysisWindowMinutes: z.number().int().min(15).max(1440).optional(),
    defaultModel: z.string().optional(),
    visionModel: z.string().optional(),
    maxRequestsPerMinute: z.number().int().min(10).max(200).optional(),
  }).partial().optional(),
  licensePlate: z.object({
    visionModel: z.string().optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(256).max(4096).optional(),
    confidenceThreshold: z.number().min(0).max(1).optional(),
    blurRadius: z.number().int().min(10).max(100).optional(),
    marginExpansion: z.number().int().min(0).max(50).optional(),
    maxRetries: z.number().int().min(1).max(10).optional(),
    retryBaseDelay: z.number().int().min(100).max(10000).optional(),
    defaultConcurrency: z.number().int().min(1).max(10).optional(),
  }).partial().optional(),
}).strict() // Reject unknown fields

interface AISettingsWithStats extends AISettingsResponse {
  stats: {
    listingsAnalyzed: number
    commentsModerated: number
    suspiciousBidPatterns: number
    carReviewsGenerated: number
    avgConfidenceScore: number
  }
}

// GET - Get all AI settings with stats
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin or moderator role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [settings, stats] = await Promise.all([
      getAllAISettings(),
      getModerationStats(),
    ])

    const response: AISettingsWithStats = {
      ...settings,
      stats: {
        listingsAnalyzed: stats.listingsAnalyzed,
        commentsModerated: stats.commentsModerated,
        suspiciousBidPatterns: stats.suspiciousBidPatterns,
        carReviewsGenerated: stats.carReviewsGenerated,
        avgConfidenceScore: stats.avgConfidenceScore,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get AI settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI settings' },
      { status: 500 }
    )
  }
}

// PUT - Update AI settings (ADMIN only)
export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CSRF protection: verify origin matches host
    const headersList = await headers()
    const origin = headersList.get('origin')
    const host = headersList.get('host')
    if (origin && host) {
      const originUrl = new URL(origin)
      if (originUrl.host !== host) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
      }
    }

    // Rate limiting: 10 updates per minute per user
    const rateLimitKey = `ai-settings:${session.user.id}`
    const rateLimitResult = rateLimit(rateLimitKey, CONFIG_UPDATE_RATE_LIMIT)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          }
        }
      )
    }

    // Check admin role only for updates
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    // Parse and validate request body with Zod schema
    const body = await request.json()
    const parseResult = AISettingsUpdateSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          errors: parseResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    const { moderation, licensePlate } = parseResult.data

    // Additional business logic validation (model availability, etc.)
    const errors: { field: string; message: string }[] = []

    if (moderation) {
      errors.push(...validateAIModerationConfig(moderation))
    }

    if (licensePlate) {
      errors.push(...validateLicensePlateConfig(licensePlate))
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      )
    }

    // Extract audit metadata from request headers (reuse headersList from above)
    // Use last IP in X-Forwarded-For chain (most trustworthy, added by our proxy)
    const forwardedFor = headersList.get('x-forwarded-for')
    const auditMetadata = {
      ipAddress: forwardedFor
        ? forwardedFor.split(',').pop()?.trim()
        : headersList.get('x-real-ip') || undefined,
      userAgent: headersList.get('user-agent') || undefined,
    }

    // Update settings with audit trail
    await updateAllAISettings(
      { moderation, licensePlate },
      session.user.id,
      auditMetadata
    )

    // Return updated settings
    const updatedSettings = await getAllAISettings()

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Update AI settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update AI settings' },
      { status: 500 }
    )
  }
}
