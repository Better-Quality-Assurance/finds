import { AuditLog, AuditSeverity, AuditStatus } from '@prisma/client'

/**
 * Parameters for creating an audit event
 */
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
 * Options for filtering audit logs
 */
export type GetAuditLogsOptions = {
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
}

/**
 * Audit statistics for dashboard
 */
export type AuditStats = {
  totalToday: number
  failedToday: number
  highSeverityToday: number
  topActions: Array<{ action: string; count: number }>
}

/**
 * Interface for audit logging service
 * Handles comprehensive audit trail for all system operations
 */
export interface IAuditService {
  /**
   * Log an audit event
   */
  logAuditEvent(params: AuditEventParams): Promise<AuditLog>

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(options: GetAuditLogsOptions): Promise<{ logs: AuditLog[]; total: number }>

  /**
   * Get audit logs for a specific resource
   */
  getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    limit?: number
  ): Promise<AuditLog[]>

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLogs(userId: string, limit?: number): Promise<AuditLog[]>

  /**
   * Get audit stats for dashboard
   */
  getAuditStats(): Promise<AuditStats>
}
