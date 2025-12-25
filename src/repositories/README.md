# Repository Layer

This directory contains the repository layer that abstracts database access from business logic in services.

## Architecture

The repository pattern provides several benefits:

1. **Separation of Concerns**: Database queries are separated from business logic
2. **Testability**: Services can be tested with mocked repositories
3. **Maintainability**: Database queries are centralized and easier to modify
4. **Type Safety**: All queries are fully typed with TypeScript
5. **Reusability**: Common queries can be shared across services

## Structure

```
repositories/
├── base.repository.ts       # Generic base repository with CRUD operations
├── auction.repository.ts    # Auction-specific queries
├── listing.repository.ts    # Listing-specific queries
├── user.repository.ts       # User-specific queries
├── bid.repository.ts        # Bid-specific queries
├── fraud.repository.ts      # Fraud alert queries
└── index.ts                 # Central export point
```

## Base Repository

The `BaseRepository` provides common CRUD operations that all repositories inherit:

- `findById(id)` - Find single record by ID
- `findMany(where)` - Find multiple records
- `create(data)` - Create new record
- `update(id, data)` - Update existing record
- `delete(id)` - Delete record
- `count(where)` - Count records
- `exists(id)` - Check if record exists
- `findFirst(where)` - Find first matching record
- `updateMany(where, data)` - Update multiple records

## Usage

### Import singleton instances (recommended for services)

```typescript
import { auctionRepository, listingRepository } from '@/repositories'

// Use directly in services
const auction = await auctionRepository.findById(id)
const activeAuctions = await auctionRepository.findActiveAuctions()
```

### Import repository classes (useful for testing)

```typescript
import { AuctionRepository } from '@/repositories'
import { prisma } from '@/lib/db'

// Create custom instance
const auctionRepo = new AuctionRepository(prisma)
```

### Use factory for transactions or testing

```typescript
import { createRepositories } from '@/repositories'

// For transactions
const result = await prisma.$transaction(async (tx) => {
  const { auctionRepository, bidRepository } = createRepositories(tx)

  const auction = await auctionRepository.findById(auctionId)
  const bid = await bidRepository.create({ ... })

  return { auction, bid }
})

// For testing with mocked Prisma
const mockPrisma = createMockPrisma()
const { auctionRepository } = createRepositories(mockPrisma)
```

## Repository-Specific Methods

### AuctionRepository

```typescript
findActiveAuctions() // All active auctions
findScheduledAuctionsToActivate() // Scheduled auctions ready to start
findEndedAuctionsToClose() // Active auctions that have ended
findWithBids(id) // Auction with all bids
findByListingId(listingId) // Find by listing
findEndingSoon(hours, limit) // Auctions ending soon
updateStatus(id, status) // Update auction status
markAsSold(id, data) // Mark auction as sold with winner
```

### ListingRepository

```typescript
findByIdWithMedia(id) // Listing with all media
findBySellerId(sellerId, status?) // Seller's listings
findPendingReview() // Listings pending review
findApproved() // All approved listings
approve(id, reviewerId) // Approve listing
reject(id, reviewerId, reason) // Reject listing
requestChanges(id, reviewerId, changes) // Request changes
search(query, limit) // Search listings
```

### UserRepository

```typescript
findByEmail(email) // Find by email
findBannedUsers() // All banned users
findByRole(role) // Users by role
banUser(id, reason) // Ban a user
unbanUser(id, reason) // Unban a user
enableBidding(id) // Enable bidding
canBid(userId) // Check if user can bid
updateStripeConnect(id, data) // Update Stripe Connect info
```

### BidRepository

```typescript
findByAuctionId(auctionId, limit?) // All bids for auction
findByBidderId(bidderId, options?) // User's bids
findWinningBid(auctionId) // Current winning bid
findRecentByBidderId(bidderId, hours) // Recent bids
markAsWinning(bidId) // Mark bid as winning
markAsNotWinning(auctionId, excludeId?) // Mark others as not winning
invalidateBid(id, reason) // Invalidate a bid
```

### FraudRepository

```typescript
findOpenAlerts(options?) // Open fraud alerts
findByUserId(userId) // User's fraud alerts
findByAuctionId(auctionId) // Auction fraud alerts
updateStatus(id, status, reviewerId, notes?) // Update alert status
countOpenAlerts() // Count open alerts
countCriticalAlerts() // Count critical alerts
getStats() // Get fraud statistics
resolve(id, reviewerId, notes?) // Resolve alert
```

## Best Practices

### 1. Use repositories in services, not controllers

```typescript
// ✅ Good - Service uses repository
export async function placeBid(auctionId: string, bidderId: string, amount: number) {
  const auction = await auctionRepository.findById(auctionId)
  // Business logic here
}

// ❌ Bad - Controller uses Prisma directly
export async function POST(req: Request) {
  const auction = await prisma.auction.findUnique({ ... })
}
```

### 2. Keep business logic in services

```typescript
// ✅ Good - Repository only handles data access
class AuctionRepository {
  async findActiveAuctions() {
    return this.prisma.auction.findMany({ where: { status: 'ACTIVE' } })
  }
}

// ❌ Bad - Repository contains business logic
class AuctionRepository {
  async placeBid(auctionId: string, amount: number) {
    const auction = await this.findById(auctionId)
    if (auction.status !== 'ACTIVE') throw new Error('Auction not active')
    // More business logic...
  }
}
```

### 3. Use transactions when needed

```typescript
// ✅ Good - Use transaction for atomic operations
const result = await prisma.$transaction(async (tx) => {
  const { auctionRepository, bidRepository } = createRepositories(tx)

  const bid = await bidRepository.create(bidData)
  const auction = await auctionRepository.updateWithBidInfo(auctionId, { ... })

  return { bid, auction }
})
```

### 4. Return typed results

```typescript
// ✅ Good - Explicit return type
async findWithBids(id: string): Promise<AuctionWithBids | null> {
  return this.prisma.auction.findUnique({ ... })
}

// ❌ Bad - No return type
async findWithBids(id: string) {
  return this.prisma.auction.findUnique({ ... })
}
```

### 5. Handle errors appropriately

```typescript
// ✅ Good - Wrap errors with context
async findById(id: string): Promise<Auction | null> {
  try {
    return await this.getDelegate().findUnique({ where: { id } })
  } catch (error) {
    throw new Error(`Failed to find auction by id: ${error}`)
  }
}
```

## Testing

Repositories make testing easier by allowing you to mock database access:

```typescript
import { AuctionRepository } from '@/repositories'

describe('Auction Service', () => {
  it('should place a bid', async () => {
    // Mock repository
    const mockRepo = {
      findById: jest.fn().mockResolvedValue(mockAuction),
      updateWithBidInfo: jest.fn().mockResolvedValue(updatedAuction),
    }

    // Test service with mocked repository
    const result = await placeBid('auction-id', 'user-id', 1000, mockRepo)

    expect(mockRepo.findById).toHaveBeenCalledWith('auction-id')
    expect(result).toBeDefined()
  })
})
```

## Migration Guide

To migrate existing services to use repositories:

1. Replace direct Prisma calls with repository methods
2. Use repository types instead of Prisma types
3. Move complex queries to repository methods
4. Update tests to mock repositories instead of Prisma

### Before

```typescript
export async function getAuction(id: string) {
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: { listing: true, bids: true },
  })
  return auction
}
```

### After

```typescript
import { auctionRepository } from '@/repositories'

export async function getAuction(id: string) {
  const auction = await auctionRepository.findWithBids(id)
  return auction
}
```

## Future Enhancements

Potential improvements to the repository layer:

- Add caching layer (Redis) at repository level
- Implement query builders for complex dynamic queries
- Add soft delete support
- Implement audit logging at repository level
- Add pagination helpers
- Add full-text search integration
- Implement read replicas support
