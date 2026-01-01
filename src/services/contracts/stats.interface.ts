/**
 * Stats Service Interface
 * Follows ISP - separate interfaces for different stat types
 */

export interface PublicStats {
  totalAuctions: number
  activeAuctions: number
  totalSold: number
  totalBids: number
  totalUsers: number
  totalValueSold: number
  popularMakes: Array<{ make: string; count: number }>
  recentActivity: {
    auctionsLast24h: number
    bidsLast24h: number
    newUsersLast24h: number
  }
}

export interface UserStats {
  memberSince: Date
  buyerStats: {
    bidsPlaced: number
    auctionsWon: number
    watchlistCount: number
    totalSpent: number
  }
  sellerStats: {
    listingsCreated: number
    auctionsSold: number
    totalEarned: number
    averageRating: number | null
    totalReviews: number
  } | null
}

export interface AdminStats {
  overview: {
    totalUsers: number
    totalAuctions: number
    totalListings: number
    totalBids: number
  }
  todayActivity: {
    newUsers: number
    bids: number
    auctionsEnded: number
    listingsSubmitted: number
  }
  status: {
    activeAuctions: number
    pendingListings: number
    openFraudAlerts: number
  }
  revenue: {
    last30Days: {
      salesVolume: number
      estimatedRevenue: number
      salesCount: number
    }
  }
  auctionOutcomes: {
    sold: number
    unsold: number
    successRate: number
  }
  popularMakes: Array<{ make: string; count: number }>
  trends: {
    users: Array<{ date: string; count: number }>
    bids: Array<{ date: string; count: number }>
  }
}

// ISP: Separate reader interfaces
export interface IPublicStatsReader {
  getPublicStats(): Promise<PublicStats>
}

export interface IUserStatsReader {
  getUserStats(userId: string): Promise<UserStats>
}

export interface IAdminStatsReader {
  getAdminStats(): Promise<AdminStats>
}

// Combined interface for DI container
export interface IStatsService extends IPublicStatsReader, IUserStatsReader, IAdminStatsReader {}
