# Buyer Fee Payment Flow - Visual Diagram

## Overview Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUCTION LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────┘

1. AUCTION CREATION
   ├─> Listing approved
   ├─> Auction created with startTime and endTime
   ├─> Status: SCHEDULED → ACTIVE
   └─> Bidders place bids

2. AUCTION ENDS
   ├─> Time: currentEndTime reached
   ├─> Service: auction.service.ts → endAuction()
   ├─> Determine winner (highest bid, reserve met)
   ├─> Calculate buyerFeeAmount = finalPrice × 5%
   ├─> Calculate paymentDeadline = endTime + 5 business days
   ├─> Status: ACTIVE → SOLD
   ├─> paymentStatus: UNPAID
   └─> Trigger: Winner notification email (TODO)

3. PAYMENT INITIATION
   ├─> Winner logs in to account
   ├─> Views "Purchases" tab
   ├─> Sees auction with "Payment Required" status
   ├─> Clicks "Pay Now" button
   └─> Frontend: POST /api/payments/charge-fee

4. PAYMENT PROCESSING
   ├─> API validates:
   │   ├─> User is authenticated
   │   ├─> User is the auction winner
   │   ├─> Auction status is SOLD
   │   ├─> Payment not already completed
   │   └─> Within payment deadline
   ├─> Retrieve winner's default payment method
   ├─> Create Stripe PaymentIntent
   │   ├─> Amount: finalPrice + buyerFeeAmount
   │   ├─> Currency: auction.currency
   │   ├─> Customer: winner's stripeCustomerId
   │   ├─> PaymentMethod: default card
   │   └─> Metadata: type=buyer_fee, auctionId, userId
   └─> Attempt payment

5. PAYMENT OUTCOME
   ├─> A) IMMEDIATE SUCCESS
   │   ├─> PaymentIntent.status = "succeeded"
   │   ├─> Update auction:
   │   │   ├─> paymentStatus = PAID
   │   │   ├─> paymentIntentId = pi_xxx
   │   │   └─> paidAt = now()
   │   ├─> Create audit log entry
   │   ├─> Return success to client
   │   └─> Trigger: Seller payout (TODO)
   │
   ├─> B) REQUIRES 3DS AUTHENTICATION
   │   ├─> PaymentIntent.status = "requires_action"
   │   ├─> Update auction:
   │   │   ├─> paymentStatus = PENDING
   │   │   └─> paymentIntentId = pi_xxx
   │   ├─> Return clientSecret to frontend
   │   ├─> Frontend: stripe.confirmCardPayment()
   │   ├─> User completes 3DS challenge
   │   ├─> Frontend: POST /api/payments/confirm-fee
   │   ├─> API checks PaymentIntent status
   │   ├─> If succeeded:
   │   │   ├─> paymentStatus = PAID
   │   │   ├─> paidAt = now()
   │   │   └─> Trigger seller payout (TODO)
   │   └─> Return confirmation to client
   │
   └─> C) PAYMENT FAILED
       ├─> PaymentIntent.status = "requires_payment_method"
       ├─> Update auction:
       │   └─> paymentStatus = FAILED
       ├─> Create critical audit log
       ├─> Return error to client
       └─> Display error message with retry option

6. WEBHOOK PROCESSING (Parallel)
   ├─> Stripe sends webhook to /api/payments/webhook
   ├─> Verify webhook signature
   ├─> Process event based on type:
   │
   ├─> payment_intent.succeeded
   │   ├─> Check metadata.type = "buyer_fee"
   │   ├─> Update auction:
   │   │   ├─> paymentStatus = PAID
   │   │   ├─> paymentIntentId = pi_xxx
   │   │   └─> paidAt = now()
   │   ├─> Create audit log
   │   └─> Queue seller payout (TODO)
   │
   └─> payment_intent.payment_failed
       ├─> Check metadata.type = "buyer_fee"
       ├─> Update auction:
       │   └─> paymentStatus = FAILED
       ├─> Create critical audit log
       └─> Trigger: Notification to user and seller (TODO)

7. OVERDUE PAYMENT MONITORING
   ├─> Daily cron: GET /api/cron/check-overdue-payments
   ├─> Find auctions where:
   │   ├─> status = SOLD
   │   ├─> paymentStatus IN (UNPAID, PENDING)
   │   └─> paymentDeadline < now()
   ├─> For each overdue auction:
   │   ├─> Update paymentStatus = FAILED
   │   ├─> Capture winner's deposit (TODO)
   │   ├─> Notify seller of default (TODO)
   │   └─> Offer second-chance to next bidder (TODO)
   └─> Return list of overdue auction IDs

8. SELLER PAYOUT (TODO - Future Implementation)
   ├─> Triggered when paymentStatus = PAID
   ├─> Verify seller has Stripe Connect account
   ├─> Calculate payout:
   │   ├─> Amount = finalPrice - platform_fees
   │   └─> Exclude buyer fee (kept by platform)
   ├─> Create Stripe Transfer
   └─> Update auction with payout status
```

## Payment Status State Machine

```
┌──────────┐
│  UNPAID  │ ◄── Initial state when auction ends with SOLD status
└────┬─────┘
     │
     │ User initiates payment
     ▼
┌──────────┐
│ PENDING  │ ◄── 3DS authentication required
└────┬─────┘
     │
     │ 3DS completed successfully
     ▼
┌──────────┐
│   PAID   │ ◄── Payment succeeded (terminal state)
└──────────┘

     OR

┌──────────┐
│  UNPAID  │
└────┬─────┘
     │
     │ Immediate payment failure OR deadline passed
     ▼
┌──────────┐
│  FAILED  │ ◄── Payment failed (terminal state, may retry)
└──────────┘

     OR

┌──────────┐
│   PAID   │
└────┬─────┘
     │
     │ Refund processed (rare case)
     ▼
┌──────────┐
│ REFUNDED │ ◄── Payment was refunded (terminal state)
└──────────┘
```

## API Interaction Diagram

```
┌──────────┐                          ┌─────────────┐
│ Frontend │                          │  API Server │
└────┬─────┘                          └──────┬──────┘
     │                                       │
     │ POST /api/payments/charge-fee         │
     │ { auctionId: "xxx" }                  │
     ├──────────────────────────────────────>│
     │                                       │
     │                                       │ Validate request
     │                                       │ Get auction details
     │                                       │ Get user payment method
     │                                       │
     │                                       │
     │                                       ▼
     │                              ┌────────────────┐
     │                              │ Stripe API     │
     │                              └────────┬───────┘
     │                                       │
     │                                       │ Create PaymentIntent
     │                                       │ Confirm payment
     │                                       │
     │                                       ▼
     │
     │ SCENARIO A: Immediate Success         │
     │ <─────────────────────────────────────┤
     │ { success: true, paymentIntentId }    │
     │                                       │
     │ Display: "Payment successful!"        │
     │                                       │

     │ SCENARIO B: 3DS Required              │
     │ <─────────────────────────────────────┤
     │ { requiresAction: true,               │
     │   clientSecret: "xxx" }               │
     │                                       │
     │ stripe.confirmCardPayment()           │
     │   └─> User completes 3DS              │
     │                                       │
     │ POST /api/payments/confirm-fee        │
     │ { paymentIntentId: "xxx" }            │
     ├──────────────────────────────────────>│
     │                                       │
     │                                       │ Check PaymentIntent status
     │                                       │ Update auction
     │                                       │
     │ <─────────────────────────────────────┤
     │ { success: true }                     │
     │                                       │
     │ Display: "Payment confirmed!"         │
     │                                       │

     │ SCENARIO C: Payment Failed            │
     │ <─────────────────────────────────────┤
     │ { error: "Card declined" }            │
     │                                       │
     │ Display error + retry button          │
     │                                       │


┌──────────┐                          ┌─────────────┐
│  Stripe  │                          │  Webhook    │
└────┬─────┘                          └──────┬──────┘
     │                                       │
     │ payment_intent.succeeded              │
     ├──────────────────────────────────────>│
     │                                       │
     │                                       │ Verify signature
     │                                       │ Check metadata.type
     │                                       │ Update auction
     │                                       │ Create audit log
     │                                       │
     │ <─────────────────────────────────────┤
     │ 200 OK                                │
     │                                       │
```

## Database State Changes

```
AUCTION TABLE STATE TRANSITIONS

Initial (After Auction Creation):
─────────────────────────────────
id: clx123abc
status: ACTIVE
currentBid: 10000.00
winnerId: NULL
finalPrice: NULL
buyerFeeAmount: NULL
paymentStatus: UNPAID
paymentIntentId: NULL
paidAt: NULL
paymentDeadline: NULL

After Auction Ends (endAuction()):
──────────────────────────────────
id: clx123abc
status: SOLD                          ← Changed
currentBid: 10000.00
winnerId: user_789                    ← Set
finalPrice: 10000.00                  ← Set
buyerFeeAmount: 500.00                ← Calculated (5%)
paymentStatus: UNPAID                 ← Set
paymentIntentId: NULL
paidAt: NULL
paymentDeadline: 2025-12-30T23:59:59Z ← Calculated (+5 business days)

After Payment Initiated (chargeBuyerFee()):
───────────────────────────────────────────
id: clx123abc
status: SOLD
currentBid: 10000.00
winnerId: user_789
finalPrice: 10000.00
buyerFeeAmount: 500.00
paymentStatus: PENDING                ← Changed (if 3DS required)
paymentIntentId: pi_123abc            ← Set
paidAt: NULL
paymentDeadline: 2025-12-30T23:59:59Z

After Payment Succeeded:
────────────────────────
id: clx123abc
status: SOLD
currentBid: 10000.00
winnerId: user_789
finalPrice: 10000.00
buyerFeeAmount: 500.00
paymentStatus: PAID                   ← Changed
paymentIntentId: pi_123abc
paidAt: 2025-12-25T10:30:00Z         ← Set
paymentDeadline: 2025-12-30T23:59:59Z
```

## Stripe PaymentIntent Metadata

```json
{
  "id": "pi_123abc",
  "amount": 1050000,
  "currency": "eur",
  "status": "succeeded",
  "customer": "cus_xyz789",
  "payment_method": "pm_card_visa",
  "metadata": {
    "type": "buyer_fee",
    "auctionId": "clx123abc",
    "userId": "user_789",
    "finalPrice": "10000.00",
    "buyerFee": "500.00",
    "listingId": "listing_456"
  }
}
```

## Audit Log Timeline

```
For auctionId: clx123abc

2025-12-25 09:00:00 | auction.ended
├─> status: SOLD
├─> finalPrice: 10000.00
├─> winnerId: user_789
└─> severity: HIGH

2025-12-25 10:15:00 | payment.buyer_fee.initiated
├─> actor: user_789
├─> details: { timestamp: ... }
└─> severity: MEDIUM

2025-12-25 10:15:05 | payment.buyer_fee.succeeded
├─> actor: user_789
├─> details: { paymentIntentId: pi_123abc, amount: 1050000 }
└─> severity: HIGH

2025-12-25 10:15:10 | payment.buyer_fee.webhook_confirmed
├─> actor: user_789
├─> details: { paymentIntentId: pi_123abc }
└─> severity: HIGH

[Future] 2025-12-25 10:20:00 | seller.payout.initiated
├─> details: { amount: 9500.00, transferId: tr_xyz }
└─> severity: HIGH
```

## Error Handling Flow

```
┌─────────────────────┐
│  Payment Attempt    │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Validation   │
    └──────┬───────┘
           │
           ├─> Not winner? → 403 Forbidden
           ├─> Not SOLD? → 400 "Auction is not sold"
           ├─> Already paid? → 400 "Already paid"
           ├─> Past deadline? → 400 "Deadline passed"
           └─> OK? → Continue

           ▼
    ┌──────────────┐
    │ Stripe API   │
    └──────┬───────┘
           │
           ├─> Card declined → paymentStatus = FAILED
           │                → Error: "Card declined"
           │                → Audit log: severity=HIGH
           │
           ├─> Insufficient funds → paymentStatus = FAILED
           │                      → Error: "Insufficient funds"
           │                      → Audit log: severity=HIGH
           │
           ├─> 3DS required → paymentStatus = PENDING
           │                → Return clientSecret
           │                → User completes 3DS
           │                → Re-check via confirm-fee
           │
           └─> Success → paymentStatus = PAID
                       → paidAt = now()
                       → Trigger payout
```

## Security Checkpoints

```
Request Flow with Security:

1. User Request
   └─> Next-Auth session validation
       └─> Valid? → Continue
       └─> Invalid? → 401 Unauthorized

2. Authorization Check
   └─> User is winner? → Continue
   └─> Not winner? → 403 Forbidden

3. Business Logic Validation
   ├─> Auction SOLD? → Continue
   ├─> Not paid? → Continue
   ├─> Within deadline? → Continue
   └─> Any fail? → 400 Bad Request

4. Stripe API Call
   ├─> Use off_session: true
   ├─> Require card authentication if needed
   └─> Store PaymentIntent ID

5. Webhook Validation
   ├─> Verify signature
   ├─> Check metadata.type
   ├─> Update database idempotently
   └─> Invalid? → 400 Bad Request

6. Audit Logging
   ├─> Log all attempts (success/failure)
   ├─> Include IP address
   ├─> Include user agent
   └─> Never expose sensitive data
```

## Timeline Example (Real Auction)

```
Day 0: Monday, Dec 15
  09:00 - Auction goes live

Day 7: Monday, Dec 22
  09:00 - Auction ends
  09:01 - endAuction() called
        - Winner: user_123
        - Final price: €15,000
        - Buyer fee: €750
        - Total due: €15,750
        - Payment deadline: Monday, Dec 29 23:59:59
  09:05 - Winner receives email notification

Day 7: Monday, Dec 22
  14:30 - Winner logs in
  14:31 - Clicks "Pay Now"
  14:32 - POST /api/payments/charge-fee
  14:33 - Stripe 3DS challenge appears
  14:34 - Winner completes 3DS on phone
  14:35 - POST /api/payments/confirm-fee
  14:36 - Payment confirmed
  14:37 - paymentStatus = PAID
  14:38 - Stripe webhook confirms
  14:40 - Seller receives payout notification

Day 8+: Tuesday, Dec 23 onwards
  00:00 - Daily cron checks for overdue payments
        - None found (payment completed)

Alternative Timeline (Overdue):
Day 12: Saturday, Dec 30
  00:00 - Cron job runs
  00:01 - Finds auction past deadline, UNPAID
  00:02 - Updates paymentStatus = FAILED
  00:03 - Captures winner's deposit
  00:04 - Notifies seller of default
  00:05 - Creates fraud alert for winner
```

This visual diagram provides a comprehensive view of the entire buyer fee charging system flow.
