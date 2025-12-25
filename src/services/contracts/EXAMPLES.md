# Service Contract Examples

This document provides practical examples of using the service contracts in the Finds auction platform.

## Table of Contents

1. [API Route Handlers](#api-route-handlers)
2. [Service Composition](#service-composition)
3. [Testing Examples](#testing-examples)
4. [Dependency Injection](#dependency-injection)

## API Route Handlers

### Example 1: Place Bid Endpoint

This example shows how to use multiple service interfaces in an API route:

```typescript
// /src/app/api/bids/route.ts
import { NextRequest, NextResponse } from 'next/server'
import type {
  IAuctionService,
  IBidDepositService,
  IFraudService,
  INotificationService,
  IAuditService,
} from '@/services/contracts'

// Import implementations
import * as AuctionService from '@/services/auction.service'
import * as PaymentService from '@/services/payment.service'
import * as FraudService from '@/services/fraud.service'
import * as NotificationService from '@/services/notification.service'
import * as AuditService from '@/services/audit.service'

export async function POST(request: NextRequest) {
  try {
    const { auctionId, amount } = await request.json()
    const userId = 'user-from-session' // Get from auth session

    // Type services with interfaces
    const auctionService: IAuctionService = AuctionService
    const depositService: IBidDepositService = PaymentService
    const fraudService: IFraudService = FraudService
    const notificationService: INotificationService = NotificationService
    const auditService: IAuditService = AuditService

    // Step 1: Run fraud checks
    const fraudCheck = await fraudService.runBidFraudChecks({
      userId,
      auctionId,
      bidAmount: amount,
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })

    if (!fraudCheck.passed) {
      await auditService.logAuditEvent({
        actorId: userId,
        action: 'BID_REJECTED_FRAUD',
        resourceType: 'auction',
        resourceId: auctionId,
        severity: 'HIGH',
        status: 'FAILURE',
        details: { alerts: fraudCheck.alerts, amount },
      })

      return NextResponse.json(
        { error: 'Bid blocked by fraud detection', alerts: fraudCheck.alerts },
        { status: 403 }
      )
    }

    // Step 2: Check/create deposit
    const depositResult = await depositService.createBidDeposit({
      userId,
      auctionId,
      bidAmount: amount,
    })

    if (!depositResult.success) {
      return NextResponse.json(
        { error: depositResult.error, requiresAction: depositResult.requiresAction },
        { status: 400 }
      )
    }

    // Step 3: Place bid
    const bidResult = await auctionService.placeBid(auctionId, userId, amount, {
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    })

    // Step 4: Send notifications (non-blocking)
    notificationService.notifyWatchersNewBid(
      auctionId,
      amount,
      bidResult.auction.currency,
      'Anonymous Bidder'
    ).catch(err => console.error('Notification failed:', err))

    // Step 5: Audit log
    await auditService.logAuditEvent({
      actorId: userId,
      action: 'BID_PLACED',
      resourceType: 'auction',
      resourceId: auctionId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        amount,
        bidId: bidResult.bid.id,
        extended: bidResult.extended,
      },
    })

    return NextResponse.json({
      success: true,
      bid: bidResult.bid,
      auction: bidResult.auction,
      extended: bidResult.extended,
    })

  } catch (error) {
    console.error('Bid placement error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Example 2: Approve Listing Endpoint

```typescript
// /src/app/api/admin/listings/[id]/approve/route.ts
import type {
  IListingService,
  IAuctionService,
  INotificationService,
  IAuditService,
} from '@/services/contracts'

import * as ListingService from '@/services/listing.service'
import * as AuctionService from '@/services/auction.service'
import * as NotificationService from '@/services/notification.service'
import * as AuditService from '@/services/audit.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = 'admin-from-session' // Get from auth
  const { startTime, durationDays } = await request.json()

  const listingService: IListingService = ListingService
  const auctionService: IAuctionService = AuctionService
  const notificationService: INotificationService = NotificationService
  const auditService: IAuditService = AuditService

  try {
    // Approve listing
    const listing = await listingService.approveListing(params.id, adminId)

    // Create auction
    const auction = await auctionService.createAuction(
      params.id,
      new Date(startTime),
      durationDays
    )

    // Notify seller
    await notificationService.notifyListingApproved(
      listing.sellerId,
      listing.id,
      listing.title,
      auction.id,
      auction.currentEndTime
    )

    // Broadcast to public if starting immediately
    if (auction.status === 'ACTIVE') {
      await notificationService.broadcastAuctionLive(
        auction.id,
        listing.title,
        Number(auction.startingPrice),
        auction.currency,
        auction.currentEndTime
      )
    }

    // Audit log
    await auditService.logAuditEvent({
      actorId: adminId,
      action: 'LISTING_APPROVED',
      resourceType: 'listing',
      resourceId: listing.id,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: { auctionId: auction.id },
    })

    return NextResponse.json({ listing, auction })

  } catch (error) {
    await auditService.logAuditEvent({
      actorId: adminId,
      action: 'LISTING_APPROVE_FAILED',
      resourceType: 'listing',
      resourceId: params.id,
      severity: 'HIGH',
      status: 'FAILURE',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    throw error
  }
}
```

## Service Composition

### Example 3: Bid Processing Service

Create a higher-level service that composes multiple services:

```typescript
// /src/services/bid-processing.service.ts
import type {
  IAuctionService,
  IBidDepositService,
  IFraudService,
  INotificationService,
  IAuditService,
  PlaceBidResult,
  FraudCheckResult,
} from '@/services/contracts'

export class BidProcessingService {
  constructor(
    private auctionService: IAuctionService,
    private depositService: IBidDepositService,
    private fraudService: IFraudService,
    private notificationService: INotificationService,
    private auditService: IAuditService
  ) {}

  async processBid(params: {
    userId: string
    auctionId: string
    amount: number
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<{
    success: boolean
    result?: PlaceBidResult
    fraudCheck?: FraudCheckResult
    error?: string
  }> {
    const { userId, auctionId, amount, ipAddress, userAgent } = params

    try {
      // Fraud detection
      const fraudCheck = await this.fraudService.runBidFraudChecks({
        userId,
        auctionId,
        bidAmount: amount,
        ipAddress,
        userAgent,
      })

      if (!fraudCheck.passed) {
        await this.auditService.logAuditEvent({
          actorId: userId,
          action: 'BID_BLOCKED_FRAUD',
          resourceType: 'auction',
          resourceId: auctionId,
          severity: 'HIGH',
          status: 'FAILURE',
          details: { alerts: fraudCheck.alerts },
        })

        return {
          success: false,
          fraudCheck,
          error: 'Bid blocked by fraud detection',
        }
      }

      // Ensure deposit
      const depositResult = await this.depositService.createBidDeposit({
        userId,
        auctionId,
        bidAmount: amount,
      })

      if (!depositResult.success) {
        return {
          success: false,
          error: depositResult.error || 'Failed to create deposit',
        }
      }

      // Place bid
      const result = await this.auctionService.placeBid(
        auctionId,
        userId,
        amount,
        { ipAddress, userAgent }
      )

      // Notify watchers (async, non-blocking)
      this.notificationService.notifyWatchersNewBid(
        auctionId,
        amount,
        result.auction.currency,
        null // Anonymous
      ).catch(err => console.error('Failed to notify watchers:', err))

      // Audit log
      await this.auditService.logAuditEvent({
        actorId: userId,
        action: 'BID_PLACED',
        resourceType: 'auction',
        resourceId: auctionId,
        severity: 'MEDIUM',
        status: 'SUCCESS',
        details: {
          bidId: result.bid.id,
          amount,
          extended: result.extended,
        },
      })

      return { success: true, result }

    } catch (error) {
      await this.auditService.logAuditEvent({
        actorId: userId,
        action: 'BID_PLACEMENT_ERROR',
        resourceType: 'auction',
        resourceId: auctionId,
        severity: 'HIGH',
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
```

## Testing Examples

### Example 4: Unit Testing with Mocks

```typescript
// /src/services/__tests__/bid-processing.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  IAuctionService,
  IBidDepositService,
  IFraudService,
  INotificationService,
  IAuditService,
} from '@/services/contracts'
import { BidProcessingService } from '../bid-processing.service'

describe('BidProcessingService', () => {
  let mockAuctionService: IAuctionService
  let mockDepositService: IBidDepositService
  let mockFraudService: IFraudService
  let mockNotificationService: INotificationService
  let mockAuditService: IAuditService
  let bidProcessingService: BidProcessingService

  beforeEach(() => {
    // Create mocks with all required methods
    mockAuctionService = {
      placeBid: vi.fn(),
      getAuctionById: vi.fn(),
      createAuction: vi.fn(),
      // ... other methods
    } as unknown as IAuctionService

    mockDepositService = {
      createBidDeposit: vi.fn(),
      hasValidDeposit: vi.fn(),
      // ... other methods
    } as unknown as IBidDepositService

    mockFraudService = {
      runBidFraudChecks: vi.fn(),
      createFraudAlert: vi.fn(),
      // ... other methods
    } as unknown as IFraudService

    mockNotificationService = {
      notifyWatchersNewBid: vi.fn().mockResolvedValue(undefined),
      // ... other methods
    } as unknown as INotificationService

    mockAuditService = {
      logAuditEvent: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      // ... other methods
    } as unknown as IAuditService

    bidProcessingService = new BidProcessingService(
      mockAuctionService,
      mockDepositService,
      mockFraudService,
      mockNotificationService,
      mockAuditService
    )
  })

  it('should successfully process a valid bid', async () => {
    // Setup mocks
    vi.mocked(mockFraudService.runBidFraudChecks).mockResolvedValue({
      passed: true,
      alerts: [],
    })

    vi.mocked(mockDepositService.createBidDeposit).mockResolvedValue({
      success: true,
      deposit: { id: 'deposit-1' } as any,
    })

    vi.mocked(mockAuctionService.placeBid).mockResolvedValue({
      bid: { id: 'bid-1', amount: 1000 } as any,
      auction: { id: 'auction-1', currency: 'EUR' } as any,
      extended: false,
    })

    // Execute
    const result = await bidProcessingService.processBid({
      userId: 'user-1',
      auctionId: 'auction-1',
      amount: 1000,
    })

    // Assert
    expect(result.success).toBe(true)
    expect(result.result?.bid.id).toBe('bid-1')
    expect(mockFraudService.runBidFraudChecks).toHaveBeenCalledWith({
      userId: 'user-1',
      auctionId: 'auction-1',
      bidAmount: 1000,
      ipAddress: undefined,
      userAgent: undefined,
    })
    expect(mockDepositService.createBidDeposit).toHaveBeenCalled()
    expect(mockAuctionService.placeBid).toHaveBeenCalled()
    expect(mockAuditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BID_PLACED',
        status: 'SUCCESS',
      })
    )
  })

  it('should block bid when fraud check fails', async () => {
    // Setup
    vi.mocked(mockFraudService.runBidFraudChecks).mockResolvedValue({
      passed: false,
      alerts: [
        {
          type: 'SHILL_BIDDING',
          severity: 'CRITICAL',
          message: 'Seller bidding on own auction',
          details: {},
        },
      ],
    })

    // Execute
    const result = await bidProcessingService.processBid({
      userId: 'user-1',
      auctionId: 'auction-1',
      amount: 1000,
    })

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toContain('fraud detection')
    expect(mockDepositService.createBidDeposit).not.toHaveBeenCalled()
    expect(mockAuctionService.placeBid).not.toHaveBeenCalled()
    expect(mockAuditService.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BID_BLOCKED_FRAUD',
        severity: 'HIGH',
        status: 'FAILURE',
      })
    )
  })

  it('should handle deposit creation failure', async () => {
    // Setup
    vi.mocked(mockFraudService.runBidFraudChecks).mockResolvedValue({
      passed: true,
      alerts: [],
    })

    vi.mocked(mockDepositService.createBidDeposit).mockResolvedValue({
      success: false,
      error: 'Insufficient funds',
    })

    // Execute
    const result = await bidProcessingService.processBid({
      userId: 'user-1',
      auctionId: 'auction-1',
      amount: 1000,
    })

    // Assert
    expect(result.success).toBe(false)
    expect(result.error).toBe('Insufficient funds')
    expect(mockAuctionService.placeBid).not.toHaveBeenCalled()
  })
})
```

## Dependency Injection

### Example 5: Simple DI Container

```typescript
// /src/lib/di-container.ts
import type {
  IAuctionService,
  IBidDepositService,
  IFraudService,
  INotificationService,
  IAuditService,
  IListingService,
  IEmailService,
  IStorageService,
} from '@/services/contracts'

import * as AuctionService from '@/services/auction.service'
import * as PaymentService from '@/services/payment.service'
import * as FraudService from '@/services/fraud.service'
import * as NotificationService from '@/services/notification.service'
import * as AuditService from '@/services/audit.service'
import * as ListingService from '@/services/listing.service'
import * as EmailService from '@/lib/email'
import * as StorageService from '@/lib/r2'

export class ServiceContainer {
  private static instance: ServiceContainer

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer()
    }
    return ServiceContainer.instance
  }

  get auction(): IAuctionService {
    return AuctionService
  }

  get deposit(): IBidDepositService {
    return PaymentService
  }

  get fraud(): IFraudService {
    return FraudService
  }

  get notification(): INotificationService {
    return NotificationService
  }

  get audit(): IAuditService {
    return AuditService
  }

  get listing(): IListingService {
    return ListingService
  }

  get email(): IEmailService {
    return EmailService
  }

  get storage(): IStorageService {
    return StorageService
  }
}

// Usage in API routes or components
const services = ServiceContainer.getInstance()

export async function handleBid() {
  const fraudCheck = await services.fraud.runBidFraudChecks({...})
  const result = await services.auction.placeBid(...)
  await services.notification.notifyWatchersNewBid(...)
}
```

### Example 6: Testing with DI Container

```typescript
// /src/lib/__tests__/di-container.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ServiceContainer } from '../di-container'

describe('ServiceContainer', () => {
  it('should provide auction service', () => {
    const container = ServiceContainer.getInstance()
    expect(container.auction).toBeDefined()
    expect(typeof container.auction.placeBid).toBe('function')
  })

  it('should be a singleton', () => {
    const container1 = ServiceContainer.getInstance()
    const container2 = ServiceContainer.getInstance()
    expect(container1).toBe(container2)
  })
})
```

## Summary

These examples demonstrate:

1. **Type Safety**: Using interfaces ensures compile-time type checking
2. **Testability**: Easy to mock services in unit tests
3. **Flexibility**: Swap implementations without changing dependent code
4. **Separation of Concerns**: Each service has a clear, focused interface
5. **Dependency Injection**: Services can be injected for better modularity

For more information, see the [README.md](./README.md) file.
