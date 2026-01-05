import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAnalyticsService } from '@/services/analytics.service'
import { checkRateLimit } from '@/middleware/rate-limit'
import { PAGE_VIEW_RATE_LIMIT } from '@/lib/rate-limit-config'
import { z } from 'zod'

// Common bot user agents to filter out
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /googlebot/i, /bingbot/i, /yandex/i, /baiduspider/i,
  /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
  /whatsapp/i, /telegrambot/i, /discordbot/i,
  /curl/i, /wget/i, /python-requests/i, /axios/i,
  /headless/i, /phantom/i, /selenium/i, /puppeteer/i,
]

function isBot(userAgent: string | null): boolean {
  if (!userAgent) {return true} // No user agent = suspicious
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent))
}

const pageViewSchema = z.object({
  sessionId: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
  pageType: z.string().min(1).max(50),
  resourceId: z.string().max(100).optional(),
  referrer: z.string().max(2000).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  device: z.string().max(50).optional(),
  browser: z.string().max(50).optional(),
  os: z.string().max(50).optional(),
})

const updatePageViewSchema = z.object({
  pageViewId: z.string().min(1).max(100),
  duration: z.number().min(0).max(86400), // Max 24 hours
  scrollDepth: z.number().min(0).max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent')

    // Filter out bots
    if (isBot(userAgent)) {
      return NextResponse.json({ pageViewId: null })
    }

    const body = await request.json()
    const data = pageViewSchema.parse(body)

    // Rate limit by session ID
    const rateLimitKey = `pageview:${data.sessionId}`
    const rateLimitResult = checkRateLimit(rateLimitKey, PAGE_VIEW_RATE_LIMIT)
    if (!rateLimitResult.success) {
      return NextResponse.json({ pageViewId: null }) // Silently ignore rate-limited
    }

    // Get user ID if authenticated
    const session = await auth()
    const userId = session?.user?.id

    // Get IP from request
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                      request.headers.get('x-real-ip') ||
                      undefined

    // Get country from headers (set by CDN/proxy)
    const country = request.headers.get('cf-ipcountry') ||
                    request.headers.get('x-vercel-ip-country') ||
                    undefined
    const city = request.headers.get('cf-ipcity') ||
                 request.headers.get('x-vercel-ip-city') ||
                 undefined

    const analyticsService = getAnalyticsService()
    const pageViewId = await analyticsService.trackPageView({
      ...data,
      userId,
      ipAddress,
      userAgent: userAgent || undefined,
      country,
      city,
    })

    return NextResponse.json({ pageViewId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    // Silent fail for analytics - don't break user experience
    return NextResponse.json({ pageViewId: null })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent')

    // Filter out bots
    if (isBot(userAgent)) {
      return NextResponse.json({ success: true })
    }

    const body = await request.json()
    const { pageViewId, duration, scrollDepth } = updatePageViewSchema.parse(body)

    // Basic validation - pageViewId should look like a cuid
    if (!/^c[a-z0-9]{20,30}$/i.test(pageViewId)) {
      return NextResponse.json({ success: true }) // Silent fail
    }

    const analyticsService = getAnalyticsService()
    await analyticsService.updatePageViewDuration(pageViewId, duration, scrollDepth)

    return NextResponse.json({ success: true })
  } catch {
    // Silent fail for analytics - don't break user experience
    return NextResponse.json({ success: true })
  }
}
