import { AlertSeverity, FraudAlert } from '@prisma/client'

/**
 * Individual fraud alert
 */
export type FraudAlertItem = {
  type: string
  severity: AlertSeverity
  message: string
  details: Record<string, unknown>
}

/**
 * Result of fraud checks
 */
export type FraudCheckResult = {
  passed: boolean
  alerts: FraudAlertItem[]
}

/**
 * Parameters for running bid fraud checks
 */
export type BidFraudCheckParams = {
  userId: string
  auctionId: string
  bidAmount: number
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Parameters for creating fraud alert
 */
export type CreateFraudAlertParams = {
  userId?: string
  auctionId?: string
  bidId?: string
  alertType: string
  severity: AlertSeverity
  details: Record<string, unknown>
}

/**
 * Options for getting open alerts
 */
export type GetOpenAlertsOptions = {
  severity?: AlertSeverity
  limit?: number
  offset?: number
}

/**
 * Fraud statistics for dashboard
 */
export type FraudStats = {
  openAlerts: number
  criticalAlerts: number
  alertsToday: number
  alertsByType: Record<string, number>
}

/**
 * User fraud history
 */
export type UserFraudHistory = {
  totalAlerts: number
  criticalAlerts: number
  recentAlerts: FraudAlert[]
  isSuspicious: boolean
}

/**
 * Interface for fraud detection service
 * Handles bid fraud prevention, detection, and alert management
 */
export interface IFraudService {
  /**
   * Run all fraud checks before placing a bid
   */
  runBidFraudChecks(params: BidFraudCheckParams): Promise<FraudCheckResult>

  /**
   * Create a fraud alert in the database
   */
  createFraudAlert(params: CreateFraudAlertParams): Promise<FraudAlert>

  /**
   * Get open fraud alerts
   */
  getOpenAlerts(options?: GetOpenAlertsOptions): Promise<{ alerts: FraudAlert[]; total: number }>

  /**
   * Review and update a fraud alert
   */
  reviewFraudAlert(
    alertId: string,
    reviewerId: string,
    status: 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE',
    notes?: string
  ): Promise<FraudAlert>

  /**
   * Get fraud stats for dashboard
   */
  getFraudStats(): Promise<FraudStats>

  /**
   * Check user's fraud history
   */
  getUserFraudHistory(userId: string): Promise<UserFraudHistory>
}
