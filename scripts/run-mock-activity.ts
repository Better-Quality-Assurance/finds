#!/usr/bin/env tsx
/**
 * Mock Activity Runner Script
 *
 * CLI script for running mock auction activity.
 * Can be run manually or scheduled via cron.
 *
 * Usage:
 *   npx tsx scripts/run-mock-activity.ts [options]
 *
 * Options:
 *   --mode=once|demo     Run mode (default: once)
 *   --duration=<minutes> Duration for continuous run (default: 60)
 *   --bids-only          Only generate bids
 *   --comments-only      Only generate comments
 *   --auction=<id>       Target specific auction(s), comma-separated
 *   --verbose            Show detailed output
 *
 * Examples:
 *   npx tsx scripts/run-mock-activity.ts
 *   npx tsx scripts/run-mock-activity.ts --mode=demo --duration=30
 *   npx tsx scripts/run-mock-activity.ts --bids-only --auction=abc123,def456
 */

import {
  runMockActivityOnce,
  runMockActivityContinuous,
  stopMockActivity,
} from '../src/services/mock-activity-orchestrator.service'
import {
  DEFAULT_MOCK_ACTIVITY_CONFIG,
  DEMO_MOCK_ACTIVITY_CONFIG,
  MockActivityConfig,
} from '../src/services/contracts/mock-activity.interface'

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

function parseArgs(): {
  mode: 'once' | 'demo'
  duration: number
  bidsOnly: boolean
  commentsOnly: boolean
  auctionIds: string[]
  verbose: boolean
} {
  const args = process.argv.slice(2)
  const result = {
    mode: 'once' as 'once' | 'demo',
    duration: 60,
    bidsOnly: false,
    commentsOnly: false,
    auctionIds: [] as string[],
    verbose: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      const mode = arg.replace('--mode=', '')
      if (mode === 'demo' || mode === 'once') {
        result.mode = mode
      }
    } else if (arg.startsWith('--duration=')) {
      result.duration = parseInt(arg.replace('--duration=', ''), 10) || 60
    } else if (arg === '--bids-only') {
      result.bidsOnly = true
    } else if (arg === '--comments-only') {
      result.commentsOnly = true
    } else if (arg.startsWith('--auction=')) {
      result.auctionIds = arg.replace('--auction=', '').split(',').filter(Boolean)
    } else if (arg === '--verbose') {
      result.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Mock Activity Runner

Usage: npx tsx scripts/run-mock-activity.ts [options]

Options:
  --mode=once|demo     Run mode (default: once)
                       once: Single pass of activity generation
                       demo: Continuous generation with aggressive settings
  --duration=<minutes> Duration for demo mode (default: 60)
  --bids-only          Only generate bids, no comments
  --comments-only      Only generate comments, no bids
  --auction=<id>       Target specific auction(s), comma-separated
  --verbose            Show detailed output
  --help, -h           Show this help message

Examples:
  npx tsx scripts/run-mock-activity.ts
  npx tsx scripts/run-mock-activity.ts --mode=demo --duration=30
  npx tsx scripts/run-mock-activity.ts --bids-only --auction=abc123
`)
      process.exit(0)
    }
  }

  return result
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const args = parseArgs()

  console.log('🎭 Mock Activity Generator')
  console.log('=' .repeat(50))
  console.log(`Mode: ${args.mode}`)
  console.log(`Duration: ${args.duration} minutes`)
  console.log(`Bids: ${args.bidsOnly ? 'only' : args.commentsOnly ? 'disabled' : 'enabled'}`)
  console.log(`Comments: ${args.commentsOnly ? 'only' : args.bidsOnly ? 'disabled' : 'enabled'}`)
  if (args.auctionIds.length > 0) {
    console.log(`Target auctions: ${args.auctionIds.join(', ')}`)
  }
  console.log('=' .repeat(50))
  console.log('')

  // Build config
  let config: MockActivityConfig =
    args.mode === 'demo'
      ? { ...DEMO_MOCK_ACTIVITY_CONFIG }
      : { ...DEFAULT_MOCK_ACTIVITY_CONFIG }

  if (args.bidsOnly) {
    config.enableComments = false
  }
  if (args.commentsOnly) {
    config.enableBids = false
  }
  if (args.auctionIds.length > 0) {
    config.targetAuctionIds = args.auctionIds
  }
  if (args.mode === 'demo') {
    config.runDurationMs = args.duration * 60 * 1000
  }

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping mock activity...')
    stopMockActivity()
  })

  process.on('SIGTERM', () => {
    console.log('\n⏹️  Stopping mock activity...')
    stopMockActivity()
  })

  try {
    console.log('🚀 Starting mock activity generation...\n')

    let summary
    if (args.mode === 'demo') {
      summary = await runMockActivityContinuous(config)
    } else {
      summary = await runMockActivityOnce(config)
    }

    console.log('\n✅ Mock activity completed!')
    console.log('=' .repeat(50))
    console.log(`Duration: ${(summary.durationMs / 1000).toFixed(1)} seconds`)
    console.log(`Bids generated: ${summary.bidsGenerated}`)
    console.log(`Comments generated: ${summary.commentsGenerated}`)
    console.log(`Auctions affected: ${summary.auctionsAffected.length}`)

    if (summary.errors.length > 0) {
      console.log(`\n⚠️  Errors (${summary.errors.length}):`)
      for (const error of summary.errors.slice(0, 10)) {
        console.log(`   - ${error}`)
      }
      if (summary.errors.length > 10) {
        console.log(`   ... and ${summary.errors.length - 10} more`)
      }
    }

    if (args.verbose) {
      console.log('\n📊 Detailed Results:')
      console.log('\nBids:')
      for (const bid of summary.bidResults.filter((b) => b.success)) {
        console.log(
          `   ✓ Auction ${bid.auctionId.slice(0, 8)}... - €${bid.amount} ${bid.triggeredExtension ? '(extended!)' : ''}`
        )
      }
      console.log('\nComments:')
      for (const comment of summary.commentResults.filter((c) => c.success)) {
        console.log(
          `   ✓ Listing ${comment.listingId.slice(0, 8)}... ${comment.isSellerResponse ? '(seller response)' : ''}`
        )
      }
    }

    console.log('\n🏁 Done!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error running mock activity:', error)
    process.exit(1)
  }
}

main()
