/**
 * In-app scheduler for Railway deployment
 *
 * Initialize in your app's startup (e.g., instrumentation.ts or a custom server)
 * Note: Only runs if ENABLE_SCHEDULER=true to avoid duplicate runs in dev
 */

import cron from 'node-cron'

let initialized = false

export function initScheduler() {
  // Only run once, and only if explicitly enabled
  if (initialized || process.env.ENABLE_SCHEDULER !== 'true') {
    return
  }

  initialized = true
  console.log('[Scheduler] Initializing cron jobs...')

  // Fetch global sales daily at 6 AM UTC
  cron.schedule('0 6 * * *', async () => {
    console.log('[Scheduler] Running fetch-global-sales...')

    try {
      const response = await fetch(
        `${process.env.APP_URL || 'http://localhost:3000'}/api/cron/fetch-global-sales`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET}`,
          },
        }
      )

      const data = await response.json()
      console.log('[Scheduler] fetch-global-sales result:', data)
    } catch (error) {
      console.error('[Scheduler] fetch-global-sales error:', error)
    }
  })

  console.log('[Scheduler] Cron jobs initialized')
}
