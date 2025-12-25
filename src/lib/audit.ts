// Audit logging utilities for payment and auction events
import { prisma } from '@/lib/db'
import { AuditSeverity, AuditStatus } from '@prisma/client'

export type AuditLogParams = {
  actorId?: string
  actorEmail?: string
  actorIp?: string
  actorUserAgent?: string
  action: string
  resourceType: string
  resourceId?: string
  severity?: AuditSeverity
  status?: AuditStatus
  details?: Record<string, unknown>
  changes?: Record<string, unknown>
  errorMessage?: string
  sessionId?: string
  requestId?: string
  functionName?: string
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        actorIp: params.actorIp,
        actorUserAgent: params.actorUserAgent,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        severity: params.severity,
        status: params.status,
        details: (params.details || {}) as object,
        changes: params.changes as object | undefined,
        errorMessage: params.errorMessage,
        sessionId: params.sessionId,
        requestId: params.requestId,
        functionName: params.functionName,
      },
    })
  } catch (error) {
    // Don't throw errors from audit logging - log to console instead
    console.error('Failed to create audit log:', error)
    console.error('Audit log data:', params)
  }
}

/**
 * Log payment events with consistent structure
 */
export class PaymentAuditLogger {
  private actorId?: string
  private actorEmail?: string
  private actorIp?: string
  private actorUserAgent?: string

  constructor(params: {
    actorId?: string
    actorEmail?: string
    actorIp?: string
    actorUserAgent?: string
  }) {
    this.actorId = params.actorId
    this.actorEmail = params.actorEmail
    this.actorIp = params.actorIp
    this.actorUserAgent = params.actorUserAgent
  }

  async logBuyerFeeInitiated(auctionId: string): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.buyer_fee.initiated',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logBuyerFeeSucceeded(
    auctionId: string,
    paymentIntentId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.buyer_fee.succeeded',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        paymentIntentId,
        amount,
        currency,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logBuyerFeeFailed(
    auctionId: string,
    error: string,
    paymentIntentId?: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.buyer_fee.failed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'FAILURE',
      errorMessage: error,
      details: {
        paymentIntentId,
        error,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logBuyerFeeConfirmed(
    auctionId: string,
    paymentIntentId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.buyer_fee.confirmed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        paymentIntentId,
        amount,
        currency,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logDepositCreated(
    auctionId: string,
    depositId: string,
    amount: number
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.deposit.created',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        depositId,
        amount,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logDepositReleased(
    auctionId: string,
    depositId: string,
    reason: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.deposit.released',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        depositId,
        reason,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logDepositCaptured(
    auctionId: string,
    depositId: string,
    reason: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'payment.deposit.captured',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        depositId,
        reason,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logPaymentDeadlineSet(
    auctionId: string,
    deadline: Date
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      action: 'payment.deadline.set',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'LOW',
      status: 'SUCCESS',
      details: {
        deadline: deadline.toISOString(),
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logPaymentOverdue(
    auctionId: string,
    deadline: Date
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      action: 'payment.overdue',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'CRITICAL',
      status: 'FAILURE',
      details: {
        deadline: deadline.toISOString(),
        timestamp: new Date().toISOString(),
      },
    })
  }
}

/**
 * Log auction events
 */
export class AuctionAuditLogger {
  private actorId?: string
  private actorEmail?: string
  private actorIp?: string
  private actorUserAgent?: string

  constructor(params: {
    actorId?: string
    actorEmail?: string
    actorIp?: string
    actorUserAgent?: string
  }) {
    this.actorId = params.actorId
    this.actorEmail = params.actorEmail
    this.actorIp = params.actorIp
    this.actorUserAgent = params.actorUserAgent
  }

  async logAuctionEnded(
    auctionId: string,
    status: string,
    finalPrice?: number,
    winnerId?: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      action: 'auction.ended',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        status,
        finalPrice,
        winnerId,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logBidPlaced(
    auctionId: string,
    bidId: string,
    amount: number,
    bidderId: string
  ): Promise<void> {
    await createAuditLog({
      actorId: bidderId,
      actorEmail: this.actorEmail,
      actorIp: this.actorIp,
      actorUserAgent: this.actorUserAgent,
      action: 'auction.bid_placed',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        bidId,
        amount,
        timestamp: new Date().toISOString(),
      },
    })
  }

  async logAuctionCancelled(
    auctionId: string,
    reason: string
  ): Promise<void> {
    await createAuditLog({
      actorId: this.actorId,
      actorEmail: this.actorEmail,
      action: 'auction.cancelled',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'SUCCESS',
      details: {
        reason,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

/**
 * Helper to get client IP from request headers
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return realIp || undefined
}

/**
 * Helper to get user agent from request headers
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined
}
