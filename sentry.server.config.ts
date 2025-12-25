import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Server-Side Configuration
 *
 * Captures errors from Next.js server-side code including:
 * - API routes
 * - Server components
 * - Middleware
 * - Background jobs
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,

  // Performance monitoring - lower sample rate for server
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Enhanced error tracking
  integrations: [
    Sentry.prismaIntegration(),
    Sentry.httpIntegration(),
  ],

  // Don't send errors from development
  enabled: process.env.NODE_ENV !== 'development',

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Enhanced context
  beforeSend(event, hint) {
    // Sanitize sensitive data from server errors
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
      delete event.request.headers['x-api-key']
    }

    if (event.request?.data) {
      if (typeof event.request.data === 'object' && event.request.data !== null) {
        const sanitized = { ...event.request.data } as Record<string, unknown>
        // Remove sensitive fields
        delete sanitized.password
        delete sanitized.passwordHash
        delete sanitized.apiKey
        delete sanitized.secretKey
        delete sanitized.stripeSecretKey
        event.request.data = sanitized
      }
    }

    // Sanitize environment variables
    if (event.contexts?.runtime?.env) {
      const env = event.contexts.runtime.env as Record<string, any>
      Object.keys(env).forEach(key => {
        if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
          env[key] = '[Filtered]'
        }
      })
    }

    return event
  },

  // Track cron job errors separately
  beforeBreadcrumb(breadcrumb) {
    // Add context for cron jobs
    if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/api/cron')) {
      breadcrumb.data.isCronJob = true
    }
    return breadcrumb
  },
})
