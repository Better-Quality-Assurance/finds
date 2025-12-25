# Developer Guide - Buyer Fee Charging System

## Quick Start

### 1. Run Migration
```bash
npx prisma migrate deploy
# Or for development
npx prisma migrate dev
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Set Environment Variables
```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET=your_secure_random_string
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Test the System
```bash
npm run dev
```

## File Structure

```
/Users/brad/Code2/finds/
├── prisma/
│   ├── schema.prisma (Modified: Added PaymentStatus enum and Auction fields)
│   └── migrations/
│       └── 20251225175710_add_auction_payment_tracking/
│           └── migration.sql
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── payments/
│   │       │   ├── charge-fee/route.ts (NEW)
│   │       │   ├── confirm-fee/route.ts (NEW)
│   │       │   ├── status/route.ts (NEW)
│   │       │   └── webhook/route.ts (Modified)
│   │       └── cron/
│   │           └── check-overdue-payments/route.ts (NEW)
│   ├── lib/
│   │   ├── audit.ts (NEW - Audit logging utilities)
│   │   └── stripe.ts (Existing - No changes needed)
│   ├── services/
│   │   ├── payment.service.ts (Modified - Added buyer fee functions)
│   │   └── auction.service.ts (Modified - Added deadline setting)
│   └── domain/
│       └── auction/
│           └── rules.ts (Existing - No changes needed)
└── Documentation/
    ├── BUYER_FEE_SYSTEM.md (NEW - Complete system docs)
    ├── IMPLEMENTATION_SUMMARY.md (NEW - Implementation overview)
    └── DEVELOPER_GUIDE.md (NEW - This file)
```

## API Endpoints Reference

### Charge Buyer Fee
```typescript
// POST /api/payments/charge-fee
fetch('/api/payments/charge-fee', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Session cookie automatically included
  },
  body: JSON.stringify({
    auctionId: 'clx123abc'
  })
})
```

**Response Types**:
1. **Success (immediate)**:
   ```json
   { "success": true, "paymentIntentId": "pi_xxx" }
   ```

2. **Requires 3DS**:
   ```json
   {
     "success": false,
     "requiresAction": true,
     "clientSecret": "pi_xxx_secret_yyy",
     "paymentIntentId": "pi_xxx"
   }
   ```

3. **Error**:
   ```json
   { "error": "Auction is not sold" }
   ```

### Confirm Payment (After 3DS)
```typescript
// POST /api/payments/confirm-fee
fetch('/api/payments/confirm-fee', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentIntentId: 'pi_xxx'
  })
})
```

### Get Payment Status
```typescript
// POST /api/payments/status
fetch('/api/payments/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    auctionId: 'clx123abc'
  })
})
```

**Response**:
```json
{
  "success": true,
  "status": "PAID",
  "paidAt": "2025-12-25T10:30:00Z",
  "paymentDeadline": "2025-12-30T23:59:59Z",
  "totalAmount": 10500.00,
  "breakdown": {
    "finalPrice": 10000.00,
    "buyerFee": 500.00
  }
}
```

## Service Function Reference

### Payment Service

```typescript
import {
  chargeBuyerFee,
  confirmBuyerFeePayment,
  getAuctionPaymentStatus,
  setPaymentDeadline,
  checkOverduePayments
} from '@/services/payment.service'

// Charge buyer fee
const result = await chargeBuyerFee('auctionId', 'userId')
if (result.success) {
  console.log('Payment succeeded:', result.paymentIntent.id)
} else if (result.requiresAction) {
  console.log('3DS required:', result.clientSecret)
} else {
  console.error('Payment failed:', result.error)
}

// Confirm after 3DS
const confirmation = await confirmBuyerFeePayment('pi_xxx')

// Get payment status
const status = await getAuctionPaymentStatus('auctionId')

// Set payment deadline (called automatically when auction ends)
const auction = await setPaymentDeadline('auctionId')

// Check overdue payments (called by cron job)
const overdueIds = await checkOverduePayments()
```

### Auction Service

```typescript
import { endAuction } from '@/services/auction.service'

// End auction (automatically sets payment deadline if SOLD)
const auction = await endAuction('auctionId')
// auction.paymentDeadline is now set
// auction.paymentStatus is now 'UNPAID'
```

## Audit Logging

### Using PaymentAuditLogger

```typescript
import { PaymentAuditLogger, getClientIp, getUserAgent } from '@/lib/audit'

// In API route
const logger = new PaymentAuditLogger({
  actorId: session.user.id,
  actorEmail: session.user.email,
  actorIp: getClientIp(request),
  actorUserAgent: getUserAgent(request)
})

// Log events
await logger.logBuyerFeeInitiated(auctionId)
await logger.logBuyerFeeSucceeded(auctionId, paymentIntentId, amount, currency)
await logger.logBuyerFeeFailed(auctionId, error)
await logger.logBuyerFeeConfirmed(auctionId, paymentIntentId, amount, currency)
```

### Direct Audit Logging

```typescript
import { createAuditLog } from '@/lib/audit'

await createAuditLog({
  actorId: userId,
  actorEmail: userEmail,
  action: 'custom.action',
  resourceType: 'auction',
  resourceId: auctionId,
  severity: 'HIGH',
  status: 'SUCCESS',
  details: {
    customField: 'value'
  }
})
```

## Database Queries

### Check Payment Status
```typescript
const auction = await prisma.auction.findUnique({
  where: { id: auctionId },
  select: {
    paymentStatus: true,
    paymentIntentId: true,
    paidAt: true,
    paymentDeadline: true,
    finalPrice: true,
    buyerFeeAmount: true
  }
})
```

### Find Unpaid Auctions
```typescript
const unpaidAuctions = await prisma.auction.findMany({
  where: {
    status: 'SOLD',
    paymentStatus: 'UNPAID'
  },
  include: {
    listing: {
      select: { title: true }
    }
  }
})
```

### Find Overdue Payments
```typescript
const overdueAuctions = await prisma.auction.findMany({
  where: {
    status: 'SOLD',
    paymentStatus: { in: ['UNPAID', 'PENDING'] },
    paymentDeadline: { lte: new Date() }
  }
})
```

## Testing

### Local Testing with Stripe CLI

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local dev**:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

4. **Trigger test webhook**:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

### Test Cards

```typescript
// Successful payment
const cardNumber = '4242 4242 4242 4242'

// Requires 3DS authentication
const cardNumber3DS = '4000 0027 6000 3184'

// Card declined
const cardDeclined = '4000 0000 0000 0002'

// Insufficient funds
const insufficientFunds = '4000 0000 0000 9995'
```

### Manual Testing Steps

1. **Create Test Auction**:
   - Create listing
   - Approve listing
   - Create auction
   - Place bid
   - End auction (should set SOLD status)

2. **Verify Payment Deadline Set**:
   ```sql
   SELECT payment_deadline, payment_status
   FROM auctions
   WHERE id = 'your_auction_id';
   ```

3. **Charge Buyer Fee**:
   ```bash
   curl -X POST http://localhost:3000/api/payments/charge-fee \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=your_session" \
     -d '{"auctionId":"your_auction_id"}'
   ```

4. **Check Payment Status**:
   ```bash
   curl -X POST http://localhost:3000/api/payments/status \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=your_session" \
     -d '{"auctionId":"your_auction_id"}'
   ```

5. **Verify Audit Logs**:
   ```sql
   SELECT action, severity, status, details
   FROM audit_log
   WHERE resource_id = 'your_auction_id'
   ORDER BY created_at DESC;
   ```

## Common Errors and Solutions

### Error: "Auction is not sold"
**Cause**: Trying to charge fee for auction that isn't in SOLD status
**Solution**: Ensure auction.status is 'SOLD'

### Error: "User is not the auction winner"
**Cause**: Non-winner trying to pay
**Solution**: Verify auction.winnerId matches current user ID

### Error: "Buyer fee already paid"
**Cause**: Attempting to charge fee twice
**Solution**: Check auction.paymentStatus, should be 'UNPAID'

### Error: "Payment deadline has passed"
**Cause**: Trying to pay after deadline
**Solution**: Check auction.paymentDeadline, may need admin override

### Error: "No valid payment method found"
**Cause**: User doesn't have saved payment method
**Solution**: User needs to add payment method via /api/payments/setup

## Stripe Dashboard

### Viewing Payments
1. Go to Stripe Dashboard → Payments
2. Filter by metadata: `type: buyer_fee`
3. View payment intent details
4. Check for 3DS authentication status

### Viewing Webhooks
1. Go to Stripe Dashboard → Developers → Webhooks
2. View webhook events
3. Check for failed deliveries
4. Manually retry failed webhooks

### Testing Mode
- Use test API keys (starts with `sk_test_`)
- All test data is isolated
- Can use Stripe test cards
- Webhooks work in test mode

## Cron Job Setup

### Vercel Deployment
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue-payments",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Manual Execution
```bash
curl -X GET http://localhost:3000/api/cron/check-overdue-payments \
  -H "Authorization: Bearer your_cron_secret"
```

### Monitoring Cron Job
Check logs for:
```
[CRON] Starting overdue payment check...
[CRON] Found 3 overdue payments
[CRON] Overdue auction IDs: [...]
```

## Debugging

### Enable Detailed Logging
```typescript
// In payment.service.ts
console.log('Payment attempt:', { auctionId, userId, amount })
console.log('Stripe response:', paymentIntent)
```

### Check Audit Logs
```sql
-- All payment events
SELECT * FROM audit_log
WHERE action LIKE 'payment.%'
ORDER BY created_at DESC
LIMIT 50;

-- Failed payments
SELECT * FROM audit_log
WHERE status = 'FAILURE'
  AND action LIKE 'payment.%'
ORDER BY created_at DESC;

-- Specific auction
SELECT * FROM audit_log
WHERE resource_id = 'auction_id'
ORDER BY created_at DESC;
```

### Stripe Event Log
```typescript
// In webhook handler
console.log('Webhook event:', event.type)
console.log('Payment intent:', paymentIntent.id)
console.log('Metadata:', paymentIntent.metadata)
```

## Performance Considerations

### Database Indexes
Ensure indexes exist on:
```sql
CREATE INDEX idx_auctions_payment_status ON auctions(payment_status);
CREATE INDEX idx_auctions_payment_deadline ON auctions(payment_deadline);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
```

### Webhook Processing
- Webhooks are processed asynchronously
- Database updates should be idempotent
- Use `updateMany` with specific conditions

### Cron Job Optimization
- Runs daily (not hourly) to reduce load
- Uses indexed queries
- Processes in batches if needed

## Security Checklist

- [x] All API endpoints require authentication
- [x] Authorization checks (winner/seller/admin only)
- [x] Stripe webhook signature verification
- [x] CRON_SECRET for cron job authorization
- [x] Payment method stored in Stripe (PCI compliant)
- [x] No sensitive data in audit logs
- [x] HTTPS required for production
- [x] Environment variables for secrets

## Production Checklist

- [ ] Run database migration
- [ ] Set production environment variables
- [ ] Configure Stripe production webhook
- [ ] Set up cron job (Vercel Cron or alternative)
- [ ] Test payment flow in production
- [ ] Monitor first few payments
- [ ] Set up alerts for failed payments
- [ ] Document rollback procedure

## Support Contacts

- **Technical Issues**: Check audit_log table
- **Stripe Issues**: Stripe Dashboard → Support
- **Payment Disputes**: Stripe Dashboard → Disputes
- **Cron Job Issues**: Check deployment platform logs

## Additional Resources

- [Stripe PaymentIntents API](https://stripe.com/docs/api/payment_intents)
- [3D Secure Authentication](https://stripe.com/docs/payments/3d-secure)
- [Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
