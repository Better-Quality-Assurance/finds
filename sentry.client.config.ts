import * as Sentry from '@sentry/nextjs'

/**
 * Sentry Client-Side Configuration
 *
 * Captures errors and performance data from the browser.
 * Includes session replay for debugging user issues.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay - captures user interactions for debugging
  replaysSessionSampleRate: 0.1, // 10% of normal sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Enhanced error tracking
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration({
      // Track route changes
      traceFetch: true,
      traceXHR: true,
    }),
  ],

  // Filter out non-actionable errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    // Network errors that are expected
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    // Abort errors (user cancelled)
    'AbortError',
    'The user aborted a request',
    // ResizeObserver loop errors (benign)
    'ResizeObserver loop',
  ],

  // Don't send errors from development
  enabled: process.env.NODE_ENV !== 'development',

  // Release tracking for deployment correlation
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Enhanced context
  beforeSend(event, hint) {
    // Filter out errors from browser extensions
    if (event.exception?.values?.[0]?.stacktrace?.frames) {
      const frames = event.exception.values[0].stacktrace.frames
      const extensionFrame = frames.find(frame =>
        frame.filename?.includes('chrome-extension://') ||
        frame.filename?.includes('moz-extension://')
      )
      if (extensionFrame) {
        return null
      }
    }

    // Sanitize sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    if (event.request?.data) {
      // Remove password fields
      if (typeof event.request.data === 'object' && event.request.data !== null) {
        const sanitized = { ...event.request.data } as Record<string, unknown>
        delete sanitized.password
        delete sanitized.confirmPassword
        delete sanitized.currentPassword
        event.request.data = sanitized
      }
    }

    return event
  },
})
