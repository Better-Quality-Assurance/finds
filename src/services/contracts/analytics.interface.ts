/**
 * Analytics Service Interface
 * Tracks page views, user activity, and engagement metrics
 */

import { ActivityType } from '@prisma/client'

// Page view input
export interface PageViewInput {
  sessionId: string
  path: string
  pageType: string
  resourceId?: string
  userId?: string
  referrer?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  ipAddress?: string
  userAgent?: string
  country?: string
  city?: string
  device?: string
  browser?: string
  os?: string
}

// User activity input
export interface UserActivityInput {
  userId: string
  activityType: ActivityType
  description?: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

// Page view stats
export interface PageViewStats {
  totalViews: number
  uniqueVisitors: number
  uniqueUsers: number
  viewsByPage: Array<{ path: string; pageType: string; count: number }>
  viewsByDevice: Array<{ device: string; count: number }>
  viewsByCountry: Array<{ country: string; count: number }>
  topReferrers: Array<{ referrer: string; count: number }>
  viewsOverTime: Array<{ date: string; count: number }>
}

// Active users tracking
export interface ActiveUsersStats {
  activeNow: number // Last 5 minutes
  activeToday: number
  activeThisWeek: number
  activeThisMonth: number
  recentUsers: Array<{
    id: string
    email: string
    name: string | null
    lastSeenAt: Date | null
    currentPage?: string
  }>
}

// New user stats
export interface NewUserStats {
  today: number
  thisWeek: number
  thisMonth: number
  recentRegistrations: Array<{
    id: string
    email: string
    name: string | null
    createdAt: Date
    emailVerified: Date | null
    country: string | null
  }>
  registrationsOverTime: Array<{ date: string; count: number }>
}

// User activity timeline
export interface UserActivityEntry {
  id: string
  activityType: ActivityType
  description: string | null
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  createdAt: Date
  metadata: Record<string, unknown>
}

// Engagement metrics
export interface EngagementStats {
  averageSessionDuration: number // seconds
  averagePagesPerSession: number
  bounceRate: number // percentage
  returningVisitorRate: number // percentage
  topAuctions: Array<{ auctionId: string; title: string; views: number }>
  topListings: Array<{ listingId: string; title: string; views: number }>
}

// Full analytics dashboard
export interface AnalyticsDashboard {
  pageViews: PageViewStats
  activeUsers: ActiveUsersStats
  newUsers: NewUserStats
  engagement: EngagementStats
}

// Query filters
export interface AnalyticsFilters {
  startDate?: Date
  endDate?: Date
  pageType?: string
  userId?: string
  device?: string
  country?: string
}

// User activity filters
export interface UserActivityFilters {
  userId?: string
  activityType?: ActivityType
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ISP: Separate interfaces for different analytics operations
export interface IPageViewTracker {
  trackPageView(input: PageViewInput): Promise<string>
  updatePageViewDuration(pageViewId: string, duration: number, scrollDepth?: number): Promise<void>
}

export interface IUserActivityTracker {
  trackActivity(input: UserActivityInput): Promise<string>
  trackLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void>
  trackLogout(userId: string): Promise<void>
}

export interface IAnalyticsReader {
  getPageViewStats(filters?: AnalyticsFilters): Promise<PageViewStats>
  getActiveUsers(): Promise<ActiveUsersStats>
  getNewUserStats(days?: number): Promise<NewUserStats>
  getEngagementStats(filters?: AnalyticsFilters): Promise<EngagementStats>
  getDashboard(filters?: AnalyticsFilters): Promise<AnalyticsDashboard>
  getUserActivityHistory(filters: UserActivityFilters): Promise<{
    activities: UserActivityEntry[]
    total: number
  }>
}

// Combined interface for DI container
export interface IAnalyticsService extends IPageViewTracker, IUserActivityTracker, IAnalyticsReader {}
