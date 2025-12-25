/**
 * Next.js Instrumentation File
 *
 * This file is used to initialize Sentry and other monitoring tools.
 * It runs once when the server starts up.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Server-side instrumentation
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

      integrations: [
        Sentry.prismaIntegration(),
        Sentry.httpIntegration(),
      ],

      enabled: process.env.NODE_ENV !== 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA,

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
            delete sanitized.password
            delete sanitized.passwordHash
            delete sanitized.apiKey
            delete sanitized.secretKey
            delete sanitized.stripeSecretKey
            event.request.data = sanitized
          }
        }

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

      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/api/cron')) {
          breadcrumb.data.isCronJob = true
        }
        return breadcrumb
      },
    })
  }

  // Edge runtime instrumentation
  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
      enabled: process.env.NODE_ENV !== 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA,

      beforeSend(event, hint) {
        if (event.contexts) {
          event.contexts.runtime = {
            ...event.contexts.runtime,
            name: 'edge',
          }
        }

        if (event.request?.headers) {
          delete event.request.headers['authorization']
          delete event.request.headers['cookie']
        }

        return event
      },
    })
  }
}
