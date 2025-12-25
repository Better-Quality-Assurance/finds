// User Repository - User-specific database queries
import { PrismaClient, User, Role } from '@prisma/client'
import { BaseRepository, IRepository } from './base.repository'

export type UserWithBids = User & {
  bids: {
    id: string
    amount: number
    isWinning: boolean
    createdAt: Date
  }[]
}

export type UserWithListings = User & {
  listings: {
    id: string
    title: string
    status: string
    createdAt: Date
  }[]
}

/**
 * User repository interface with specific query methods
 */
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>
  findBannedUsers(): Promise<User[]>
  findByRole(role: Role): Promise<User[]>
  updateRole(id: string, role: Role): Promise<User>
  banUser(id: string, reason: string): Promise<User>
  unbanUser(id: string, reason: string): Promise<User>
  enableBidding(id: string): Promise<User>
  disableBidding(id: string): Promise<User>
  findWithActiveListings(userId: string): Promise<UserWithListings | null>
}

/**
 * User repository implementation
 * Handles all user-related database operations
 */
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'User')
  }

  protected getDelegate() {
    return this.prisma.user
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    })
  }

  /**
   * Find all banned users
   */
  async findBannedUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        bannedAt: { not: null },
        unbannedAt: null,
      },
      orderBy: { bannedAt: 'desc' },
    })
  }

  /**
   * Find users by role
   */
  async findByRole(role: Role): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update user role
   */
  async updateRole(id: string, role: Role): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    })
  }

  /**
   * Ban a user
   */
  async banUser(id: string, reason: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        bannedAt: new Date(),
        banReason: reason,
        unbannedAt: null,
        unbanReason: null,
        biddingEnabled: false,
      },
    })
  }

  /**
   * Unban a user
   */
  async unbanUser(id: string, reason: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        unbannedAt: new Date(),
        unbanReason: reason,
      },
    })
  }

  /**
   * Enable bidding for a user
   */
  async enableBidding(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { biddingEnabled: true },
    })
  }

  /**
   * Disable bidding for a user
   */
  async disableBidding(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { biddingEnabled: false },
    })
  }

  /**
   * Find user with their active listings
   */
  async findWithActiveListings(userId: string): Promise<UserWithListings | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        listings: {
          where: {
            status: { in: ['ACTIVE', 'PENDING_REVIEW', 'APPROVED'] },
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  /**
   * Check if user is banned
   */
  async isBanned(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        bannedAt: true,
        unbannedAt: true,
      },
    })

    if (!user) return false

    return user.bannedAt !== null && user.unbannedAt === null
  }

  /**
   * Check if user can bid
   */
  async canBid(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        biddingEnabled: true,
        bannedAt: true,
        unbannedAt: true,
      },
    })

    if (!user) return false

    const isBanned = user.bannedAt !== null && user.unbannedAt === null
    return user.biddingEnabled && !isBanned
  }

  /**
   * Update Stripe customer ID
   */
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    })
  }

  /**
   * Update Stripe Connect account info
   */
  async updateStripeConnect(
    userId: string,
    data: {
      accountId?: string
      status?: string
      payoutEnabled?: boolean
    }
  ): Promise<User> {
    const updateData: Record<string, unknown> = {}

    if (data.accountId) {
      updateData.stripeConnectAccountId = data.accountId
      updateData.stripeConnectOnboardedAt = new Date()
    }

    if (data.status) {
      updateData.stripeConnectStatus = data.status
    }

    if (data.payoutEnabled !== undefined) {
      updateData.payoutEnabled = data.payoutEnabled
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    })
  }

  /**
   * Find users with pending Stripe Connect onboarding
   */
  async findPendingStripeConnect(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        stripeConnectStatus: 'pending',
        stripeConnectAccountId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    preferences: {
      marketingConsent?: boolean
      preferredLanguage?: string
      preferredCurrency?: string
    }
  ): Promise<User> {
    const updateData: Record<string, unknown> = {}

    if (preferences.marketingConsent !== undefined) {
      updateData.marketingConsent = preferences.marketingConsent
      updateData.marketingConsentDate = new Date()
    }

    if (preferences.preferredLanguage) {
      updateData.preferredLanguage = preferences.preferredLanguage
    }

    if (preferences.preferredCurrency) {
      updateData.preferredCurrency = preferences.preferredCurrency
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    })
  }
}
