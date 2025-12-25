# Database Documentation - Finds Auction Platform

## Table of Contents
- [Database Indexes](#database-indexes)
- [Query Optimization Tips](#query-optimization-tips)
- [Common N+1 Query Patterns to Avoid](#common-n1-query-patterns-to-avoid)
- [Analyzing Slow Queries](#analyzing-slow-queries)
- [Connection Pooling](#connection-pooling)
- [Migration Best Practices](#migration-best-practices)

---

## Database Indexes

Proper indexing is critical for query performance. This section documents all indexes in the schema and their purpose.

### Listing Model

**Single Column Indexes:**
- `status` - Fast filtering by listing status (DRAFT, ACTIVE, SOLD, etc.)
- `sellerId` - Quick lookup of all listings by a specific seller
- `category` - Filter listings by vehicle category (CLASSIC_CAR, MOTORCYCLE, etc.)

**Compound Indexes:**
- `[status, createdAt(sort: Desc)]` - **Purpose**: Optimizes paginated queries that filter by status and sort by newest first. Common use case: Admin dashboard showing recent active listings.

**Query Examples Optimized:**
```typescript
// Optimized by compound index
const activeListings = await prisma.listing.findMany({
  where: { status: 'ACTIVE' },
  orderBy: { createdAt: 'desc' },
  take: 20
});

// Optimized by compound index
const pendingReviews = await prisma.listing.findMany({
  where: { status: 'PENDING_REVIEW' },
  orderBy: { createdAt: 'desc' }
});
```

---

### Auction Model

**Single Column Indexes:**
- `status` - Filter auctions by status (SCHEDULED, ACTIVE, ENDED, etc.)
- `currentEndTime` - Critical for finding auctions ending soon (anti-sniping logic)

**Query Examples Optimized:**
```typescript
// Find auctions ending in next 2 minutes (anti-sniping)
const endingSoon = await prisma.auction.findMany({
  where: {
    status: 'ACTIVE',
    currentEndTime: {
      gte: new Date(),
      lte: new Date(Date.now() + 2 * 60 * 1000)
    }
  }
});
```

---

### Bid Model

**Single Column Indexes:**
- `auctionId` - Fast lookup of all bids for an auction
- `bidderId` - Quick access to user's bidding history
- `createdAt(sort: Desc)` - Chronological bid tracking

**Compound Indexes:**
- `[auctionId, isValid, createdAt(sort: Desc)]` - **Purpose**: Critical for auction bid history queries. Filters valid bids for an auction sorted by time. Excludes invalidated bids (fraud, retracted, etc.).

**Query Examples Optimized:**
```typescript
// Get valid bid history for auction (most recent first)
const validBids = await prisma.bid.findMany({
  where: {
    auctionId: 'auction_123',
    isValid: true
  },
  orderBy: { createdAt: 'desc' },
  take: 50
});

// Get highest valid bid (uses compound index)
const highestBid = await prisma.bid.findFirst({
  where: {
    auctionId: 'auction_123',
    isValid: true
  },
  orderBy: { amount: 'desc' }
});
```

---

### BidDeposit Model

**Single Column Indexes:**
- `userId` - Lookup all deposits for a user
- `auctionId` - Find deposit for specific auction
- `status` - Filter by deposit status (HELD, RELEASED, CAPTURED, etc.)

**Compound Indexes:**
- `[userId, status, createdAt]` - **Purpose**: User deposit history filtered by status and sorted chronologically. Common in user account pages showing payment history.

**Query Examples Optimized:**
```typescript
// Get user's held deposits (ready for bidding)
const heldDeposits = await prisma.bidDeposit.findMany({
  where: {
    userId: 'user_123',
    status: 'HELD'
  },
  orderBy: { createdAt: 'desc' }
});

// Find user's captured deposits (winning bids)
const capturedDeposits = await prisma.bidDeposit.findMany({
  where: {
    userId: 'user_123',
    status: 'CAPTURED'
  },
  orderBy: { createdAt: 'desc' }
});
```

---

### Watchlist Model

**Single Column Indexes:**
- `userId` - Get all watched auctions for a user
- `auctionId` - Find all users watching an auction
- `[auctionId, notifyOnBid]` - Notification targeting for bid events
- `[auctionId, notifyOnEnd]` - Notification targeting for auction end

**Compound Indexes:**
- `[userId, createdAt(sort: Desc)]` - **Purpose**: User's watchlist sorted by when they added items. Common in user account "My Watchlist" page.

**Unique Constraints:**
- `[userId, auctionId]` - Prevents duplicate watchlist entries

**Query Examples Optimized:**
```typescript
// Get user's watchlist (most recently added first)
const watchlist = await prisma.watchlist.findMany({
  where: { userId: 'user_123' },
  orderBy: { createdAt: 'desc' },
  include: { auction: true }
});

// Find users to notify when auction ends
const usersToNotify = await prisma.watchlist.findMany({
  where: {
    auctionId: 'auction_123',
    notifyOnEnd: true
  },
  include: { user: true }
});
```

---

### AuditLog Model

**Single Column Indexes:**
- `createdAt(sort: Desc)` - Chronological log access
- `actorId` - All actions by a specific user
- `action` - Filter by action type (USER_LOGIN, BID_PLACED, etc.)
- `[resourceType, resourceId]` - Audit trail for specific resources
- `severity` - Filter by severity level (LOW, MEDIUM, HIGH, CRITICAL)

**Compound Indexes:**
- `[action, createdAt(sort: Desc)]` - **Purpose**: Audit queries filtered by action type and sorted chronologically. Example: "Show all login attempts in the last 24 hours".

**Query Examples Optimized:**
```typescript
// Get recent login attempts
const loginAttempts = await prisma.auditLog.findMany({
  where: {
    action: 'USER_LOGIN',
    createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  },
  orderBy: { createdAt: 'desc' }
});

// Audit trail for specific listing
const listingAudit = await prisma.auditLog.findMany({
  where: {
    resourceType: 'LISTING',
    resourceId: 'listing_123'
  },
  orderBy: { createdAt: 'desc' }
});
```

---

### FraudAlert Model

**Single Column Indexes:**
- `status` - Filter alerts by status (OPEN, INVESTIGATING, RESOLVED)
- `severity` - Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)

**Query Examples:**
```typescript
// Get open critical fraud alerts
const criticalAlerts = await prisma.fraudAlert.findMany({
  where: {
    status: 'OPEN',
    severity: 'CRITICAL'
  },
  include: { user: true }
});
```

---

### User, Account, Session (Auth.js)

**Indexes:**
- `User.email` - Unique index for login/signup
- `Session.sessionToken` - Unique index for session lookup
- `[Account.provider, Account.providerAccountId]` - Unique for OAuth accounts

---

### ListingMedia

**Single Column Indexes:**
- `listingId` - Fast lookup of all media for a listing

**Query Pattern:**
```typescript
// Get all photos for a listing (optimized)
const photos = await prisma.listingMedia.findMany({
  where: { listingId: 'listing_123', type: 'PHOTO' },
  orderBy: { position: 'asc' }
});
```

---

## Query Optimization Tips

### 1. Use `select` to Fetch Only Required Fields

Reduces data transfer and memory usage.

**Bad:**
```typescript
const users = await prisma.user.findMany();
// Fetches all fields including passwordHash, bannedAt, etc.
```

**Good:**
```typescript
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    role: true
  }
});
```

---

### 2. Use `include` Wisely - Avoid Over-Fetching Relations

**Bad:**
```typescript
const listings = await prisma.listing.findMany({
  include: {
    seller: true,
    media: true,
    auction: {
      include: {
        bids: {
          include: { bidder: true }
        }
      }
    }
  }
});
// Fetches massive amounts of nested data
```

**Good:**
```typescript
const listings = await prisma.listing.findMany({
  select: {
    id: true,
    title: true,
    startingPrice: true,
    seller: {
      select: { id: true, name: true }
    },
    auction: {
      select: {
        id: true,
        status: true,
        currentBid: true
      }
    }
  }
});
```

---

### 3. Leverage Cursor-Based Pagination for Large Datasets

Better performance than offset-based pagination for large tables.

**Offset-Based (Slow for Large Offsets):**
```typescript
const page5 = await prisma.bid.findMany({
  skip: 100,  // Skips 100 rows - slow on large tables
  take: 20,
  orderBy: { createdAt: 'desc' }
});
```

**Cursor-Based (Fast):**
```typescript
const firstPage = await prisma.bid.findMany({
  take: 20,
  orderBy: { createdAt: 'desc' }
});

const nextPage = await prisma.bid.findMany({
  take: 20,
  cursor: { id: firstPage[firstPage.length - 1].id },
  skip: 1,  // Skip the cursor itself
  orderBy: { createdAt: 'desc' }
});
```

---

### 4. Use Aggregations Instead of Fetching Full Data

**Bad:**
```typescript
const allBids = await prisma.bid.findMany({
  where: { auctionId: 'auction_123' }
});
const bidCount = allBids.length;
const totalValue = allBids.reduce((sum, bid) => sum + bid.amount, 0);
```

**Good:**
```typescript
const stats = await prisma.bid.aggregate({
  where: { auctionId: 'auction_123' },
  _count: true,
  _sum: { amount: true },
  _max: { amount: true }
});
```

---

### 5. Batch Queries with `findMany` + `where: { id: { in: [...] } }`

Instead of multiple `findUnique` calls.

**Bad:**
```typescript
const users = await Promise.all(
  userIds.map(id => prisma.user.findUnique({ where: { id } }))
);
// Generates N separate queries
```

**Good:**
```typescript
const users = await prisma.user.findMany({
  where: { id: { in: userIds } }
});
// Single query
```

---

### 6. Use Transactions for Related Writes

Ensures data consistency and can improve performance.

```typescript
await prisma.$transaction(async (tx) => {
  const auction = await tx.auction.update({
    where: { id: auctionId },
    data: { status: 'ENDED', winnerId: highestBid.bidderId }
  });

  await tx.bid.update({
    where: { id: highestBid.id },
    data: { isWinning: true }
  });

  await tx.bidDeposit.update({
    where: { id: winnerDeposit.id },
    data: { status: 'CAPTURED' }
  });
});
```

---

### 7. Avoid `orderBy` on Non-Indexed Columns

Always ensure columns used in `orderBy` have indexes.

**Slow (No Index on `title`):**
```typescript
const listings = await prisma.listing.findMany({
  orderBy: { title: 'asc' }  // Full table scan + sort
});
```

**Fast (Index on `createdAt`):**
```typescript
const listings = await prisma.listing.findMany({
  orderBy: { createdAt: 'desc' }  // Uses index
});
```

---

### 8. Use Database-Level Defaults

Let the database handle default values instead of application code.

**Good (Schema):**
```prisma
model User {
  biddingEnabled Boolean @default(false)
  role           Role    @default(USER)
}
```

---

### 9. Bulk Operations for Large Updates/Deletes

Use `updateMany` / `deleteMany` instead of loops.

**Bad:**
```typescript
for (const bidId of oldBidIds) {
  await prisma.bid.update({
    where: { id: bidId },
    data: { isValid: false }
  });
}
```

**Good:**
```typescript
await prisma.bid.updateMany({
  where: { id: { in: oldBidIds } },
  data: { isValid: false }
});
```

---

## Common N+1 Query Patterns to Avoid

### Problem: The N+1 Query Pattern

Fetching related data in loops causes performance disasters.

### Example 1: Listings with Seller Data

**Bad (N+1 Queries):**
```typescript
const listings = await prisma.listing.findMany({ take: 50 });

for (const listing of listings) {
  const seller = await prisma.user.findUnique({
    where: { id: listing.sellerId }
  });
  console.log(`${listing.title} by ${seller.name}`);
}
// 1 query for listings + 50 queries for sellers = 51 queries
```

**Good (Single Query with Join):**
```typescript
const listings = await prisma.listing.findMany({
  take: 50,
  include: { seller: { select: { id: true, name: true } } }
});

for (const listing of listings) {
  console.log(`${listing.title} by ${listing.seller.name}`);
}
// 1 query total
```

---

### Example 2: Auctions with Bid Counts

**Bad (N+1 Queries):**
```typescript
const auctions = await prisma.auction.findMany({ take: 20 });

for (const auction of auctions) {
  const bidCount = await prisma.bid.count({
    where: { auctionId: auction.id }
  });
  console.log(`Auction ${auction.id}: ${bidCount} bids`);
}
// 1 + 20 = 21 queries
```

**Good (Aggregate with Include):**
```typescript
const auctions = await prisma.auction.findMany({
  take: 20,
  include: {
    _count: { select: { bids: true } }
  }
});

for (const auction of auctions) {
  console.log(`Auction ${auction.id}: ${auction._count.bids} bids`);
}
// 1 query
```

---

### Example 3: Watchlist with Auction Details

**Bad (N+1):**
```typescript
const watchlist = await prisma.watchlist.findMany({
  where: { userId: 'user_123' }
});

for (const item of watchlist) {
  const auction = await prisma.auction.findUnique({
    where: { id: item.auctionId },
    include: { listing: true }
  });
  console.log(auction.listing.title);
}
```

**Good:**
```typescript
const watchlist = await prisma.watchlist.findMany({
  where: { userId: 'user_123' },
  include: {
    auction: {
      include: {
        listing: {
          select: { id: true, title: true, startingPrice: true }
        }
      }
    }
  }
});

for (const item of watchlist) {
  console.log(item.auction.listing.title);
}
```

---

### Example 4: User with Latest Bid Per Auction

**Bad (N+1):**
```typescript
const auctions = await prisma.auction.findMany({ where: { status: 'ACTIVE' } });

for (const auction of auctions) {
  const userBid = await prisma.bid.findFirst({
    where: { auctionId: auction.id, bidderId: 'user_123' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(userBid?.amount);
}
```

**Good (Single Query with GroupBy or Nested Queries):**
```typescript
const auctions = await prisma.auction.findMany({
  where: { status: 'ACTIVE' },
  include: {
    bids: {
      where: { bidderId: 'user_123' },
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  }
});

for (const auction of auctions) {
  console.log(auction.bids[0]?.amount);
}
```

---

## Analyzing Slow Queries

### 1. Enable Prisma Query Logging

Add to your Prisma Client initialization:

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' }
  ]
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {  // Log queries > 1 second
    console.warn(`Slow query (${e.duration}ms): ${e.query}`);
    console.warn(`Params: ${e.params}`);
  }
});

export default prisma;
```

---

### 2. Use PostgreSQL EXPLAIN ANALYZE

For complex queries, use raw SQL with EXPLAIN:

```typescript
const result = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM listings
  WHERE status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 20;
`;
console.log(result);
```

Look for:
- **Seq Scan** (full table scan) - Add indexes
- **High cost values** - Optimize query structure
- **Nested loops** - Consider joins or compound indexes

---

### 3. Monitor with Prisma Pulse (Production)

Prisma Pulse provides real-time query performance monitoring.

```bash
npm install @prisma/pulse
```

---

### 4. Check Missing Indexes

Run this query to find unused indexes:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;
```

---

### 5. Identify Slow Queries in PostgreSQL

Enable slow query logging in PostgreSQL:

```sql
ALTER DATABASE finds_db SET log_min_duration_statement = 1000;  -- Log queries > 1s
```

Check logs:
```bash
tail -f /var/log/postgresql/postgresql-15-main.log | grep "duration"
```

---

## Connection Pooling

### Configure Connection Limits

PostgreSQL has connection limits. Use connection pooling to avoid exhaustion.

**DATABASE_URL Configuration:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/finds_db?schema=public&connection_limit=10&pool_timeout=20"
```

**Recommended Settings:**
- `connection_limit=10` - Max connections per Prisma Client instance
- `pool_timeout=20` - Seconds to wait for available connection

**For Serverless Environments:**
Use PgBouncer or Prisma Accelerate for connection pooling.

```env
# PgBouncer connection string
DATABASE_URL="postgresql://user:pass@pgbouncer-host:6543/finds_db"
```

---

## Migration Best Practices

### 1. Always Review Migration Files

After running `prisma migrate dev`, check the SQL:

```bash
cat prisma/migrations/20231225_add_compound_indexes/migration.sql
```

Ensure indexes are created as expected.

---

### 2. Use Meaningful Migration Names

```bash
npx prisma migrate dev --name add_listing_status_created_index
```

Not:
```bash
npx prisma migrate dev --name update_schema
```

---

### 3. Test Migrations in Development First

Never run migrations directly in production without testing.

```bash
# Development
npx prisma migrate dev --name migration_name

# Production (after testing)
npx prisma migrate deploy
```

---

### 4. Backup Database Before Major Migrations

```bash
pg_dump finds_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

### 5. Use Transactions for Data Migrations

When migrating data, wrap in a transaction:

```sql
BEGIN;

UPDATE listings SET status = 'EXPIRED'
WHERE status = 'ACTIVE' AND created_at < NOW() - INTERVAL '90 days';

COMMIT;
```

---

### 6. Monitor Index Creation on Large Tables

Creating indexes on large tables can lock them. Use `CONCURRENTLY`:

```sql
CREATE INDEX CONCURRENTLY idx_listings_status_created
ON listings(status, created_at DESC);
```

**Note:** Prisma doesn't support `CONCURRENTLY` out of the box. Add manually to migration files for production.

---

## Summary: Index Strategy Checklist

- [ ] Index all foreign keys (sellerId, userId, auctionId, etc.) ✓
- [ ] Index columns frequently used in WHERE clauses ✓
- [ ] Index columns used in ORDER BY ✓
- [ ] Create compound indexes for common query patterns ✓
- [ ] Avoid over-indexing (indexes slow down writes)
- [ ] Monitor query performance with logging
- [ ] Use EXPLAIN ANALYZE for optimization
- [ ] Avoid N+1 queries with eager loading
- [ ] Use connection pooling in production
- [ ] Test migrations in development first

---

**Generated:** 2025-12-25
**Last Updated:** 2025-12-25
**Prisma Version:** 5.22.0
