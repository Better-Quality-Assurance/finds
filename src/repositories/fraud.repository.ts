// Fraud Repository - Fraud detection and alert database queries
import { PrismaClient, FraudAlert, AlertSeverity, AlertStatus } from '@prisma/client'
import { BaseRepository, IRepository } from './base.repository'

export type FraudAlertWithUser = FraudAlert & {
  user: {
    id: string
    name: string | null
    email: string
  } | null
}

/**
 * Fraud repository interface with specific query methods
 */
export interface IFraudRepository extends IRepository<FraudAlert> {
  findOpenAlerts(options?: {
    severity?: AlertSeverity
    limit?: number
    offset?: number
  }): Promise<{ alerts: FraudAlertWithUser[]; total: number }>
  findByUserId(userId: string): Promise<FraudAlert[]>
  findByAuctionId(auctionId: string): Promise<FraudAlert[]>
  findBySeverity(severity: AlertSeverity): Promise<FraudAlert[]>
  updateStatus(
    alertId: string,
    status: AlertStatus,
    reviewerId: string,
    notes?: string
  ): Promise<FraudAlert>
  countOpenAlerts(): Promise<number>
  countCriticalAlerts(): Promise<number>
  countAlertsByType(): Promise<Record<string, number>>
}

/**
 * Fraud repository implementation
 * Handles all fraud alert database operations
 */
export class FraudRepository extends BaseRepository<FraudAlert> implements IFraudRepository {
  constructor(prisma: PrismaClient) {
    super(prisma, 'FraudAlert')
  }

  protected getDelegate() {
    return this.prisma.fraudAlert
  }

  /**
   * Find open fraud alerts with optional filters
   */
  async findOpenAlerts(options?: {
    severity?: AlertSeverity
    limit?: number
    offset?: number
  }): Promise<{ alerts: FraudAlertWithUser[]; total: number }> {
    const { severity, limit = 50, offset = 0 } = options || {}

    const where: Record<string, unknown> = {
      status: 'OPEN',
    }

    if (severity) {
      where.severity = severity
    }

    const [alerts, total] = await Promise.all([
      this.prisma.fraudAlert.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.fraudAlert.count({ where }),
    ])

    return { alerts, total }
  }

  /**
   * Find all fraud alerts for a specific user
   */
  async findByUserId(userId: string): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find all fraud alerts for a specific auction
   */
  async findByAuctionId(auctionId: string): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: { auctionId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Find alerts by severity level
   */
  async findBySeverity(severity: AlertSeverity): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: { severity },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update alert status and add review notes
   */
  async updateStatus(
    alertId: string,
    status: AlertStatus,
    reviewerId: string,
    notes?: string
  ): Promise<FraudAlert> {
    return this.prisma.fraudAlert.update({
      where: { id: alertId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        resolutionNotes: notes,
      },
    })
  }

  /**
   * Count open fraud alerts
   */
  async countOpenAlerts(): Promise<number> {
    return this.prisma.fraudAlert.count({
      where: { status: 'OPEN' },
    })
  }

  /**
   * Count critical severity alerts
   */
  async countCriticalAlerts(): Promise<number> {
    return this.prisma.fraudAlert.count({
      where: {
        status: 'OPEN',
        severity: 'CRITICAL',
      },
    })
  }

  /**
   * Get count of alerts grouped by type
   */
  async countAlertsByType(): Promise<Record<string, number>> {
    const results = await this.prisma.fraudAlert.groupBy({
      by: ['alertType'],
      _count: true,
      where: { status: 'OPEN' },
    })

    return Object.fromEntries(results.map(r => [r.alertType, r._count]))
  }

  /**
   * Count alerts created today
   */
  async countAlertsToday(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.prisma.fraudAlert.count({
      where: {
        createdAt: { gte: today },
      },
    })
  }

  /**
   * Find recent alerts for a user (fraud history check)
   */
  async findRecentByUserId(userId: string, limit: number = 10): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Count critical alerts for a user
   */
  async countCriticalAlertsByUserId(userId: string): Promise<number> {
    return this.prisma.fraudAlert.count({
      where: {
        userId,
        severity: 'CRITICAL',
      },
    })
  }

  /**
   * Check if user has suspicious activity
   */
  async hasUserSuspiciousActivity(userId: string): Promise<boolean> {
    const criticalCount = await this.countCriticalAlertsByUserId(userId)
    if (criticalCount > 0) return true

    const totalCount = await this.count({ userId })
    return totalCount >= 5
  }

  /**
   * Find unresolved alerts for an auction
   */
  async findUnresolvedByAuctionId(auctionId: string): Promise<FraudAlert[]> {
    return this.prisma.fraudAlert.findMany({
      where: {
        auctionId,
        status: { in: ['OPEN', 'INVESTIGATING'] },
      },
      orderBy: { severity: 'desc' },
    })
  }

  /**
   * Get fraud statistics for dashboard
   */
  async getStats(): Promise<{
    openAlerts: number
    criticalAlerts: number
    alertsToday: number
    alertsByType: Record<string, number>
    alertsBySeverity: Record<string, number>
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [openAlerts, criticalAlerts, alertsToday, alertsByType, alertsBySeverity] = await Promise.all([
      this.countOpenAlerts(),
      this.countCriticalAlerts(),
      this.countAlertsToday(),
      this.countAlertsByType(),
      this.prisma.fraudAlert.groupBy({
        by: ['severity'],
        _count: true,
        where: { status: 'OPEN' },
      }),
    ])

    return {
      openAlerts,
      criticalAlerts,
      alertsToday,
      alertsByType,
      alertsBySeverity: Object.fromEntries(
        alertsBySeverity.map(r => [r.severity, r._count])
      ),
    }
  }

  /**
   * Mark alert as investigating
   */
  async markAsInvestigating(alertId: string, reviewerId: string): Promise<FraudAlert> {
    return this.updateStatus(alertId, 'INVESTIGATING', reviewerId)
  }

  /**
   * Resolve alert
   */
  async resolve(alertId: string, reviewerId: string, notes?: string): Promise<FraudAlert> {
    return this.updateStatus(alertId, 'RESOLVED', reviewerId, notes)
  }

  /**
   * Mark alert as false positive
   */
  async markAsFalsePositive(alertId: string, reviewerId: string, notes?: string): Promise<FraudAlert> {
    return this.updateStatus(alertId, 'FALSE_POSITIVE', reviewerId, notes)
  }
}
