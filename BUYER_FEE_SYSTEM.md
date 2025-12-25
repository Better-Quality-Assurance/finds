# Buyer Fee Charging System

This document describes the implementation of the buyer fee charging system for the Finds auction platform.

## Overview

The buyer fee charging system automatically charges a 5% buyer's premium on top of the final hammer price when an auction is won. This fee is calculated during auction close and charged to the winning bidder within a specified payment deadline.

## Architecture

### Database Schema

**New Payment Status Enum** (`/prisma/schema.prisma`):
```prisma
enum PaymentStatus {
  UNPAID    // Fee has not been paid yet
  PENDING   // Payment is being processed (e.g., 3DS authentication)
  PAID      // Fee has been successfully paid
  FAILED    // Payment failed
  REFUNDED  // Payment was refunded
}
```

**New Auction Fields**:
- `paymentStatus`: Current status of the buyer fee payment
- `paymentIntentId`: Stripe PaymentIntent ID for tracking
- `paidAt`: Timestamp when payment was completed
- `paymentDeadline`: Deadline for payment (5 business days from auction end)

### Payment Flow

```
1. Auction Ends
   └─> Status set to SOLD
   └─> buyerFeeAmount calculated (5% of finalPrice)
   └─> paymentDeadline calculated (5 business days, excluding weekends)
   └─> paymentStatus set to UNPAID
   └─> Winner notified to complete payment

2. Winner Initiates Payment
   └─> POST /api/payments/charge-fee
   └─> System verifies:
       - User is the auction winner
       - Auction status is SOLD
       - Fee hasn't been paid already
       - Payment deadline hasn't passed
   └─> Creates Stripe PaymentIntent for (finalPrice + buyerFee)
   └─> Uses winner's default payment method

3a. Payment Succeeds Immediately
    └─> paymentStatus set to PAID
    └─> paidAt timestamp recorded
    └─> Audit log created
    └─> Seller payout triggered

3b. Payment Requires 3DS Authentication
    └─> paymentStatus set to PENDING
    └─> Client receives clientSecret
    └─> User completes 3DS flow
    └─> POST /api/payments/confirm-fee
    └─> Payment confirmed
    └─> paymentStatus set to PAID

3c. Payment Fails
    └─> paymentStatus set to FAILED
    └─> Audit log created
    └─> User notified
    └─> Deposit may be captured as forfeit
```

## API Endpoints

### 1. Charge Buyer Fee
**Endpoint**: `POST /api/payments/charge-fee`

**Request**:
```json
{
  "auctionId": "clx123abc"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "paymentIntentId": "pi_123abc",
  "message": "Payment processed successfully"
}
```

**3DS Required Response** (200):
```json
{
  "success": false,
  "requiresAction": true,
  "clientSecret": "pi_123abc_secret_xyz",
  "paymentIntentId": "pi_123abc",
  "error": "Payment requires additional authentication"
}
```

**Error Response** (400):
```json
{
  "error": "Auction is not sold"
}
```

### 2. Confirm Buyer Fee Payment
**Endpoint**: `POST /api/payments/confirm-fee`

**Request**:
```json
{
  "paymentIntentId": "pi_123abc"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "paymentIntentId": "pi_123abc",
  "auctionId": "clx123abc",
  "message": "Payment confirmed successfully"
}
```

### 3. Get Payment Status
**Endpoint**: `POST /api/payments/status`

**Request**:
```json
{
  "auctionId": "clx123abc"
}
```

**Response** (200):
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

## Service Functions

### Payment Service (`/src/services/payment.service.ts`)

#### `chargeBuyerFee(auctionId: string, userId: string): Promise<PaymentResult>`
Charges the buyer fee using the winner's default payment method.

**Validations**:
- User is the auction winner
- Auction status is SOLD
- Fee hasn't been paid already
- Payment deadline hasn't passed
- User has a valid payment method

**Returns**:
```typescript
{
  success: boolean
  paymentIntent?: Stripe.PaymentIntent
  error?: string
  requiresAction?: boolean
  clientSecret?: string
}
```

#### `confirmBuyerFeePayment(paymentIntentId: string): Promise<PaymentResult>`
Confirms a buyer fee payment after 3DS authentication.

#### `getAuctionPaymentStatus(auctionId: string)`
Retrieves the current payment status and breakdown for an auction.

#### `setPaymentDeadline(auctionId: string): Promise<Auction>`
Sets the payment deadline for an auction (5 business days).

#### `checkOverduePayments(): Promise<string[]>`
Finds and marks overdue payments as FAILED. Returns array of auction IDs.

## Webhook Handling

The Stripe webhook handler (`/src/app/api/payments/webhook/route.ts`) processes the following events:

### `payment_intent.succeeded`
- For `type: 'buyer_fee'` metadata:
  - Updates auction `paymentStatus` to PAID
  - Sets `paidAt` timestamp
  - Creates audit log entry
  - Triggers seller payout (TODO)

### `payment_intent.payment_failed`
- For `type: 'buyer_fee'` metadata:
  - Updates auction `paymentStatus` to FAILED
  - Creates critical audit log entry
  - Notifies user and seller (TODO)

## Audit Logging

All payment events are logged to the `audit_log` table with the following actions:

- `payment.buyer_fee.initiated` - Fee charging initiated
- `payment.buyer_fee.succeeded` - Payment completed successfully
- `payment.buyer_fee.failed` - Payment failed
- `payment.buyer_fee.confirmed` - Payment confirmed after 3DS
- `payment.buyer_fee.webhook_confirmed` - Webhook confirmed payment
- `payment.buyer_fee.webhook_failed` - Webhook reported failure

**Audit Helper** (`/src/lib/audit.ts`):
```typescript
const logger = new PaymentAuditLogger({
  actorId: userId,
  actorEmail: userEmail,
  actorIp: getClientIp(request),
  actorUserAgent: getUserAgent(request)
})

await logger.logBuyerFeeSucceeded(auctionId, paymentIntentId, amount, currency)
```

## Cron Jobs

### Check Overdue Payments
**Endpoint**: `GET /api/cron/check-overdue-payments`

**Schedule**: Daily at 00:00 UTC

**Authorization**:
- Vercel Cron: Checks `x-vercel-cron` header
- Manual: Requires `Authorization: Bearer CRON_SECRET` header

**Actions**:
1. Finds auctions with `paymentStatus` UNPAID/PENDING and past `paymentDeadline`
2. Marks them as FAILED
3. TODO: Captures winner's deposit as forfeit
4. TODO: Notifies seller of default
5. TODO: Offers second-chance to next highest bidder

## Stripe Best Practices

### Security
- All payment methods are stored in Stripe (PCI compliant)
- Payment intents use `off_session: true` for saved cards
- 3DS authentication supported via `requires_action` status
- Webhook signature verification required

### Error Handling
- Specific error messages for common card errors:
  - `authentication_required`
  - `card_declined`
  - `insufficient_funds`
- Retry logic for network failures
- Idempotency keys for payment operations

### Metadata
Each PaymentIntent includes:
```typescript
{
  type: 'buyer_fee',
  auctionId: string,
  userId: string,
  finalPrice: string,
  buyerFee: string,
  listingId: string
}
```

## Integration Points

### Auction Service
When `endAuction()` is called:
1. Calculates `buyerFeeAmount` using `calculateBuyerFee()`
2. Sets `paymentDeadline` using `calculatePaymentDeadline()`
3. Sets `paymentStatus` to UNPAID for sold auctions

### Notification System (TODO)
- Winner notification after auction ends with payment instructions
- Reminder notifications at 24h and 1h before deadline
- Default notification if payment not received
- Seller notification when payment is received

### Seller Payout (TODO)
When buyer payment succeeds:
1. Verify seller has Stripe Connect account
2. Calculate seller payout (finalPrice - platform fees)
3. Create transfer to seller's connected account
4. Update auction with payout status

## Testing

### Test Scenarios

1. **Successful Immediate Payment**
   - Winner has valid card
   - Payment processes without 3DS
   - Status updated to PAID

2. **3DS Authentication Required**
   - Card requires 3DS
   - Client receives clientSecret
   - User completes authentication
   - Payment confirmed via confirm-fee endpoint

3. **Payment Failure**
   - Card declined
   - Status updated to FAILED
   - Appropriate error message returned

4. **Overdue Payment**
   - Payment deadline passes
   - Cron job marks as FAILED
   - Deposit captured (when implemented)

5. **Unauthorized Access**
   - Non-winner tries to pay
   - Returns 403 error

6. **Already Paid**
   - Second payment attempt
   - Returns error indicating already paid

### Stripe Test Cards
```
Successful: 4242 4242 4242 4242
Requires 3DS: 4000 0027 6000 3184
Declined: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

## Environment Variables

Add to `.env.local`:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cron
CRON_SECRET=your_secure_random_string

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Migration

Run the migration to add payment status fields:
```bash
npx prisma migrate deploy
```

Or for development:
```bash
npx prisma migrate dev
```

## Future Enhancements

1. **Partial Payments**: Allow buyers to split payment across multiple cards
2. **Payment Plans**: Offer installment options for high-value items
3. **Alternative Payment Methods**: Support bank transfers, cryptocurrency
4. **Automated Payout**: Implement seller payout after payment clearing period
5. **Dispute Handling**: System for handling payment disputes and chargebacks
6. **Currency Conversion**: Support for multi-currency auctions
7. **Tax Collection**: Automated tax calculation and remittance

## Support

For issues or questions:
- Check audit logs for payment event history
- Review Stripe Dashboard for payment intent details
- Contact technical support with auction ID and payment intent ID
