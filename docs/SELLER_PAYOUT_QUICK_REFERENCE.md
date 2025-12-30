# Seller Payout - Quick Reference Guide

## Common Operations

### Check if Seller Has Payout Account

```typescript
import { prisma } from '@/lib/db'

const seller = await prisma.user.findUnique({
  where: { id: sellerId },
  select: {
    stripeConnectAccountId: true,
    stripeConnectStatus: true,
    payoutEnabled: true,
  },
})

if (seller?.payoutEnabled) {
  console.log('Seller can receive payouts')
} else {
  console.log('Seller needs to complete onboarding')
}
```

### Create Payout Manually

```typescript
import { createSellerPayout } from '@/services/payment.service'

const result = await createSellerPayout(auctionId)

if (result.success) {
  console.log(`Payout created: ${result.payoutId}`)
  console.log(`Amount: €${result.amount}`)
} else {
  console.error(`Payout failed: ${result.error}`)
}
```

### Retry Failed Payout

```typescript
import { retrySellerPayout } from '@/services/payment.service'

const result = await retrySellerPayout(auctionId)
// Returns same PayoutResult as createSellerPayout
```

### Get Payout Status

```typescript
import { getSellerPayoutStatus } from '@/services/payment.service'

const status = await getSellerPayoutStatus(auctionId)

console.log('Status:', status.status)
console.log('Amount:', status.amount)
console.log('Transfer ID:', status.payoutId)
console.log('Paid at:', status.paidAt)
```

### Find Pending Payouts

```typescript
import { prisma } from '@/lib/db'

const pendingPayouts = await prisma.auction.findMany({
  where: {
    status: 'SOLD',
    paymentStatus: 'PAID',
    sellerPayoutStatus: { in: ['pending', null] },
  },
  include: {
    listing: {
      include: {
        seller: {
          select: {
            id: true,
            email: true,
            payoutEnabled: true,
          },
        },
      },
    },
  },
})

for (const auction of pendingPayouts) {
  if (auction.listing.seller.payoutEnabled) {
    await createSellerPayout(auction.id)
  }
}
```

### Get Seller's Payout History

```typescript
import { prisma } from '@/lib/db'

const payoutHistory = await prisma.auction.findMany({
  where: {
    listing: {
      sellerId: sellerId,
    },
    status: 'SOLD',
    paymentStatus: 'PAID',
  },
  select: {
    id: true,
    finalPrice: true,
    sellerPayoutStatus: true,
    sellerPayoutAmount: true,
    sellerPayoutId: true,
    sellerPaidAt: true,
    listing: {
      select: {
        title: true,
        year: true,
        make: true,
        model: true,
      },
    },
  },
  orderBy: {
    sellerPaidAt: 'desc',
  },
})
```

### Calculate Total Seller Earnings

```typescript
import { prisma } from '@/lib/db'

const earnings = await prisma.auction.aggregate({
  where: {
    listing: {
      sellerId: sellerId,
    },
    sellerPayoutStatus: 'completed',
  },
  _sum: {
    sellerPayoutAmount: true,
  },
  _count: true,
})

console.log(`Total earnings: €${earnings._sum.sellerPayoutAmount}`)
console.log(`From ${earnings._count} sales`)
```

## API Endpoints Usage

### Start Onboarding Flow

```typescript
// Client-side
const response = await fetch('/api/seller/stripe-connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
})

const data = await response.json()

if (data.onboardingUrl) {
  // Redirect to Stripe
  window.location.href = data.onboardingUrl
}
```

### Check Account Status

```typescript
// Client-side
const response = await fetch('/api/seller/stripe-connect')
const data = await response.json()

console.log('Connected:', data.connected)
console.log('Status:', data.status)
console.log('Payout enabled:', data.payoutEnabled)
```

### Open Stripe Dashboard

```typescript
// Client-side
const response = await fetch('/api/seller/stripe-connect/dashboard', {
  method: 'POST',
})

const data = await response.json()

if (data.url) {
  window.open(data.url, '_blank')
}
```

## Webhook Event Handling

### Test Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/payments/webhook

# Trigger test events
stripe trigger account.updated
stripe trigger transfer.created
stripe trigger transfer.failed
```

### Monitor Webhook Logs

```typescript
import { prisma } from '@/lib/db'

// Get recent payout-related audit logs
const logs = await prisma.auditLog.findMany({
  where: {
    action: {
      startsWith: 'seller_payout.',
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 50,
})
```

## Admin Dashboard Queries

### Payouts Requiring Attention

```typescript
// Failed payouts
const failedPayouts = await prisma.auction.findMany({
  where: {
    sellerPayoutStatus: 'failed',
  },
  include: {
    listing: {
      include: {
        seller: {
          select: { id: true, email: true, name: true },
        },
      },
    },
  },
})

// Sellers needing to complete onboarding
const incompleteOnboarding = await prisma.user.findMany({
  where: {
    role: { not: 'USER' },
    stripeConnectStatus: { in: ['pending', 'restricted'] },
    listings: {
      some: {
        status: 'ACTIVE',
      },
    },
  },
})
```

### Payout Statistics

```typescript
const stats = await prisma.auction.groupBy({
  by: ['sellerPayoutStatus'],
  where: {
    status: 'SOLD',
    paymentStatus: 'PAID',
  },
  _sum: {
    sellerPayoutAmount: true,
  },
  _count: true,
})

// Results like:
// [
//   { sellerPayoutStatus: 'completed', _count: 45, _sum: { sellerPayoutAmount: 125000 } },
//   { sellerPayoutStatus: 'pending', _count: 3, _sum: { sellerPayoutAmount: 8500 } },
//   { sellerPayoutStatus: 'failed', _count: 1, _sum: { sellerPayoutAmount: 3200 } },
// ]
```

## Error Handling

### Common Error Scenarios

```typescript
// Example of comprehensive error handling
async function processSellerPayout(auctionId: string) {
  try {
    const result = await createSellerPayout(auctionId)

    if (!result.success) {
      // Handle specific errors
      switch (result.error) {
        case 'Seller has no Connect account':
          // Notify seller to complete onboarding
          await notifySeller('Please set up your payout account')
          break

        case 'Seller payouts not enabled':
          // Seller needs to complete requirements
          await notifySeller('Please complete your payout account setup')
          break

        case 'Buyer payment not confirmed':
          // Wait for payment to clear
          console.log('Payment still pending, will retry later')
          break

        default:
          // Unknown error - alert admin
          await alertAdmin(`Payout failed: ${result.error}`)
      }
    }

    return result
  } catch (error) {
    console.error('Unexpected error:', error)
    await alertAdmin(`Critical payout error: ${error.message}`)
    throw error
  }
}
```

## Integration with Cron Jobs

### Daily Payout Processing

```typescript
// Example cron job (using node-cron or similar)
import cron from 'node-cron'
import { createSellerPayout } from '@/services/payment.service'
import { prisma } from '@/lib/db'

// Run every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Processing pending payouts...')

  const pendingAuctions = await prisma.auction.findMany({
    where: {
      status: 'SOLD',
      paymentStatus: 'PAID',
      sellerPayoutStatus: { in: ['pending', null] },
    },
  })

  for (const auction of pendingAuctions) {
    try {
      const result = await createSellerPayout(auction.id)
      if (result.success) {
        console.log(`✓ Payout created for auction ${auction.id}`)
      } else {
        console.error(`✗ Payout failed for auction ${auction.id}: ${result.error}`)
      }
    } catch (error) {
      console.error(`✗ Error processing auction ${auction.id}:`, error)
    }
  }

  console.log('Payout processing complete')
})
```

## Monitoring & Alerts

### Set Up Alerts

```typescript
// Example: Alert on high-value failed payouts
async function checkFailedPayouts() {
  const failedHighValue = await prisma.auction.findMany({
    where: {
      sellerPayoutStatus: 'failed',
      sellerPayoutAmount: {
        gte: 10000, // €10,000+
      },
    },
  })

  if (failedHighValue.length > 0) {
    // Send urgent notification
    await sendSlackAlert({
      level: 'critical',
      message: `${failedHighValue.length} high-value payouts failed`,
      auctions: failedHighValue.map(a => a.id),
    })
  }
}
```

## Performance Optimization

### Batch Processing

```typescript
// Process payouts in batches to avoid rate limits
async function batchProcessPayouts(auctionIds: string[], batchSize = 10) {
  for (let i = 0; i < auctionIds.length; i += batchSize) {
    const batch = auctionIds.slice(i, i + batchSize)

    await Promise.allSettled(
      batch.map(async (auctionId) => {
        return createSellerPayout(auctionId)
      })
    )

    // Wait between batches to respect Stripe rate limits
    if (i + batchSize < auctionIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}
```

## Debugging Tips

1. **Check Audit Logs**: All payout operations are logged
   ```sql
   SELECT * FROM audit_log
   WHERE action LIKE 'seller_payout.%'
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. **Verify Stripe Dashboard**: Cross-reference with Stripe Connect > Transfers

3. **Test with Stripe CLI**:
   ```bash
   stripe trigger transfer.created --override destination:acct_xxx
   ```

4. **Check Webhook Delivery**: Stripe Dashboard > Developers > Webhooks

5. **Monitor Queue**: If using job queue, check pending/failed jobs

## Environment-Specific Notes

### Development
- Use Stripe test mode keys
- Test webhooks with Stripe CLI
- Can manually trigger payouts via admin panel

### Staging
- Use Stripe test mode
- Enable verbose logging
- Test with realistic data volumes

### Production
- Use Stripe live mode keys
- Configure monitoring and alerts
- Set up job queue for reliability
- Regular reconciliation with Stripe reports

---

**Last Updated**: December 29, 2025
