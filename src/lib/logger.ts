import pino from 'pino'

/**
 * Structured logging using Pino
 *
 * Features:
 * - Structured JSON logging for production
 * - Pretty printing for development
 * - Domain-specific child loggers
 * - Request ID tracking
 * - Performance measurement
 */

// Configure base logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
  },
})

/**
 * Child loggers for different domains
 * Each child logger includes a domain field for easy filtering
 */
export const auctionLogger = logger.child({ domain: 'auction' })
export const paymentLogger = logger.child({ domain: 'payment' })
export const authLogger = logger.child({ domain: 'auth' })
export const fraudLogger = logger.child({ domain: 'fraud' })
export const listingLogger = logger.child({ domain: 'listing' })
export const notificationLogger = logger.child({ domain: 'notification' })
export const adminLogger = logger.child({ domain: 'admin' })
export const apiLogger = logger.child({ domain: 'api' })

/**
 * Log levels:
 * - trace: Very detailed debugging information
 * - debug: Debugging information
 * - info: Informational messages
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal errors that cause shutdown
 */

/**
 * Utility functions for common logging patterns
 */

/**
 * Log an error with stack trace
 */
export function logError(
  logger: pino.Logger,
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  if (error instanceof Error) {
    logger.error({
      err: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      ...context,
    }, message)
  } else {
    logger.error({
      error: String(error),
      ...context,
    }, message)
  }
}

/**
 * Log a database query for debugging
 */
export function logQuery(
  logger: pino.Logger,
  query: string,
  params?: unknown[],
  durationMs?: number
) {
  logger.debug({
    query,
    params,
    durationMs,
  }, 'Database query')
}

/**
 * Log a performance metric
 */
export function logPerformance(
  logger: pino.Logger,
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  logger.info({
    operation,
    durationMs,
    ...metadata,
  }, `Performance: ${operation}`)
}

/**
 * Log an audit event
 */
export function logAudit(
  logger: pino.Logger,
  action: string,
  userId: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, unknown>
) {
  logger.info({
    audit: true,
    action,
    userId,
    resourceType,
    resourceId,
    ...details,
  }, `Audit: ${action}`)
}

/**
 * Log a security event
 */
export function logSecurity(
  logger: pino.Logger,
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  userId?: string,
  details?: Record<string, unknown>
) {
  logger.warn({
    security: true,
    event,
    severity,
    userId,
    ...details,
  }, `Security: ${event}`)
}

/**
 * Create a timer for performance measurement
 */
export function createTimer() {
  const start = Date.now()
  return {
    end: () => Date.now() - start,
  }
}
