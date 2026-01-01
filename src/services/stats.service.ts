import { prisma } from '@/lib/db'
import type {
  IStatsService,
  PublicStats,
  UserStats,
  AdminStats,
} from './contracts/stats.interface'

/**
 * Stats Service - Single Responsibility for statistics
 * Follows SRP: Only handles stats queries
 * Follows DIP: Implements interface, injected via container
 */
export class StatsService implements IStatsService {
  async getPublicStats(): Promise<PublicStats> {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      totalAuctions,
      activeAuctions,
      totalSold,
      totalBids,
      totalUsers,
      soldAuctions,
      auctionsLast24h,
      bidsLast24h,
      newUsersLast24h,
      popularMakes,
    ] = await Promise.all([
      prisma.auction.count(),
      prisma.auction.count({ where: { status: 'ACTIVE' } }),
      prisma.auction.count({ where: { status: 'SOLD' } }),
      prisma.bid.count(),
      prisma.user.count(),
      prisma.auction.aggregate({
        where: { status: 'SOLD' },
        _sum: { finalPrice: true },
      }),
      prisma.auction.count({ where: { createdAt: { gte: last24h } } }),
      prisma.bid.count({ where: { createdAt: { gte: last24h } } }),
      prisma.user.count({ where: { createdAt: { gte: last24h } } }),
      prisma.listing.groupBy({
        by: ['make'],
        _count: { make: true },
        orderBy: { _count: { make: 'desc' } },
        take: 5,
      }),
    ])

    return {
      totalAuctions,
      activeAuctions,
      totalSold,
      totalBids,
      totalUsers,
      totalValueSold: Number(soldAuctions._sum.finalPrice || 0),
      popularMakes: popularMakes.map(m => ({
        make: m.make,
        count: m._count.make,
      })),
      recentActivity: {
        auctionsLast24h,
        bidsLast24h,
        newUsersLast24h,
      },
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const [
      user,
      bidsPlaced,
      auctionsWon,
      watchlistCount,
      totalSpent,
      listingsCreated,
      auctionsSold,
      totalEarned,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          averageRating: true,
          totalReviews: true,
          role: true,
        },
      }),
      prisma.bid.count({ where: { bidderId: userId } }),
      prisma.auction.count({ where: { winnerId: userId } }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.auction.aggregate({
        where: { winnerId: userId, paymentStatus: 'PAID' },
        _sum: { finalPrice: true },
      }),
      prisma.listing.count({ where: { sellerId: userId } }),
      prisma.auction.count({
        where: { listing: { sellerId: userId }, status: 'SOLD' },
      }),
      prisma.auction.aggregate({
        where: {
          listing: { sellerId: userId },
          status: 'SOLD',
          paymentStatus: 'PAID',
        },
        _sum: { finalPrice: true },
      }),
    ])

    if (!user) {
      throw new Error('User not found')
    }

    const isSeller = user.role === 'SELLER' || user.role === 'ADMIN' || listingsCreated > 0

    return {
      memberSince: user.createdAt,
      buyerStats: {
        bidsPlaced,
        auctionsWon,
        watchlistCount,
        totalSpent: Number(totalSpent._sum.finalPrice || 0),
      },
      sellerStats: isSeller
        ? {
            listingsCreated,
            auctionsSold,
            totalEarned: Number(totalEarned._sum.finalPrice || 0),
            averageRating: user.averageRating,
            totalReviews: user.totalReviews,
          }
        : null,
    }
  }

  async getAdminStats(): Promise<AdminStats> {
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalAuctions,
      totalListings,
      totalBids,
      newUsersToday,
      bidsToday,
      auctionsEndedToday,
      listingsSubmittedToday,
      activeAuctions,
      pendingListings,
      openFraudAlerts,
      revenueData,
      popularMakes,
      userTrend,
      bidTrend,
      soldAuctions,
      unsoldAuctions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.auction.count(),
      prisma.listing.count(),
      prisma.bid.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.bid.count({ where: { createdAt: { gte: today } } }),
      prisma.auction.count({
        where: { status: { in: ['SOLD', 'NO_SALE'] }, updatedAt: { gte: today } },
      }),
      prisma.listing.count({ where: { createdAt: { gte: today } } }),
      prisma.auction.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.fraudAlert.count({ where: { status: 'OPEN' } }),
      prisma.auction.aggregate({
        where: { status: 'SOLD', paymentStatus: 'PAID', updatedAt: { gte: last30Days } },
        _sum: { finalPrice: true },
        _count: true,
      }),
      prisma.listing.groupBy({
        by: ['make'],
        _count: { make: true },
        orderBy: { _count: { make: 'desc' } },
        take: 10,
      }),
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users WHERE created_at >= ${last7Days}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `,
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM bids WHERE created_at >= ${last7Days}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `,
      prisma.auction.count({ where: { status: 'SOLD' } }),
      prisma.auction.count({ where: { status: 'UNSOLD' } }),
    ])

    const totalSalesVolume = Number(revenueData._sum.finalPrice || 0)

    return {
      overview: { totalUsers, totalAuctions, totalListings, totalBids },
      todayActivity: {
        newUsers: newUsersToday,
        bids: bidsToday,
        auctionsEnded: auctionsEndedToday,
        listingsSubmitted: listingsSubmittedToday,
      },
      status: { activeAuctions, pendingListings, openFraudAlerts },
      revenue: {
        last30Days: {
          salesVolume: totalSalesVolume,
          estimatedRevenue: totalSalesVolume * 0.05,
          salesCount: revenueData._count,
        },
      },
      auctionOutcomes: {
        sold: soldAuctions,
        unsold: unsoldAuctions,
        successRate: soldAuctions + unsoldAuctions > 0
          ? Math.round((soldAuctions / (soldAuctions + unsoldAuctions)) * 100)
          : 0,
      },
      popularMakes: popularMakes.map(m => ({ make: m.make, count: m._count.make })),
      trends: {
        users: userTrend.map(d => ({ date: d.date.toISOString().split('T')[0], count: Number(d.count) })),
        bids: bidTrend.map(d => ({ date: d.date.toISOString().split('T')[0], count: Number(d.count) })),
      },
    }
  }
}

// Singleton instance
let statsServiceInstance: StatsService | null = null

export function getStatsService(): IStatsService {
  if (!statsServiceInstance) {
    statsServiceInstance = new StatsService()
  }
  return statsServiceInstance
}
