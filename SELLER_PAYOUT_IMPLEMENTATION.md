# Seller Payout Foundation - Implementation Summary

This document summarizes the seller payout foundation implementation for the Finds auction platform.

## Overview

The seller payout system enables sellers to receive payments from successful auctions via Stripe Connect. When a buyer pays for a won auction, the system automatically initiates a payout to the seller's connected Stripe account.

## What Was Implemented

### 1. Database Schema Updates

**File**: `/prisma/schema.prisma`

#### User Model - Stripe Connect Fields
- `stripeConnectAccountId` - Stripe Connect account ID
- `stripeConnectStatus` - Account status ('pending', 'active', 'restricted')
- `payoutEnabled` - Boolean flag indicating if payouts are enabled
- `stripeConnectOnboardedAt` - Timestamp when onboarding completed

#### Auction Model - Payout Tracking
- `sellerPayoutStatus` - Payout status ('pending', 'processing', 'completed', 'failed')
- `sellerPayoutId` - Stripe transfer ID
- `sellerPayoutAmount` - Amount paid to seller (Decimal)
- `sellerPaidAt` - Timestamp when seller was paid

**Migration**: `/prisma/migrations/20251225182947_add_seller_payout_fields/migration.sql`
- Includes indexes for performance optimization

### 2. API Endpoints

#### Stripe Connect Onboarding (`/api/seller/stripe-connect`)
**File**: `/src/app/api/seller/stripe-connect/route.ts`

- **POST**: Creates Stripe Connect account and returns onboarding URL
  - Checks user role (must be SELLER or higher)
  - Creates Express Connect account
  - Generates onboarding link
  - Stores account ID in user record
  - Handles existing accounts gracefully

- **GET**: Returns current Connect account status
  - Fetches latest status from Stripe
  - Updates local database if status changed
  - Returns detailed account information

#### Connect Callback Handler (`/api/seller/stripe-connect/callback`)
**File**: `/src/app/api/seller/stripe-connect/callback/route.ts`

- Handles return from Stripe onboarding
- Verifies account setup completion
- Updates user status (pending/active/restricted)
- Redirects to seller dashboard with appropriate message
- Logs audit trail

#### Connect Refresh Handler (`/api/seller/stripe-connect/refresh`)
**File**: `/src/app/api/seller/stripe-connect/refresh/route.ts`

- Generates new onboarding link when previous expires
- Handles users who exit onboarding flow
- Redirects back to Stripe for completion

#### Express Dashboard Link (`/api/seller/stripe-connect/dashboard`)
**File**: `/src/app/api/seller/stripe-connect/dashboard/route.ts`

- Generates login link to Stripe Express Dashboard
- Allows sellers to manage payout settings
- Only accessible to sellers with active accounts

### 3. Seller Dashboard Page

**File**: `/src/app/[locale]/account/seller/page.tsx`

Features:
- **Connect Account Status Card**
  - Shows current onboarding status
  - "Set up payouts" button for new sellers
  - "Complete setup" button if requirements outstanding
  - Link to Stripe Express Dashboard for active accounts

- **Revenue Overview Cards**
  - Total revenue from all sales
  - Total payouts completed
  - Pending payouts awaiting processing

- **Payout History Table**
  - Lists all sold auctions with payout status
  - Shows hammer price, payout amount, and dates
  - Status badges (pending, processing, completed, failed)
  - Stripe transfer ID reference

### 4. React Components

#### SellerPayoutButton
**File**: `/src/components/seller/SellerPayoutButton.tsx`

- Initiates Stripe Connect onboarding flow
- Shows loading state during setup
- Handles both initial setup and completion
- Toast notifications for success/error

#### StripeExpressDashboardButton
**File**: `/src/components/seller/StripeExpressDashboardButton.tsx`

- Opens Stripe Express Dashboard in new tab
- Generates secure login link
- Only shown to sellers with active accounts

### 5. Payment Service Functions

**File**: `/src/services/payment.service.ts`

#### `createSellerPayout(auctionId: string): Promise<PayoutResult>`

Main payout creation function:
1. Verifies auction is sold and paid
2. Checks seller has active Connect account
3. Calculates seller proceeds (currently 100% of hammer price)
4. Creates Stripe transfer to seller's account
5. Updates auction payout status
6. Logs audit trail
7. Handles errors gracefully

Platform fee calculation is ready but set to 0% - adjust `platformFeeRate` as needed.

#### `getSellerPayoutStatus(auctionId: string)`

Returns current payout status for an auction.

#### `retrySellerPayout(auctionId: string)`

Retries failed payouts - useful for handling temporary issues.

### 6. Stripe Webhook Handlers

**File**: `/src/app/api/payments/webhook/route.ts`

Enhanced existing webhook with Connect event handlers:

#### `account.updated`
- Syncs Connect account status changes
- Updates user's `stripeConnectStatus` and `payoutEnabled`
- Sets `stripeConnectOnboardedAt` when account becomes active
- Logs audit events

#### `transfer.created`
- Confirms payout transfer was created
- Updates auction status to 'completed'
- Records `sellerPaidAt` timestamp
- Logs success audit event

#### `transfer.failed`
- Marks payout as failed
- Logs critical audit event with failure reason
- TODO: Send notifications to seller/admin

#### `transfer.reversed`
- Handles reversed transfers (rare but critical)
- Marks payout as failed
- Logs critical audit event
- TODO: Create fraud alert

#### Auto-trigger on Buyer Payment
When `payment_intent.succeeded` event is received for a buyer fee payment:
- Automatically triggers `createSellerPayout()` in background
- Non-blocking to avoid delaying webhook response
- In production, should use job queue (e.g., BullMQ)

### 7. Internationalization

**Files**:
- `/messages/en.json` - English translations
- `/messages/ro.json` - Romanian translations

Added complete translation set for:
- Seller dashboard UI
- Payout status messages
- Error messages
- Button labels
- Account status descriptions

Translation keys under `seller.dashboard` and `seller.payoutButton` namespaces.

## Payment Flow

### Seller Onboarding
1. Seller navigates to `/[locale]/account/seller`
2. Clicks "Set Up Payouts" button
3. System creates Stripe Connect Express account
4. Seller redirected to Stripe onboarding
5. Seller completes identity verification, bank details, etc.
6. Stripe redirects back to callback endpoint
7. System updates user status to 'active'
8. Seller can now receive payouts

### Automatic Payout on Sale
1. Auction ends with winning bid
2. Buyer completes payment (buyer fee + hammer price)
3. Webhook receives `payment_intent.succeeded` event
4. System triggers `createSellerPayout()` automatically
5. Stripe creates transfer to seller's Connect account
6. Webhook receives `transfer.created` event
7. System marks payout as 'completed'
8. Seller sees payout in dashboard and Stripe account

### Manual Payout (if needed)
```typescript
import { createSellerPayout } from '@/services/payment.service'

const result = await createSellerPayout(auctionId)
if (result.success) {
  console.log('Payout created:', result.payoutId, result.amount)
} else {
  console.error('Payout failed:', result.error)
}
```

## Configuration

### Environment Variables Required

```env
# Existing Stripe config
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL for redirect callbacks
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Stripe Dashboard Setup

1. **Enable Connect**:
   - Go to Stripe Dashboard > Connect > Settings
   - Enable Express accounts

2. **Configure Webhooks**:
   Add these events to webhook endpoint `/api/payments/webhook`:
   - `account.updated`
   - `transfer.created`
   - `transfer.failed`
   - `transfer.reversed`
   - (existing: `payment_intent.succeeded`, etc.)

3. **Branding** (Optional):
   - Set up Connect branding in Stripe Dashboard
   - Customize onboarding experience

## Platform Fee Configuration

Currently set to 0% - sellers receive full hammer price.

To add platform commission, edit `/src/services/payment.service.ts`:

```typescript
// Line ~783 in createSellerPayout function
const platformFeeRate = 0.05 // 5% commission
const platformFee = hammerPrice * platformFeeRate
const sellerPayout = hammerPrice - platformFee
```

**Important**: Platform fees are deducted from the hammer price, not added as a separate charge to the buyer. Buyer fees are separate (configured per-auction).

## Security Considerations

- All endpoints require authentication via NextAuth session
- Role-based access control (must be SELLER or higher)
- Webhook signature verification for all Stripe events
- Audit logging for all payout operations
- Connect account verification before payout creation
- Payment status checks prevent duplicate payouts

## Future Enhancements

### Immediate Next Steps
1. Implement job queue for payout processing (BullMQ recommended)
2. Add seller/admin notifications for payout events
3. Create fraud alerts for failed/reversed transfers
4. Add retry mechanism for failed payouts
5. Build admin dashboard for payout oversight

### Advanced Features
- Multi-currency support (currently EUR only)
- Configurable platform fee per seller tier
- Payout scheduling (instant, daily, weekly)
- Bulk payout processing
- Payout reconciliation reports
- Tax documentation (1099-K, etc.)
- Dispute handling workflow

## Files Modified/Created

### Database
- `/prisma/schema.prisma` - Updated User and Auction models
- `/prisma/migrations/20251225182947_add_seller_payout_fields/migration.sql` - Migration file

### API Routes
- `/src/app/api/seller/stripe-connect/route.ts` - New
- `/src/app/api/seller/stripe-connect/callback/route.ts` - New
- `/src/app/api/seller/stripe-connect/refresh/route.ts` - New
- `/src/app/api/seller/stripe-connect/dashboard/route.ts` - New
- `/src/app/api/payments/webhook/route.ts` - Enhanced

### Pages
- `/src/app/[locale]/account/seller/page.tsx` - New

### Components
- `/src/components/seller/SellerPayoutButton.tsx` - New
- `/src/components/seller/StripeExpressDashboardButton.tsx` - New

### Services
- `/src/services/payment.service.ts` - Enhanced with payout functions

### Translations
- `/messages/en.json` - Added seller namespace
- `/messages/ro.json` - Added seller namespace

### Existing Stripe Functions (Already Present)
- `/src/lib/stripe.ts` - Contains `createConnectAccount()`, `createAccountLink()`, `createTransfer()`

## Testing Checklist

- [ ] Run database migration
- [ ] Test seller onboarding flow
- [ ] Test Stripe Connect callback handling
- [ ] Test payout creation after buyer payment
- [ ] Test webhook handlers (use Stripe CLI)
- [ ] Test dashboard displays correct payout status
- [ ] Test error handling (failed payouts, missing Connect account)
- [ ] Test multi-language support
- [ ] Test role-based access control
- [ ] Test audit log creation

## Running the Migration

```bash
# Make sure DATABASE_URL is set in .env
npx prisma migrate deploy

# Or if in development
npx prisma migrate dev
```

## Notes

- The migration creates indexes for optimal query performance
- All monetary amounts use Decimal(12,2) for precision
- Audit logs track all payout operations with severity levels
- Payout status is separate from payment status (buyer vs seller)
- Connect accounts are country-specific (currently default to Romania)
- Express accounts require less information than Standard accounts

## Support

For issues or questions:
1. Check Stripe Connect documentation
2. Review audit logs for detailed error information
3. Test webhooks using Stripe CLI: `stripe listen --forward-to localhost:3000/api/payments/webhook`
4. Monitor Stripe Dashboard > Connect > Accounts for account status

---

**Implementation Date**: December 25, 2024
**Stripe API Version**: 2025-02-24.acacia
**Framework**: Next.js 14+ with App Router
