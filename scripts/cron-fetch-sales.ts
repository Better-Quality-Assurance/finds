#!/usr/bin/env npx tsx
/**
 * Standalone cron script for Railway
 *
 * Run with: npx tsx scripts/cron-fetch-sales.ts
 *
 * Set up as a Railway Cron Service with schedule: 0 6 * * *
 */

const CRON_SECRET = process.env.CRON_SECRET
const APP_URL = process.env.APP_URL || 'http://localhost:3000'

async function main() {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET environment variable is required')
    process.exit(1)
  }

  console.log(`[CRON] Triggering fetch-global-sales at ${new Date().toISOString()}`)

  try {
    const response = await fetch(`${APP_URL}/api/cron/fetch-global-sales`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[CRON] Failed:', data)
      process.exit(1)
    }

    console.log('[CRON] Success:', JSON.stringify(data, null, 2))
    process.exit(0)
  } catch (error) {
    console.error('[CRON] Error:', error)
    process.exit(1)
  }
}

main()
