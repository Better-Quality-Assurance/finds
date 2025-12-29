// Audit Service - handles audit logging and retrieval
import { prisma } from '@/lib/db'
import { AuditLog, AuditSeverity, AuditStatus } from '@prisma/client'

export type AuditEventParams = {
  actorId?: string
  actorEmail?: string
  actorIp?: string
  actorUserAgent?: string
  action: string
  resourceType: string
  resourceId?: string
  details?: Record<string, unknown>
  changes?: Record<string, unknown>
  severity?: AuditSeverity
  status?: AuditStatus
  errorMessage?: string
  sessionId?: string
  requestId?: string
  functionName?: string
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: AuditEventParams): Promise<AuditLog> {
  const {
    actorId,
    actorEmail,
    actorIp,
    actorUserAgent,
    action,
    resourceType,
    resourceId,
    details = {},
    changes,
    severity,
    status = 'SUCCESS',
    errorMessage,
    sessionId,
    requestId,
    functionName,
  } = params

  return prisma.auditLog.create({
    data: {
      actorId,
      actorEmail,
      actorIp,
      actorUserAgent,
      action,
      resourceType,
      resourceId,
      details: details as object,
      changes: changes as object | undefined,
      severity,
      status,
      errorMessage,
      sessionId,
      requestId,
      functionName,
    },
  })
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(options: {
  actorId?: string
  resourceType?: string
  resourceId?: string
  action?: string
  severity?: AuditSeverity
  status?: AuditStatus
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}): Promise<{ logs: AuditLog[]; total: number }> {
  const {
    actorId,
    resourceType,
    resourceId,
    action,
    severity,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = options

  const where: Record<string, unknown> = {}

  if (actorId) {where.actorId = actorId}
  if (resourceType) {where.resourceType = resourceType}
  if (resourceId) {where.resourceId = resourceId}
  if (action) {where.action = { contains: action, mode: 'insensitive' }}
  if (severity) {where.severity = severity}
  if (status) {where.status = status}

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {(where.createdAt as Record<string, Date>).gte = startDate}
    if (endDate) {(where.createdAt as Record<string, Date>).lte = endDate}
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string,
  limit = 50
): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: { resourceType, resourceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId: string, limit = 50): Promise<AuditLog[]> {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { actorId: userId },
        { resourceType: 'USER', resourceId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      actor: {
        select: { id: true, name: true, email: true },
      },
    },
  })
}

/**
 * Get audit stats for dashboard
 */
export async function getAuditStats(): Promise<{
  totalToday: number
  failedToday: number
  highSeverityToday: number
  topActions: Array<{ action: string; count: number }>
}> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalToday, failedToday, highSeverityToday, topActions] = await Promise.all([
    prisma.auditLog.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: today }, status: 'FAILURE' },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: today },
        severity: { in: ['HIGH', 'CRITICAL'] },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: true,
      where: { createdAt: { gte: today } },
      orderBy: { _count: { action: 'desc' } },
      take: 10,
    }),
  ])

  return {
    totalToday,
    failedToday,
    highSeverityToday,
    topActions: topActions.map(a => ({ action: a.action, count: a._count })),
  }
}

// Export alias for backward compatibility
export const logAudit = logAuditEvent

// Common audit actions
export const AUDIT_ACTIONS = {
  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_REGISTER: 'USER_REGISTER',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_EMAIL_VERIFIED: 'USER_EMAIL_VERIFIED',
  USER_PROFILE_UPDATED: 'USER_PROFILE_UPDATED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_UNSUSPENDED: 'USER_UNSUSPENDED',
  USER_BANNED: 'USER_BANNED',
  USER_UNBANNED: 'USER_UNBANNED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_VERIFIED: 'USER_VERIFIED',

  // Listing actions
  LISTING_CREATED: 'LISTING_CREATED',
  LISTING_UPDATED: 'LISTING_UPDATED',
  LISTING_SUBMITTED: 'LISTING_SUBMITTED',
  LISTING_APPROVED: 'LISTING_APPROVED',
  LISTING_REJECTED: 'LISTING_REJECTED',
  LISTING_CHANGES_REQUESTED: 'LISTING_CHANGES_REQUESTED',
  LISTING_WITHDRAWN: 'LISTING_WITHDRAWN',

  // Auction actions
  AUCTION_CREATED: 'AUCTION_CREATED',
  AUCTION_STARTED: 'AUCTION_STARTED',
  AUCTION_EXTENDED: 'AUCTION_EXTENDED',
  AUCTION_ENDED: 'AUCTION_ENDED',
  AUCTION_CANCELLED: 'AUCTION_CANCELLED',
  AUCTION_SOLD: 'AUCTION_SOLD',

  // Bid actions
  BID_PLACED: 'BID_PLACED',
  BID_INVALIDATED: 'BID_INVALIDATED',

  // Payment actions
  DEPOSIT_CREATED: 'DEPOSIT_CREATED',
  DEPOSIT_CAPTURED: 'DEPOSIT_CAPTURED',
  DEPOSIT_RELEASED: 'DEPOSIT_RELEASED',
  DEPOSIT_FAILED: 'DEPOSIT_FAILED',

  // Admin actions
  ADMIN_ACTION: 'ADMIN_ACTION',
  FRAUD_ALERT_REVIEWED: 'FRAUD_ALERT_REVIEWED',
} as const
