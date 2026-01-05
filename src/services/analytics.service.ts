import { prisma as defaultPrisma } from '@/lib/db'
import { ActivityType, Prisma, PrismaClient } from '@prisma/client'
import type {
  IAnalyticsService,
  PageViewInput,
  UserActivityInput,
  PageViewStats,
  ActiveUsersStats,
  NewUserStats,
  EngagementStats,
  AnalyticsDashboard,
  AnalyticsFilters,
  UserActivityFilters,
  UserActivityEntry,
} from './contracts/analytics.interface'

/**
 * Analytics Service - Tracks page views, user activity, and engagement
 * Follows SRP: Only handles analytics tracking and queries
 * Follows DIP: Implements interface, receives dependencies via constructor
 */
export class AnalyticsService implements IAnalyticsService {
  private readonly prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma
  }

  // ============================================================================
  // PAGE VIEW TRACKING
  // ============================================================================

  async trackPageView(input: PageViewInput): Promise<string> {
    const pageView = await this.prisma.pageView.create({
      data: {
        sessionId: input.sessionId,
        path: input.path,
        pageType: input.pageType,
        resourceId: input.resourceId,
        userId: input.userId,
        referrer: input.referrer,
        utmSource: input.utmSource,
        utmMedium: input.utmMedium,
        utmCampaign: input.utmCampaign,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        country: input.country,
        city: input.city,
        device: input.device,
        browser: input.browser,
        os: input.os,
      },
    })

    // Update user's lastSeenAt if logged in
    if (input.userId) {
      await this.prisma.user.update({
        where: { id: input.userId },
        data: { lastSeenAt: new Date() },
      }).catch(() => {
        // Ignore errors - user might not exist
      })
    }

    return pageView.id
  }

  async updatePageViewDuration(pageViewId: string, duration: number, scrollDepth?: number): Promise<void> {
    await this.prisma.pageView.update({
      where: { id: pageViewId },
      data: {
        duration,
        scrollDepth,
        exitedAt: new Date(),
      },
    }).catch(() => {
      // Ignore errors - page view might not exist
    })
  }

  // ============================================================================
  // USER ACTIVITY TRACKING
  // ============================================================================

  async trackActivity(input: UserActivityInput): Promise<string> {
    const activity = await this.prisma.userActivity.create({
      data: {
        userId: input.userId,
        activityType: input.activityType,
        description: input.description,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
    })

    // Update user's lastSeenAt
    await this.prisma.user.update({
      where: { id: input.userId },
      data: { lastSeenAt: new Date() },
    }).catch(() => {
      // Ignore errors
    })

    return activity.id
  }

  async trackLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await Promise.all([
      // Update user login stats
      this.prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          lastSeenAt: new Date(),
          loginCount: { increment: 1 },
        },
      }),
      // Record activity
      this.prisma.userActivity.create({
        data: {
          userId,
          activityType: ActivityType.LOGIN,
          description: 'User logged in',
          ipAddress,
          userAgent,
        },
      }),
    ])
  }

  async trackLogout(userId: string): Promise<void> {
    await this.prisma.userActivity.create({
      data: {
        userId,
        activityType: ActivityType.LOGOUT,
        description: 'User logged out',
      },
    })
  }

  // ============================================================================
  // ANALYTICS QUERIES
  // ============================================================================

  async getPageViewStats(filters?: AnalyticsFilters): Promise<PageViewStats> {
    const startDate = filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const endDate = filters?.endDate || new Date()

    const whereClause = {
      createdAt: { gte: startDate, lte: endDate },
      ...(filters?.pageType && { pageType: filters.pageType }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.device && { device: filters.device }),
      ...(filters?.country && { country: filters.country }),
    }

    const [
      totalViews,
      uniqueVisitors,
      uniqueUsers,
      viewsByPage,
      viewsByDevice,
      viewsByCountry,
      topReferrers,
      viewsOverTime,
    ] = await Promise.all([
      this.prisma.pageView.count({ where: whereClause }),
      this.prisma.pageView.groupBy({
        by: ['sessionId'],
        where: whereClause,
      }).then(r => r.length),
      this.prisma.pageView.groupBy({
        by: ['userId'],
        where: { ...whereClause, userId: { not: null } },
      }).then(r => r.length),
      this.prisma.pageView.groupBy({
        by: ['path', 'pageType'],
        where: whereClause,
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 20,
      }),
      this.prisma.pageView.groupBy({
        by: ['device'],
        where: { ...whereClause, device: { not: null } },
        _count: { device: true },
        orderBy: { _count: { device: 'desc' } },
      }),
      this.prisma.pageView.groupBy({
        by: ['country'],
        where: { ...whereClause, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      this.prisma.pageView.groupBy({
        by: ['referrer'],
        where: { ...whereClause, referrer: { not: null } },
        _count: { referrer: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 10,
      }),
      this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM page_views
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
    ])

    return {
      totalViews,
      uniqueVisitors,
      uniqueUsers,
      viewsByPage: viewsByPage.map(v => ({
        path: v.path,
        pageType: v.pageType,
        count: v._count.path,
      })),
      viewsByDevice: viewsByDevice.map(v => ({
        device: v.device || 'unknown',
        count: v._count.device,
      })),
      viewsByCountry: viewsByCountry.map(v => ({
        country: v.country || 'unknown',
        count: v._count.country,
      })),
      topReferrers: topReferrers.map(v => ({
        referrer: v.referrer || 'direct',
        count: v._count.referrer,
      })),
      viewsOverTime: viewsOverTime.map(v => ({
        date: v.date.toISOString().split('T')[0],
        count: Number(v.count),
      })),
    }
  }

  async getActiveUsers(): Promise<ActiveUsersStats> {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [activeNow, activeToday, activeThisWeek, activeThisMonth, recentUsers] = await Promise.all([
      this.prisma.user.count({ where: { lastSeenAt: { gte: fiveMinutesAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: monthAgo } } }),
      this.prisma.user.findMany({
        where: { lastSeenAt: { gte: fiveMinutesAgo } },
        select: {
          id: true,
          email: true,
          name: true,
          lastSeenAt: true,
        },
        orderBy: { lastSeenAt: 'desc' },
        take: 10,
      }),
    ])

    // Batch fetch last page views for all recent users (fixes N+1 query)
    const userIds = recentUsers.map(u => u.id)
    const lastPageViews = userIds.length > 0
      ? await this.prisma.$queryRaw<{ user_id: string; path: string }[]>`
          SELECT DISTINCT ON (user_id) user_id, path
          FROM page_views
          WHERE user_id = ANY(${userIds})
          ORDER BY user_id, created_at DESC
        `
      : []

    const pageViewMap = new Map(lastPageViews.map(pv => [pv.user_id, pv.path]))

    return {
      activeNow,
      activeToday,
      activeThisWeek,
      activeThisMonth,
      recentUsers: recentUsers.map(user => ({
        ...user,
        currentPage: pageViewMap.get(user.id),
      })),
    }
  }

  async getNewUserStats(days: number = 30): Promise<NewUserStats> {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const [today, thisWeek, thisMonth, recentRegistrations, registrationsOverTime] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: daysAgo } } }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: daysAgo } },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          emailVerified: true,
          country: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users WHERE created_at >= ${daysAgo}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `,
    ])

    return {
      today,
      thisWeek,
      thisMonth,
      recentRegistrations,
      registrationsOverTime: registrationsOverTime.map(r => ({
        date: r.date.toISOString().split('T')[0],
        count: Number(r.count),
      })),
    }
  }

  async getEngagementStats(filters?: AnalyticsFilters): Promise<EngagementStats> {
    const startDate = filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const endDate = filters?.endDate || new Date()

    const whereClause = {
      createdAt: { gte: startDate, lte: endDate },
    }

    const [sessionStats, topAuctions, topListings, returningVisitors, totalSessions] = await Promise.all([
      // Average session duration and pages per session
      this.prisma.$queryRaw<{ avg_duration: number; avg_pages: number; bounce_sessions: bigint; total_sessions: bigint }[]>`
        WITH session_stats AS (
          SELECT
            session_id,
            COUNT(*) as page_count,
            MAX(COALESCE(duration, 0)) as session_duration
          FROM page_views
          WHERE created_at >= ${startDate} AND created_at <= ${endDate}
          GROUP BY session_id
        )
        SELECT
          COALESCE(AVG(session_duration), 0) as avg_duration,
          COALESCE(AVG(page_count), 0) as avg_pages,
          COUNT(CASE WHEN page_count = 1 THEN 1 END) as bounce_sessions,
          COUNT(*) as total_sessions
        FROM session_stats
      `,
      // Top viewed auctions
      this.prisma.pageView.groupBy({
        by: ['resourceId'],
        where: { ...whereClause, pageType: 'auction', resourceId: { not: null } },
        _count: { resourceId: true },
        orderBy: { _count: { resourceId: 'desc' } },
        take: 10,
      }),
      // Top viewed listings
      this.prisma.pageView.groupBy({
        by: ['resourceId'],
        where: { ...whereClause, pageType: 'listing', resourceId: { not: null } },
        _count: { resourceId: true },
        orderBy: { _count: { resourceId: 'desc' } },
        take: 10,
      }),
      // Returning visitors (users who have visited more than once)
      this.prisma.$queryRaw<{ returning_count: bigint }[]>`
        SELECT COUNT(DISTINCT user_id) as returning_count
        FROM page_views
        WHERE user_id IS NOT NULL
        AND created_at >= ${startDate} AND created_at <= ${endDate}
        AND user_id IN (
          SELECT user_id FROM page_views
          WHERE user_id IS NOT NULL AND created_at < ${startDate}
          GROUP BY user_id
        )
      `,
      // Total unique users in period
      this.prisma.pageView.groupBy({
        by: ['userId'],
        where: { ...whereClause, userId: { not: null } },
      }).then(r => r.length),
    ])

    // Get auction/listing titles for top viewed
    const auctionIds = topAuctions.map(a => a.resourceId).filter(Boolean) as string[]
    const listingIds = topListings.map(l => l.resourceId).filter(Boolean) as string[]

    const [auctions, listings] = await Promise.all([
      auctionIds.length > 0
        ? this.prisma.auction.findMany({
            where: { id: { in: auctionIds } },
            select: { id: true, listing: { select: { title: true } } },
          })
        : [],
      listingIds.length > 0
        ? this.prisma.listing.findMany({
            where: { id: { in: listingIds } },
            select: { id: true, title: true },
          })
        : [],
    ])

    const auctionTitles = new Map(auctions.map(a => [a.id, a.listing.title]))
    const listingTitles = new Map(listings.map(l => [l.id, l.title]))

    const stats = sessionStats[0] || { avg_duration: 0, avg_pages: 0, bounce_sessions: BigInt(0), total_sessions: BigInt(0) }
    const totalSessionsNum = Number(stats.total_sessions) || 1
    const returningCount = Number(returningVisitors[0]?.returning_count || 0)

    return {
      averageSessionDuration: Math.round(Number(stats.avg_duration)),
      averagePagesPerSession: Math.round(Number(stats.avg_pages) * 10) / 10,
      bounceRate: Math.round((Number(stats.bounce_sessions) / totalSessionsNum) * 100),
      returningVisitorRate: totalSessions > 0 ? Math.round((returningCount / totalSessions) * 100) : 0,
      topAuctions: topAuctions.map(a => ({
        auctionId: a.resourceId!,
        title: auctionTitles.get(a.resourceId!) || 'Unknown',
        views: a._count.resourceId,
      })),
      topListings: topListings.map(l => ({
        listingId: l.resourceId!,
        title: listingTitles.get(l.resourceId!) || 'Unknown',
        views: l._count.resourceId,
      })),
    }
  }

  async getDashboard(filters?: AnalyticsFilters): Promise<AnalyticsDashboard> {
    const [pageViews, activeUsers, newUsers, engagement] = await Promise.all([
      this.getPageViewStats(filters),
      this.getActiveUsers(),
      this.getNewUserStats(30),
      this.getEngagementStats(filters),
    ])

    return {
      pageViews,
      activeUsers,
      newUsers,
      engagement,
    }
  }

  async getUserActivityHistory(filters: UserActivityFilters): Promise<{
    activities: UserActivityEntry[]
    total: number
  }> {
    const whereClause = {
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.activityType && { activityType: filters.activityType }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(filters.resourceId && { resourceId: filters.resourceId }),
      ...(filters.startDate && { createdAt: { gte: filters.startDate } }),
      ...(filters.endDate && { createdAt: { lte: filters.endDate } }),
    }

    const [activities, total] = await Promise.all([
      this.prisma.userActivity.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.userActivity.count({ where: whereClause }),
    ])

    return {
      activities: activities.map(a => ({
        id: a.id,
        activityType: a.activityType,
        description: a.description,
        resourceType: a.resourceType,
        resourceId: a.resourceId,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt,
        metadata: a.metadata as Record<string, unknown>,
      })),
      total,
    }
  }
}

// Singleton instance
let analyticsServiceInstance: AnalyticsService | null = null

export function getAnalyticsService(): IAnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService()
  }
  return analyticsServiceInstance
}
