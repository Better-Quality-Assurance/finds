# Repository Usage Examples

This document provides practical examples of using the repository layer in the Finds auction platform.

## Basic Usage

### Simple Query

```typescript
import { auctionRepository } from '@/repositories'

// Get an auction by ID
const auction = await auctionRepository.findById('auction-123')

// Get all active auctions
const activeAuctions = await auctionRepository.findActiveAuctions()
```

### With Filters

```typescript
import { auctionRepository } from '@/repositories'

// Get active auctions with filters
const filteredAuctions = await auctionRepository.findActiveWithFilters({
  category: 'CLASSIC_CAR',
  minPrice: 10000,
  maxPrice: 50000,
  country: 'RO',
  skip: 0,
  take: 20,
})
```

## Service Layer Integration

### Auction Service Example

```typescript
// src/services/auction.service.ts
import { auctionRepository, bidRepository, listingRepository } from '@/repositories'
import { validateBidAmount, shouldExtendAuction } from '@/domain/auction/rules'

export async function placeBid(
  auctionId: string,
  bidderId: string,
  amount: number,
  metadata?: { ipAddress?: string; userAgent?: string }
) {
  // Get auction with lock using transaction
  return prisma.$transaction(async (tx) => {
    // Create repositories with transaction context
    const { auctionRepository: txAuctionRepo, bidRepository: txBidRepo } =
      createRepositories(tx)

    // Get auction
    const auction = await txAuctionRepo.findWithBids(auctionId)
    if (!auction) {
      throw new Error('Auction not found')
    }

    // Validate auction is active
    if (auction.status !== 'ACTIVE') {
      throw new Error('Auction is not active')
    }

    // Validate bid amount
    const currentBid = auction.currentBid ? Number(auction.currentBid) : null
    const validation = validateBidAmount(amount, currentBid, Number(auction.listing.startingPrice))
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Create bid
    const bid = await txBidRepo.create({
      auctionId,
      bidderId,
      amount,
      isWinning: true,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    })

    // Update previous winning bids
    await txBidRepo.markAsNotWinning(auctionId, bid.id)

    // Update auction
    const updatedAuction = await txAuctionRepo.updateWithBidInfo(auctionId, {
      currentBid: amount,
      reserveMet: amount >= Number(auction.reservePrice || 0),
    })

    return { bid, auction: updatedAuction }
  })
}
```

### Listing Service Example

```typescript
// src/services/listing.service.ts
import { listingRepository, userRepository } from '@/repositories'

export async function submitListingForReview(listingId: string, sellerId: string) {
  // Check ownership
  const isOwner = await listingRepository.isOwnedBy(listingId, sellerId)
  if (!isOwner) {
    throw new Error('Listing not found or unauthorized')
  }

  // Get listing with media
  const listing = await listingRepository.findByIdWithMedia(listingId)
  if (!listing) {
    throw new Error('Listing not found')
  }

  // Validate status
  if (!['DRAFT', 'CHANGES_REQUESTED'].includes(listing.status)) {
    throw new Error('Listing cannot be submitted in current status')
  }

  // Validate photos
  const photos = listing.media.filter(m => m.type === 'PHOTO')
  if (photos.length < 5) {
    throw new Error('Minimum 5 photos required')
  }

  // Submit for review
  return listingRepository.submitForReview(listingId)
}
```

### User Service Example

```typescript
// src/services/user.service.ts
import { userRepository } from '@/repositories'

export async function banUserAccount(userId: string, adminId: string, reason: string) {
  // Check if user exists
  const user = await userRepository.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  // Check if already banned
  const isBanned = await userRepository.isBanned(userId)
  if (isBanned) {
    throw new Error('User is already banned')
  }

  // Ban the user
  const bannedUser = await userRepository.banUser(userId, reason)

  // Log the action
  await auditRepository.create({
    actorId: adminId,
    action: 'BAN_USER',
    resourceType: 'User',
    resourceId: userId,
    severity: 'HIGH',
    status: 'SUCCESS',
    details: { reason },
  })

  return bannedUser
}
```

## Advanced Patterns

### Combining Multiple Repositories

```typescript
import { auctionRepository, listingRepository, userRepository } from '@/repositories'

export async function getAuctionDetails(auctionId: string) {
  // Get auction with bids
  const auction = await auctionRepository.findWithBids(auctionId)
  if (!auction) {
    throw new Error('Auction not found')
  }

  // Get seller info
  const seller = await userRepository.findById(auction.listing.sellerId)

  // Get seller's other listings
  const sellerListings = await listingRepository.findBySellerId(
    auction.listing.sellerId,
    'ACTIVE'
  )

  return {
    auction,
    seller: {
      id: seller.id,
      name: seller.name,
      memberSince: seller.createdAt,
    },
    sellerOtherListings: sellerListings.slice(0, 4),
  }
}
```

### Using Transactions

```typescript
import { prisma } from '@/lib/db'
import { createRepositories } from '@/repositories'

export async function endAuctionAndPaySeller(auctionId: string) {
  return prisma.$transaction(async tx => {
    const { auctionRepository, userRepository } = createRepositories(tx)

    // Get auction
    const auction = await auctionRepository.findWithBids(auctionId)
    if (!auction) {
      throw new Error('Auction not found')
    }

    // Mark as sold
    const winningBid = auction.bids.find(b => b.isWinning)
    if (!winningBid) {
      return auctionRepository.markAsNoSale(auctionId)
    }

    // Update auction
    await auctionRepository.markAsSold(auctionId, {
      winnerId: winningBid.bidderId,
      winningBidId: winningBid.id,
      finalPrice: Number(winningBid.amount),
      buyerFeeAmount: Number(winningBid.amount) * 0.05,
      paymentDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    // Process payout (this would integrate with Stripe)
    // ...

    return auction
  })
}
```

### Pagination

```typescript
import { bidRepository } from '@/repositories'

export async function getUserBidHistory(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit

  const [bids, total] = await Promise.all([
    bidRepository.findByBidderId(userId, { skip, take: limit }),
    bidRepository.countByBidderId(userId),
  ])

  return {
    bids,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + bids.length < total,
    },
  }
}
```

### Fraud Detection Integration

```typescript
import { fraudRepository, bidRepository, userRepository } from '@/repositories'

export async function checkUserFraudStatus(userId: string) {
  // Get user's fraud history
  const recentAlerts = await fraudRepository.findRecentByUserId(userId, 10)
  const criticalCount = await fraudRepository.countCriticalAlertsByUserId(userId)

  // Get user's bidding history
  const recentBids = await bidRepository.findRecentByBidderId(userId, 24)

  // Determine if suspicious
  const isSuspicious = criticalCount > 0 || recentAlerts.length >= 5

  // If suspicious, disable bidding
  if (isSuspicious) {
    await userRepository.disableBidding(userId)
  }

  return {
    isSuspicious,
    recentAlerts,
    criticalCount,
    recentBidCount: recentBids.length,
  }
}
```

## API Route Integration

### Next.js API Route Example

```typescript
// app/api/auctions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auctionRepository } from '@/repositories'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auction = await auctionRepository.findWithBids(params.id)

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(auction)
  } catch (error) {
    console.error('Error fetching auction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch auction' },
      { status: 500 }
    )
  }
}
```

### POST Request with Validation

```typescript
// app/api/listings/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { listingRepository } from '@/repositories'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const isOwner = await listingRepository.isOwnedBy(params.id, session.user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Submit for review
    const listing = await listingRepository.submitForReview(params.id)

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error submitting listing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit listing' },
      { status: 400 }
    )
  }
}
```

## Testing Examples

### Unit Testing with Mocked Repository

```typescript
import { placeBid } from '@/services/auction.service'

describe('Auction Service', () => {
  it('should place a bid successfully', async () => {
    // Mock repository
    const mockAuctionRepo = {
      findWithBids: jest.fn().mockResolvedValue({
        id: 'auction-1',
        status: 'ACTIVE',
        currentBid: 1000,
        listing: {
          sellerId: 'seller-1',
          startingPrice: 500,
          reservePrice: 1500,
        },
        bids: [],
      }),
      updateWithBidInfo: jest.fn().mockResolvedValue({
        id: 'auction-1',
        currentBid: 1500,
      }),
    }

    const mockBidRepo = {
      create: jest.fn().mockResolvedValue({
        id: 'bid-1',
        amount: 1500,
        bidderId: 'user-1',
      }),
      markAsNotWinning: jest.fn(),
    }

    // Test
    const result = await placeBid('auction-1', 'user-1', 1500, mockAuctionRepo, mockBidRepo)

    expect(mockAuctionRepo.findWithBids).toHaveBeenCalledWith('auction-1')
    expect(mockBidRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        auctionId: 'auction-1',
        bidderId: 'user-1',
        amount: 1500,
      })
    )
    expect(result.bid.amount).toBe(1500)
  })
})
```

### Integration Testing

```typescript
import { prisma } from '@/lib/db'
import { createRepositories } from '@/repositories'

describe('Auction Repository Integration', () => {
  let auctionRepo: ReturnType<typeof createRepositories>['auctionRepository']

  beforeAll(() => {
    const repos = createRepositories(prisma)
    auctionRepo = repos.auctionRepository
  })

  it('should find active auctions', async () => {
    // Create test data
    const listing = await prisma.listing.create({
      data: {
        sellerId: 'test-seller',
        title: 'Test Car',
        // ... other fields
      },
    })

    const auction = await prisma.auction.create({
      data: {
        listingId: listing.id,
        status: 'ACTIVE',
        startTime: new Date(),
        // ... other fields
      },
    })

    // Test repository
    const activeAuctions = await auctionRepo.findActiveAuctions()

    expect(activeAuctions).toContainEqual(
      expect.objectContaining({ id: auction.id })
    )

    // Cleanup
    await prisma.auction.delete({ where: { id: auction.id } })
    await prisma.listing.delete({ where: { id: listing.id } })
  })
})
```

## Common Patterns

### Error Handling

```typescript
import { auctionRepository } from '@/repositories'

export async function safeGetAuction(auctionId: string) {
  try {
    const auction = await auctionRepository.findById(auctionId)
    return { success: true, data: auction }
  } catch (error) {
    console.error('Failed to get auction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
```

### Caching Layer (Future Enhancement)

```typescript
import { auctionRepository } from '@/repositories'
import { redis } from '@/lib/redis'

export async function getAuctionCached(auctionId: string) {
  // Try cache first
  const cached = await redis.get(`auction:${auctionId}`)
  if (cached) {
    return JSON.parse(cached)
  }

  // Fetch from database
  const auction = await auctionRepository.findById(auctionId)

  // Cache for 1 minute
  if (auction) {
    await redis.setex(`auction:${auctionId}`, 60, JSON.stringify(auction))
  }

  return auction
}
```
