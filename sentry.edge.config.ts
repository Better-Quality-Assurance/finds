import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Edge Runtime Configuration
 *
 * Captures errors from Edge runtime including:
 * - Edge API routes
 * - Middleware
 * - Edge functions
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,

  // Performance monitoring - conservative for edge
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Don't send errors from development
  enabled: process.env.NODE_ENV !== 'development',

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Edge-specific context
  beforeSend(event, hint) {
    // Add edge runtime marker
    if (event.contexts) {
      event.contexts.runtime = {
        ...event.contexts.runtime,
        name: 'edge',
      }
    }

    // Sanitize sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    return event
  },
})
