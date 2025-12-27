import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getAllAISettings,
  updateAllAISettings,
  validateAIModerationConfig,
  validateLicensePlateConfig,
  type AISettingsResponse,
  type LicensePlateConfigType,
} from '@/services/system-config.service'
import { getModerationStats } from '@/services/ai-moderation.service'
import type { AIModerationConfig } from '@/services/contracts/ai-moderation.interface'

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

    // Check admin role only for updates
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { moderation, licensePlate } = body as {
      moderation?: Partial<AIModerationConfig>
      licensePlate?: Partial<LicensePlateConfigType>
    }

    // Validate inputs
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

    // Update settings
    await updateAllAISettings(
      { moderation, licensePlate },
      session.user.id
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
