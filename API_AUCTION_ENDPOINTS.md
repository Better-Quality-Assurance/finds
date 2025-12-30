# Auction Creation API Reference

## Admin Endpoints

### 1. Approve Listing (Auto-creates Auction)

**Endpoint:** `POST /api/admin/listings/:id/approve`

**Description:** Approves a listing and automatically creates an auction. If no custom timing is provided, the auction starts immediately and runs for 7 days.

**Authentication:** Required (Admin, Moderator, or Reviewer role)

**Path Parameters:**
- `id` (string): Listing ID to approve

**Request Body (Optional):**
```json
{
  "startTime": "2025-01-16T14:00:00Z",  // Optional: ISO 8601 date, defaults to now
  "durationDays": 10                    // Optional: 3-14 days, defaults to 7
}
```

**Success Response (200):**
```json
{
  "listing": {
    "id": "clxy123abc",
    "title": "1967 Ford Mustang Fastback",
    "status": "ACTIVE",
    "approvedAt": "2025-01-15T10:00:00Z",
    // ... other listing fields
  },
  "auction": {
    "id": "clxy456def",
    "listingId": "clxy123abc",
    "status": "ACTIVE",
    "startTime": "2025-01-15T10:00:00Z",
    "originalEndTime": "2025-01-01T10:00:00Z",
    "currentEndTime": "2025-01-01T10:00:00Z",
    "startingPrice": "5000.00",
    "reservePrice": "8000.00",
    "currency": "EUR",
    "antiSnipingEnabled": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 403 Forbidden (not admin/moderator/reviewer)
{
  "error": "Forbidden"
}

// 404 Not Found
{
  "error": "Listing not found"
}

// 400 Bad Request (invalid duration)
{
  "error": "Duration must be between 3 and 14 days"
}

// 400 Bad Request (listing not pending review)
{
  "error": "Listing is not pending review"
}

// 500 Internal Server Error (auction creation failed)
{
  "error": "Listing approved but auction creation failed: <reason>",
  "listing": { ... }
}
```

**Side Effects:**
- Listing status changed from `PENDING_REVIEW` to `APPROVED` then `ACTIVE`
- Auction created with pricing copied from listing
- Audit log entries created for both approval and auction creation
- If auction is `ACTIVE` (not scheduled):
  - Seller receives notification via Pusher
  - Public broadcast sent to all users
  - Event: `auction-starting` on channel `public`

---

### 2. Create Auction Manually

**Endpoint:** `POST /api/admin/auctions`

**Description:** Manually create an auction for an approved listing. Useful for scheduling auctions for specific times or re-creating auctions if needed.

**Authentication:** Required (Admin or Moderator role only)

**Request Body:**
```json
{
  "listingId": "clxy123abc",                // Required: Listing ID (must be APPROVED)
  "startTime": "2025-01-16T14:00:00Z",     // Optional: ISO 8601 date, defaults to now
  "durationDays": 10                        // Optional: 3-14 days, defaults to 7
}
```

**Success Response (201 Created):**
```json
{
  "auction": {
    "id": "clxy789ghi",
    "listingId": "clxy123abc",
    "status": "SCHEDULED",
    "startTime": "2025-01-16T14:00:00Z",
    "originalEndTime": "2025-01-05T14:00:00Z",
    "currentEndTime": "2025-01-05T14:00:00Z",
    "startingPrice": "12000.00",
    "reservePrice": "15000.00",
    "currency": "EUR",
    "antiSnipingEnabled": true,
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "listing": {
    "id": "clxy123abc",
    "title": "1969 Chevrolet Camaro SS",
    "seller": {
      "id": "user123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 403 Forbidden (not admin/moderator)
{
  "error": "Forbidden"
}

// 400 Bad Request (missing listingId)
{
  "error": "listingId is required"
}

// 400 Bad Request (invalid startTime)
{
  "error": "Invalid startTime format"
}

// 400 Bad Request (invalid duration)
{
  "error": "Duration must be between 3 and 14 days"
}

// 404 Not Found (listing doesn't exist)
{
  "error": "Listing not found"
}

// 400 Bad Request (listing not approved)
{
  "error": "Listing must be APPROVED before creating auction. Current status: PENDING_REVIEW"
}

// 409 Conflict (auction already exists)
{
  "error": "Auction already exists for this listing",
  "auctionId": "clxy456def",
  "auctionStatus": "ACTIVE"
}

// 500 Internal Server Error
{
  "error": "Failed to create auction"
}
```

**Side Effects:**
- Auction created with status `ACTIVE` or `SCHEDULED` depending on startTime
- Listing status changed to `ACTIVE`
- Audit log entry created with `manuallyCreated: true` flag
- If auction is `ACTIVE`:
  - Seller receives notification
  - Public broadcast sent

---

### 3. List Auctions (Admin View)

**Endpoint:** `GET /api/admin/auctions`

**Description:** List all auctions with admin metadata for management dashboard.

**Authentication:** Required (Admin or Moderator role)

**Query Parameters:**
- `status` (optional): Filter by auction status (SCHEDULED, ACTIVE, ENDED, SOLD, NO_SALE, CANCELLED)
- `search` (optional): Search by listing title, make, or model
- `page` (optional): Page number, defaults to 1
- `limit` (optional): Items per page, defaults to 20

**Success Response (200):**
```json
{
  "auctions": [
    {
      "id": "clxy789ghi",
      "status": "ACTIVE",
      "startTime": "2025-01-15T10:00:00Z",
      "currentEndTime": "2025-01-01T10:00:00Z",
      "startingPrice": "5000.00",
      "currentBid": "5500.00",
      "bidCount": 12,
      "reserveMet": false,
      "listing": {
        "id": "clxy123abc",
        "title": "1967 Ford Mustang Fastback",
        "make": "Ford",
        "model": "Mustang",
        "year": 1967,
        "seller": {
          "id": "user123",
          "name": "John Doe",
          "email": "john@example.com"
        }
      },
      "_count": {
        "bids": 12,
        "watchlist": 45
      }
    }
    // ... more auctions
  ],
  "stats": {
    "ACTIVE": 15,
    "SCHEDULED": 3,
    "ENDED": 42,
    "SOLD": 38,
    "NO_SALE": 4
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 102,
    "totalPages": 6
  }
}
```

---

## Notification Events

### Pusher Channel: `private-user-{userId}-notifications`

**Event:** `notification`

**Payload:**
```json
{
  "type": "LISTING_APPROVED",
  "title": "Listing Approved!",
  "message": "Your listing \"1967 Ford Mustang Fastback\" has been approved and the auction is now live. Ends in 7d 0h",
  "data": {
    "listingId": "clxy123abc",
    "auctionId": "clxy789ghi",
    "auctionEndTime": "2025-01-01T10:00:00Z"
  },
  "link": "/auctions/clxy789ghi",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Pusher Channel: `public`

**Event:** `auction-starting`

**Payload:**
```json
{
  "auctionId": "clxy789ghi",
  "listingTitle": "1967 Ford Mustang Fastback",
  "startingPrice": 5000,
  "currency": "EUR",
  "endTime": "2025-01-01T10:00:00Z",
  "imageUrl": "https://cdn.finds.com/listings/clxy123abc/photo1.jpg",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

---

## Audit Log Entries

All auction creation and approval actions are logged in the audit_log table with the following structure:

**Listing Approval:**
```json
{
  "action": "LISTING_APPROVED",
  "resourceType": "LISTING",
  "resourceId": "clxy123abc",
  "actorId": "admin_user_id",
  "severity": "MEDIUM",
  "status": "SUCCESS",
  "details": {
    "listingTitle": "1967 Ford Mustang Fastback",
    "sellerId": "user123",
    "auctionId": "clxy789ghi",
    "auctionCreated": true
  }
}
```

**Auction Creation:**
```json
{
  "action": "AUCTION_CREATED",
  "resourceType": "AUCTION",
  "resourceId": "clxy789ghi",
  "actorId": "admin_user_id",
  "severity": "MEDIUM",
  "status": "SUCCESS",
  "details": {
    "listingId": "clxy123abc",
    "listingTitle": "1967 Ford Mustang Fastback",
    "sellerId": "user123",
    "sellerEmail": "john@example.com",
    "startTime": "2025-01-15T10:00:00Z",
    "endTime": "2025-01-01T10:00:00Z",
    "startingPrice": "5000.00",
    "reservePrice": "8000.00",
    "status": "ACTIVE",
    "durationDays": 7,
    "manuallyCreated": false  // true if created via POST /api/admin/auctions
  }
}
```

---

## Business Rules

### Auction Duration Rules
From `/src/domain/auction/rules.ts`:

```typescript
AUCTION_RULES = {
  DEFAULT_DURATION_DAYS: 7,
  MIN_DURATION_DAYS: 3,
  MAX_DURATION_DAYS: 14
}
```

### Auction Status Logic

**SCHEDULED:**
- Auction is created with `startTime` in the future
- Listing status is still `ACTIVE`
- Auction will be activated by cron job when `startTime` is reached

**ACTIVE:**
- Auction is live and accepting bids
- `startTime <= now < currentEndTime`
- Listing status is `ACTIVE`

**Automatic Activation:**
- Cron job runs `activateScheduledAuctions()` every minute
- All `SCHEDULED` auctions where `startTime <= now` are activated
- Notifications sent when activation occurs

---

## Example Workflows

### Workflow 1: Immediate Auction (Default)

```bash
# 1. Admin approves listing (auction starts immediately)
POST /api/admin/listings/clxy123abc/approve
Content-Type: application/json

{}

# Response:
# - Listing status: APPROVED → ACTIVE
# - Auction status: ACTIVE
# - Seller notified immediately
# - Public broadcast sent immediately
```

### Workflow 2: Scheduled Auction

```bash
# 1. Admin schedules auction for tomorrow 2pm
POST /api/admin/auctions
Content-Type: application/json

{
  "listingId": "clxy123abc",
  "startTime": "2025-01-16T14:00:00Z",
  "durationDays": 7
}

# Response:
# - Auction status: SCHEDULED
# - Listing status: ACTIVE
# - No notifications sent yet

# 2. Cron job runs at 2025-01-16 14:00
# - Auction status changed to ACTIVE
# - Seller notification sent
# - Public broadcast sent
```

### Workflow 3: Custom Duration

```bash
# Admin wants a 10-day auction starting immediately
POST /api/admin/listings/clxy123abc/approve
Content-Type: application/json

{
  "durationDays": 10
}

# Auction runs for 10 days from now
```

---

## Testing with cURL

```bash
# Set your session cookie
SESSION="authjs.session-token=your_session_token_here"

# Approve listing with immediate auction
curl -X POST http://localhost:3000/api/admin/listings/LISTING_ID/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -d '{}'

# Approve listing with 10-day auction
curl -X POST http://localhost:3000/api/admin/listings/LISTING_ID/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -d '{"durationDays": 10}'

# Schedule auction for future
curl -X POST http://localhost:3000/api/admin/auctions \
  -H "Content-Type: application/json" \
  -H "Cookie: $SESSION" \
  -d '{
    "listingId": "LISTING_ID",
    "startTime": "2025-01-16T14:00:00Z",
    "durationDays": 7
  }'

# List all active auctions
curl -X GET "http://localhost:3000/api/admin/auctions?status=ACTIVE" \
  -H "Cookie: $SESSION"
```

---

## Error Handling Best Practices

All endpoints follow consistent error handling:

1. **Authentication errors (401/403):** Return immediately, no logging
2. **Validation errors (400):** Return with descriptive message
3. **Business logic errors (409):** Return with context (e.g., existing auction ID)
4. **Service errors (500):** Log detailed error, return generic message
5. **Notification failures:** Caught and logged, don't fail the main operation

This ensures the core auction creation workflow is reliable even if notification systems are down.
