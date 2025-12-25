# Deployment Checklist - Buyer Fee Charging System

## Pre-Deployment

### 1. Code Review
- [ ] Review all new API endpoints
- [ ] Review service function implementations
- [ ] Review webhook handler updates
- [ ] Review audit logging implementation
- [ ] Verify TypeScript compilation: `npm run build`
- [ ] Run linter: `npm run lint`
- [ ] Check for console.log statements (except intentional logging)

### 2. Database Preparation
- [ ] Review migration SQL file
- [ ] Backup production database
- [ ] Test migration on staging database
- [ ] Verify no conflicts with existing data
- [ ] Plan rollback strategy

### 3. Testing
- [ ] Unit tests for payment service functions
- [ ] Integration tests for API endpoints
- [ ] Test webhook handling locally
- [ ] Test with Stripe test cards (see below)
- [ ] Test payment deadline calculation
- [ ] Test authorization checks
- [ ] Test audit logging

### 4. Environment Configuration
- [ ] Verify `STRIPE_SECRET_KEY` (production)
- [ ] Verify `STRIPE_PUBLISHABLE_KEY` (production)
- [ ] Set `STRIPE_WEBHOOK_SECRET` (will get from Stripe)
- [ ] Set `CRON_SECRET` (generate secure random string)
- [ ] Verify `NEXT_PUBLIC_APP_URL` (production URL)
- [ ] Set `DATABASE_URL` (production database)

## Stripe Test Cards

Test all scenarios before deploying:

### Success Cases
```
Card: 4242 4242 4242 4242
CVC: Any 3 digits
Date: Any future date
Result: Immediate success
```

### 3D Secure Authentication
```
Card: 4000 0027 6000 3184
CVC: Any 3 digits
Date: Any future date
Result: Requires 3DS authentication
```

### Failure Cases
```
Declined: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
Expired card: 4000 0000 0000 0069
Incorrect CVC: 4000 0000 0000 0127
```

## Deployment Steps

### Step 1: Backup
```bash
# Backup production database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup environment variables
cp .env.production .env.production.backup
```

### Step 2: Deploy Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build application
npm run build

# Deploy to hosting platform
# (Vercel, AWS, etc. - follow your platform's process)
```

### Step 3: Run Migration
```bash
# Production migration
npx prisma migrate deploy

# Verify migration
npx prisma migrate status

# Generate Prisma client
npx prisma generate
```

### Step 4: Configure Stripe Webhook

1. **Go to Stripe Dashboard** → Developers → Webhooks

2. **Add Endpoint**:
   - URL: `https://yourdomain.com/api/payments/webhook`
   - Description: "Buyer fee payment webhooks"
   - Events to send:
     - [x] payment_intent.succeeded
     - [x] payment_intent.payment_failed
     - [x] payment_intent.canceled
     - [x] setup_intent.succeeded (existing)

3. **Get Webhook Secret**:
   - Click on webhook endpoint
   - Reveal signing secret
   - Copy `whsec_...` value

4. **Update Environment Variable**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. **Test Webhook**:
   - Send test event from Stripe Dashboard
   - Check application logs for successful processing
   - Verify audit_log table has entry

### Step 5: Set Up Cron Job

#### Option A: Vercel Cron
1. Add to `vercel.json`:
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

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Verify in Vercel Dashboard → Settings → Cron Jobs

#### Option B: External Cron Service
1. Use service like cron-job.org, EasyCron, or AWS EventBridge

2. Configure:
   - URL: `https://yourdomain.com/api/cron/check-overdue-payments`
   - Schedule: `0 0 * * *` (daily at midnight)
   - Method: GET
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`

3. Test:
   ```bash
   curl -X GET https://yourdomain.com/api/cron/check-overdue-payments \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

### Step 6: Verify Deployment

#### Database Verification
```sql
-- Check new columns exist
\d auctions

-- Should show:
-- payment_status | PaymentStatus | not null | default 'UNPAID'
-- payment_intent_id | text
-- paid_at | timestamp(3)
-- payment_deadline | timestamp(3)

-- Check enum exists
SELECT enum_range(NULL::PaymentStatus);
-- Should return: {UNPAID,PENDING,PAID,FAILED,REFUNDED}
```

#### API Endpoint Verification
```bash
# Test charge-fee endpoint (should return 401 without auth)
curl -X POST https://yourdomain.com/api/payments/charge-fee \
  -H "Content-Type: application/json" \
  -d '{"auctionId":"test"}'

# Expected: {"error":"Unauthorized"}

# Test status endpoint (should return 401 without auth)
curl -X POST https://yourdomain.com/api/payments/status \
  -H "Content-Type: application/json" \
  -d '{"auctionId":"test"}'

# Expected: {"error":"Unauthorized"}

# Test webhook endpoint (should return 400 without signature)
curl -X POST https://yourdomain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: {"error":"Missing signature"}

# Test cron endpoint (should return 401 without auth)
curl -X GET https://yourdomain.com/api/cron/check-overdue-payments

# Expected: {"error":"Unauthorized"}
```

#### Webhook Verification
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select `payment_intent.succeeded`
5. Check response is 200 OK
6. Check audit_log table for entry

### Step 7: Monitor Initial Transactions

#### First 24 Hours
- [ ] Monitor all payment attempts
- [ ] Check audit_log for errors
- [ ] Verify webhook deliveries in Stripe Dashboard
- [ ] Check cron job execution logs
- [ ] Monitor application error logs

#### First Week
- [ ] Review payment success rate
- [ ] Review 3DS authentication rate
- [ ] Check for any failed webhooks
- [ ] Verify overdue payment detection
- [ ] Review audit log patterns

## Post-Deployment

### 1. Documentation
- [ ] Update internal documentation
- [ ] Train support team on payment flow
- [ ] Document common issues and solutions
- [ ] Create runbook for payment failures

### 2. Monitoring Setup

#### Alerts
Set up alerts for:
- [ ] Payment failure rate > 10%
- [ ] Webhook delivery failures
- [ ] Cron job execution failures
- [ ] Database connection errors
- [ ] Stripe API errors

#### Metrics to Track
```sql
-- Daily payment metrics
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE payment_status = 'PAID') as paid,
  COUNT(*) FILTER (WHERE payment_status = 'FAILED') as failed,
  COUNT(*) FILTER (WHERE payment_status = 'PENDING') as pending,
  AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/3600) as avg_hours_to_payment
FROM auctions
WHERE status = 'SOLD'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Overdue payments
SELECT COUNT(*)
FROM auctions
WHERE status = 'SOLD'
  AND payment_status IN ('UNPAID', 'PENDING')
  AND payment_deadline < NOW();

-- Failed payments by error type
SELECT
  details->>'error' as error_type,
  COUNT(*) as count
FROM audit_log
WHERE action = 'payment.buyer_fee.failed'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_type
ORDER BY count DESC;
```

### 3. User Communication
- [ ] Update Terms of Service (if needed)
- [ ] Add buyer fee information to auction pages
- [ ] Email template for payment instructions
- [ ] Email template for payment reminders
- [ ] Email template for payment confirmation
- [ ] FAQ entries about buyer fees

### 4. Support Preparation
- [ ] Train support team on payment process
- [ ] Create canned responses for common issues
- [ ] Document escalation procedures
- [ ] Set up payment dashboard for support team

## Rollback Plan

### If Critical Issues Arise

#### Option 1: Disable Fee Charging (Quick Fix)
```typescript
// In charge-fee/route.ts, add at top:
return NextResponse.json(
  { error: 'Payment system temporarily disabled' },
  { status: 503 }
)
```

#### Option 2: Rollback Migration
```bash
# This will remove the new columns
# WARNING: This will lose any payment data!

# Rollback migration
npx prisma migrate resolve --rolled-back 20251225175710_add_auction_payment_tracking

# Deploy previous version
git revert HEAD
git push
```

#### Option 3: Manual Intervention
```sql
-- Reset payment statuses to allow manual processing
UPDATE auctions
SET payment_status = 'UNPAID',
    payment_intent_id = NULL,
    paid_at = NULL
WHERE payment_status = 'FAILED'
  AND created_at > NOW() - INTERVAL '1 day';
```

## Production Environment Variables

Create `.env.production` with:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/finds_production"

# Stripe (PRODUCTION KEYS - DO NOT USE TEST KEYS)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Cron
CRON_SECRET="generate_secure_random_string_min_32_chars"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="generate_secure_random_string"

# Optional: Error tracking
SENTRY_DSN="..."
```

### Generate Secure Secrets
```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

## Security Checklist

### Pre-Deployment
- [ ] All secrets in environment variables (not in code)
- [ ] No test API keys in production
- [ ] HTTPS enforced on production
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (using Next.js)
- [ ] CSRF protection (Next.js handles)

### Post-Deployment
- [ ] Verify webhook signature validation
- [ ] Verify authentication on all endpoints
- [ ] Verify authorization checks work
- [ ] Test with security scanner
- [ ] Review audit logs for anomalies
- [ ] Monitor for unusual payment patterns

## Performance Checklist

### Database
- [ ] Indexes on payment_status
- [ ] Indexes on payment_deadline
- [ ] Indexes on audit_log fields
- [ ] Connection pooling configured
- [ ] Query performance tested

### API
- [ ] Response times < 1s for charge-fee
- [ ] Response times < 500ms for status
- [ ] Webhook processing < 5s
- [ ] Cron job completes in reasonable time
- [ ] No N+1 query issues

### Stripe
- [ ] Using latest API version
- [ ] Idempotency keys for payments
- [ ] Webhook retry logic works
- [ ] Connection pooling if needed
- [ ] Rate limit handling

## Final Verification

Before marking deployment complete:

- [ ] Create test auction and complete full payment flow
- [ ] Verify payment shows in Stripe Dashboard
- [ ] Verify audit logs created correctly
- [ ] Verify webhook processed successfully
- [ ] Verify payment deadline calculated correctly
- [ ] Test 3DS flow end-to-end
- [ ] Test payment failure handling
- [ ] Test overdue payment detection
- [ ] Verify all alerts working
- [ ] Verify monitoring dashboards updated

## Contact Information

### Emergency Contacts
- **Platform Admin**: [email/phone]
- **Database Admin**: [email/phone]
- **Stripe Account Owner**: [email/phone]
- **On-Call Engineer**: [phone/pager]

### Resources
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Application Logs**: [Your logging service]
- **Database**: [Your database admin panel]
- **Monitoring**: [Your monitoring service]

## Sign-Off

Deployment completed by: _______________
Date: _______________
Time: _______________

Verified by: _______________
Date: _______________

Issues encountered: _______________________________________________

Resolution: _______________________________________________

Next review date: _______________
