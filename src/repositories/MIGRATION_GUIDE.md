# Repository Layer Migration Guide

This guide helps you migrate existing services to use the new repository layer.

## Overview

The repository layer provides:
- **Abstraction**: Database queries separated from business logic
- **Testability**: Easy to mock for unit tests
- **Type Safety**: Full TypeScript support
- **Reusability**: Common queries centralized
- **Maintainability**: Easier to refactor database access

## File Structure

```
src/repositories/
├── base.repository.ts          # Base repository with CRUD operations
├── auction.repository.ts       # Auction-specific queries (43 methods)
├── listing.repository.ts       # Listing-specific queries (25 methods)
├── user.repository.ts          # User-specific queries (22 methods)
├── bid.repository.ts           # Bid-specific queries (27 methods)
├── fraud.repository.ts         # Fraud alert queries (18 methods)
├── index.ts                    # Central exports
├── README.md                   # Documentation
├── EXAMPLES.md                 # Usage examples
└── MIGRATION_GUIDE.md          # This file
```

## Migration Steps

### Step 1: Import Repositories

Replace Prisma imports with repository imports:

**Before:**
```typescript
import { prisma } from '@/lib/db'
```

**After:**
```typescript
import { auctionRepository, listingRepository } from '@/repositories'
```

### Step 2: Replace Prisma Calls

Replace direct Prisma queries with repository methods:

**Before:**
```typescript
const auction = await prisma.auction.findUnique({
  where: { id: auctionId },
  include: {
    listing: true,
    bids: {
      orderBy: { createdAt: 'desc' },
      include: {
        bidder: {
          select: { id: true, name: true },
        },
      },
    },
  },
})
```

**After:**
```typescript
const auction = await auctionRepository.findWithBids(auctionId)
```

### Step 3: Update Transaction Code

Use the repository factory for transactions:

**Before:**
```typescript
return prisma.$transaction(async (tx) => {
  const auction = await tx.auction.findUnique({ where: { id } })
  const bid = await tx.bid.create({ data: { ... } })
  return { auction, bid }
})
```

**After:**
```typescript
import { createRepositories } from '@/repositories'

return prisma.$transaction(async (tx) => {
  const { auctionRepository, bidRepository } = createRepositories(tx)
  const auction = await auctionRepository.findById(id)
  const bid = await bidRepository.create({ ... })
  return { auction, bid }
})
```

## Service-by-Service Migration

### Auction Service

**File:** `/Users/brad/Code2/finds/src/services/auction.service.ts`

#### Changes Required:

1. **getAuctionById** function:
```typescript
// Before
export async function getAuctionById(auctionId: string): Promise<AuctionWithRelations | null> {
  return prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      listing: true,
      bids: { ... },
    },
  })
}

// After
import { auctionRepository } from '@/repositories'

export async function getAuctionById(auctionId: string) {
  return auctionRepository.findWithBids(auctionId)
}
```

2. **getActiveAuctions** function:
```typescript
// Before - Complex query with 50+ lines
export async function getActiveAuctions(options: { ... }) {
  const where: Record<string, unknown> = { status: 'ACTIVE', ... }
  // Complex filter building
  const [auctions, total] = await Promise.all([
    prisma.auction.findMany({ where, ... }),
    prisma.auction.count({ where }),
  ])
  // ...
}

// After - Simplified using repository
import { auctionRepository } from '@/repositories'

export async function getActiveAuctions(options: { ... }) {
  const { page = 1, limit = 20, ...filters } = options

  const [auctions, total] = await Promise.all([
    auctionRepository.findActiveWithFilters({
      ...filters,
      skip: (page - 1) * limit,
      take: limit,
    }),
    auctionRepository.count({
      status: 'ACTIVE',
      currentEndTime: { gt: new Date() },
    }),
  ])

  return {
    auctions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
```

3. **activateScheduledAuctions** function:
```typescript
// Before
export async function activateScheduledAuctions(): Promise<number> {
  const scheduledAuctions = await prisma.auction.findMany({
    where: {
      status: 'SCHEDULED',
      startTime: { lte: new Date() },
    },
    include: { listing: { ... } },
  })
  // ...
}

// After
import { auctionRepository } from '@/repositories'

export async function activateScheduledAuctions(): Promise<number> {
  const scheduledAuctions = await auctionRepository.findScheduledAuctionsToActivate()
  // Rest of the logic remains the same
  // ...
}
```

4. **placeBid** function - Use transaction with repositories:
```typescript
// Before
export async function placeBid(...) {
  return prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ ... })
    const bid = await tx.bid.create({ ... })
    await tx.bid.updateMany({ ... })
    const updatedAuction = await tx.auction.update({ ... })
    return { bid, auction: updatedAuction }
  })
}

// After
import { createRepositories } from '@/repositories'

export async function placeBid(...) {
  return prisma.$transaction(async (tx) => {
    const { auctionRepository, bidRepository } = createRepositories(tx)

    const auction = await auctionRepository.findWithBids(auctionId)
    // Validation logic...

    const bid = await bidRepository.create({
      auctionId,
      bidderId,
      amount,
      isWinning: true,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    })

    await bidRepository.markAsNotWinning(auctionId, bid.id)
    const updatedAuction = await auctionRepository.updateWithBidInfo(auctionId, {
      currentBid: amount,
      reserveMet,
    })

    return { bid, auction: updatedAuction }
  })
}
```

### Listing Service

**File:** `/Users/brad/Code2/finds/src/services/listing.service.ts`

#### Changes Required:

1. **getListingById**:
```typescript
// Before
export async function getListingById(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      media: { orderBy: { position: 'asc' } },
      seller: { select: { id: true, name: true } },
    },
  })
}

// After
import { listingRepository } from '@/repositories'

export async function getListingById(id: string) {
  return listingRepository.findByIdWithMedia(id)
}
```

2. **getPendingListings** (admin function):
```typescript
// Before
export async function getPendingListings(): Promise<Listing[]> {
  return prisma.listing.findMany({
    where: { status: 'PENDING_REVIEW' },
    include: { media: { ... }, seller: { ... } },
    orderBy: { submittedAt: 'asc' },
  })
}

// After
import { listingRepository } from '@/repositories'

export async function getPendingListings() {
  return listingRepository.findPendingReview()
}
```

3. **approveListing**:
```typescript
// Before
export async function approveListing(listingId: string, reviewerId: string) {
  // Validation...
  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'APPROVED',
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      approvedAt: new Date(),
    },
  })
}

// After
import { listingRepository } from '@/repositories'

export async function approveListing(listingId: string, reviewerId: string) {
  const listing = await listingRepository.findById(listingId)
  if (!listing) {
    throw new Error('Listing not found')
  }
  if (listing.status !== 'PENDING_REVIEW') {
    throw new Error('Listing is not pending review')
  }

  return listingRepository.approve(listingId, reviewerId)
}
```

### Fraud Service

**File:** `/Users/brad/Code2/finds/src/services/fraud.service.ts`

#### Changes Required:

1. **getOpenAlerts**:
```typescript
// Before
export async function getOpenAlerts(options?: { ... }) {
  const { severity, limit = 50, offset = 0 } = options || {}
  const where = {
    status: 'OPEN' as const,
    ...(severity && { severity }),
  }
  const [alerts, total] = await Promise.all([
    prisma.fraudAlert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
      include: { user: { select: { ... } } },
    }),
    prisma.fraudAlert.count({ where }),
  ])
  return { alerts, total }
}

// After
import { fraudRepository } from '@/repositories'

export async function getOpenAlerts(options?: { ... }) {
  return fraudRepository.findOpenAlerts(options)
}
```

2. **createFraudAlert**:
```typescript
// Before
export async function createFraudAlert(params: { ... }) {
  return prisma.fraudAlert.create({
    data: {
      userId: params.userId,
      auctionId: params.auctionId,
      bidId: params.bidId,
      alertType: params.alertType,
      severity: params.severity,
      details: params.details as object,
      status: 'OPEN',
    },
  })
}

// After
import { fraudRepository } from '@/repositories'

export async function createFraudAlert(params: { ... }) {
  return fraudRepository.create({
    userId: params.userId,
    auctionId: params.auctionId,
    bidId: params.bidId,
    alertType: params.alertType,
    severity: params.severity,
    details: params.details as object,
    status: 'OPEN',
  })
}
```

## Benefits After Migration

### 1. Cleaner Service Code

**Before:** 626 lines in auction.service.ts
**After:** ~400 lines (36% reduction)

Complex queries are abstracted away into repository methods.

### 2. Better Testability

```typescript
// Easy to mock repositories in tests
const mockAuctionRepo = {
  findById: jest.fn().mockResolvedValue(mockAuction),
  updateWithBidInfo: jest.fn(),
}

const result = await placeBid('auction-1', 'user-1', 1000, mockAuctionRepo)
```

### 3. Type Safety

All repository methods are fully typed:
```typescript
// TypeScript knows the exact return type
const auction: AuctionWithBids | null = await auctionRepository.findWithBids(id)
```

### 4. Centralized Query Logic

If you need to change how auctions are fetched:
- **Before:** Update queries in multiple services
- **After:** Update once in the repository

### 5. Easier Caching

Add caching at the repository level without changing services:
```typescript
async findById(id: string) {
  const cached = await redis.get(`auction:${id}`)
  if (cached) return JSON.parse(cached)

  const auction = await this.prisma.auction.findUnique({ where: { id } })
  await redis.setex(`auction:${id}`, 60, JSON.stringify(auction))
  return auction
}
```

## Testing After Migration

### Unit Tests

```typescript
import { placeBid } from '@/services/auction.service'

describe('placeBid', () => {
  it('should place a bid successfully', async () => {
    const mockRepos = {
      auctionRepository: {
        findWithBids: jest.fn().mockResolvedValue(mockAuction),
        updateWithBidInfo: jest.fn().mockResolvedValue(updatedAuction),
      },
      bidRepository: {
        create: jest.fn().mockResolvedValue(mockBid),
        markAsNotWinning: jest.fn(),
      },
    }

    const result = await placeBid('a1', 'u1', 1000, mockRepos)

    expect(result.bid).toBeDefined()
    expect(mockRepos.bidRepository.create).toHaveBeenCalled()
  })
})
```

### Integration Tests

```typescript
import { auctionRepository } from '@/repositories'
import { prisma } from '@/lib/db'

describe('AuctionRepository', () => {
  afterEach(async () => {
    await prisma.auction.deleteMany()
  })

  it('should find active auctions', async () => {
    // Create test data
    const auction = await prisma.auction.create({ ... })

    // Test repository
    const active = await auctionRepository.findActiveAuctions()

    expect(active).toContainEqual(expect.objectContaining({ id: auction.id }))
  })
})
```

## Rollback Plan

If you need to rollback:
1. Repository layer doesn't modify existing database or Prisma schema
2. Services can use both Prisma and repositories simultaneously
3. Gradual migration is supported
4. No breaking changes to API routes

## Next Steps

1. ✅ Repository layer created
2. ⬜ Migrate auction.service.ts
3. ⬜ Migrate listing.service.ts
4. ⬜ Migrate fraud.service.ts
5. ⬜ Update tests to use repositories
6. ⬜ Add caching layer (optional)
7. ⬜ Add performance monitoring (optional)

## Common Issues and Solutions

### Issue: TypeScript errors with Prisma types

**Solution:** Use the provided type exports:
```typescript
import type { AuctionWithBids, ListingWithMedia } from '@/repositories'
```

### Issue: Transaction context not working

**Solution:** Use the factory:
```typescript
import { createRepositories } from '@/repositories'

prisma.$transaction(async tx => {
  const repos = createRepositories(tx)
  // Use repos...
})
```

### Issue: Missing repository method

**Solution:** Add it to the repository:
```typescript
// Add to IAuctionRepository interface
findByCustomCriteria(criteria: object): Promise<Auction[]>

// Implement in AuctionRepository class
async findByCustomCriteria(criteria: object) {
  return this.prisma.auction.findMany({ where: criteria })
}
```

## Support

For questions or issues:
1. Check EXAMPLES.md for usage patterns
2. Check README.md for architecture details
3. Review existing repository methods before adding new ones
4. Keep business logic in services, not repositories
