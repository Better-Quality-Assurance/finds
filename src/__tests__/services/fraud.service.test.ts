import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AlertSeverity, Prisma } from '@prisma/client'
import { createMockPrisma, factories, timeUtils } from '../helpers/test-utils'

// Mock the prisma import first before importing the service
vi.mock('@/lib/db', () => ({
  prisma: createMockPrisma(),
}))

// Import service after mocking
import {
  runBidFraudChecks,
  FRAUD_THRESHOLDS,
  createFraudAlert,
  reviewFraudAlert,
  getFraudStats,
  getUserFraudHistory,
} from '@/services/fraud.service'

describe('Fraud Service', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    // Get the mocked prisma instance
    const { prisma: mockedPrisma } = await import('@/lib/db')
    prisma = mockedPrisma as unknown as ReturnType<typeof createMockPrisma>
    vi.clearAllMocks()
  })

  describe('runBidFraudChecks', () => {
    it('should pass when no fraud indicators detected', async () => {
      const auction = factories.auction({
        id: 'auction-123',
        currentEndTime: timeUtils.addDays(timeUtils.now(), 1),
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
      })

      const user = factories.user({
        id: 'bidder-123',
        createdAt: new Date('2023-01-01'), // Old account
      })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.bid.count).mockResolvedValue(0)
      vi.mocked(prisma.bid.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.bid.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user as any)
      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: 'bidder-123',
        auctionId: 'auction-123',
        bidAmount: 1100,
        ipAddress: '192.168.1.1',
      })

      expect(result.passed).toBe(true)
      expect(result.alerts).toHaveLength(0)
    })

    it('should detect shill bidding (seller bidding on own auction)', async () => {
      const sellerId = 'seller-123'

      const auction = factories.auction({
        id: 'auction-123',
      })

      const listing = factories.listing({
        sellerId,
      })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.bid.count).mockResolvedValue(0)
      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: sellerId, // Seller trying to bid
        auctionId: 'auction-123',
        bidAmount: 1100,
      })

      expect(result.passed).toBe(false)
      expect(result.alerts).toHaveLength(1)
      expect(result.alerts[0].type).toBe('SHILL_BIDDING')
      expect(result.alerts[0].severity).toBe(AlertSeverity.CRITICAL)
    })

    it('should detect excessive bid velocity', async () => {
      const auction = factories.auction()
      const listing = factories.listing({ sellerId: 'seller-123' })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      // User placed 20 bids in last hour
      vi.mocked(prisma.bid.count).mockResolvedValue(
        FRAUD_THRESHOLDS.MAX_BIDS_PER_HOUR
      )
      vi.mocked(prisma.bid.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: 'bidder-123',
        auctionId: 'auction-123',
        bidAmount: 1100,
      })

      expect(result.passed).toBe(false)
      expect(result.alerts.some(a => a.type === 'BID_VELOCITY')).toBe(true)
      expect(result.alerts.find(a => a.type === 'BID_VELOCITY')?.severity).toBe(
        AlertSeverity.HIGH
      )
    })

    it('should detect rapid bidding (too fast)', async () => {
      const auction = factories.auction()
      const listing = factories.listing({ sellerId: 'seller-123' })

      const lastBid = factories.bid({
        createdAt: new Date(Date.now() - 3000), // 3 seconds ago
      })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.bid.count).mockResolvedValue(5)
      vi.mocked(prisma.bid.findFirst).mockResolvedValue(lastBid as any)
      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: 'bidder-123',
        auctionId: 'auction-123',
        bidAmount: 1100,
      })

      expect(result.alerts.some(a => a.type === 'RAPID_BIDDING')).toBe(true)
      expect(result.alerts.find(a => a.type === 'RAPID_BIDDING')?.severity).toBe(
        AlertSeverity.MEDIUM
      )
    })

    it('should detect coordinated bidding (multiple bidders from same IP)', async () => {
      const auction = factories.auction()
      const listing = factories.listing({ sellerId: 'seller-123' })

      // Multiple bidders from same IP
      const sameIpBids = [
        { bidderId: 'user-1' },
        { bidderId: 'user-2' },
        { bidderId: 'user-3' },
      ]

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.bid.count).mockResolvedValue(0)
      vi.mocked(prisma.bid.findFirst).mockResolvedValue(null)

      // Mock for coordinated bidding check
      vi.mocked(prisma.bid.findMany)
        .mockResolvedValueOnce([]) // For seller IP check
        .mockResolvedValueOnce(sameIpBids as any) // For coordinated bidding check

      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: 'bidder-current',
        auctionId: 'auction-123',
        bidAmount: 1100,
        ipAddress: '192.168.1.1',
      })

      expect(result.alerts.some(a => a.type === 'COORDINATED_BIDDING')).toBe(true)
      expect(result.alerts.find(a => a.type === 'COORDINATED_BIDDING')?.severity).toBe(
        AlertSeverity.HIGH
      )
    })

    it('should detect new account bidding high value', async () => {
      const auction = factories.auction()
      const listing = factories.listing({ sellerId: 'seller-123' })

      const newUser = factories.user({
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days old
      })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.bid.count).mockResolvedValue(0)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(newUser as any)
      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: 'bidder-123',
        auctionId: 'auction-123',
        bidAmount: 10000, // High value bid
      })

      expect(result.alerts.some(a => a.type === 'NEW_ACCOUNT_HIGH_VALUE')).toBe(true)
      expect(
        result.alerts.find(a => a.type === 'NEW_ACCOUNT_HIGH_VALUE')?.severity
      ).toBe(AlertSeverity.MEDIUM)
    })

    it('should detect penny bidding (very small increments)', async () => {
      const auction = factories.auction({
        currentBid: new Prisma.Decimal(1000),
      })
      const listing = factories.listing({ sellerId: 'seller-123' })

      const lastBid = factories.bid({
        amount: new Prisma.Decimal(1000),
      })

      const bidsWithBidder = [
        {
          ...lastBid,
          bidder: { id: 'bidder-123', createdAt: new Date('2023-01-01') },
        },
      ]

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: bidsWithBidder,
      } as any)

      vi.mocked(prisma.bid.count).mockResolvedValue(0)
      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      // Bid amount is only 0.5% increment (below 1% threshold)
      const result = await runBidFraudChecks({
        userId: 'bidder-123',
        auctionId: 'auction-123',
        bidAmount: 1005, // Only 5 EUR increase on 1000 EUR
      })

      expect(result.alerts.some(a => a.type === 'PENNY_BIDDING')).toBe(true)
      expect(result.alerts.find(a => a.type === 'PENNY_BIDDING')?.severity).toBe(
        AlertSeverity.MEDIUM
      )
    })

    it('should block on critical alerts', async () => {
      const sellerId = 'seller-123'

      const auction = factories.auction()
      const listing = factories.listing({ sellerId })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: sellerId, // Shill bidding - CRITICAL
        auctionId: 'auction-123',
        bidAmount: 1100,
      })

      expect(result.passed).toBe(false)
      expect(result.alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length).toBeGreaterThan(0)
    })

    it('should block on multiple high severity alerts', async () => {
      const auction = factories.auction()
      const listing = factories.listing({ sellerId: 'seller-123' })

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      // Excessive bid velocity
      vi.mocked(prisma.bid.count).mockResolvedValue(
        FRAUD_THRESHOLDS.MAX_BIDS_PER_HOUR
      )
      vi.mocked(prisma.bid.findFirst).mockResolvedValue(null)

      // Coordinated bidding
      vi.mocked(prisma.bid.findMany)
        .mockResolvedValueOnce([]) // Seller IP check
        .mockResolvedValueOnce([
          { bidderId: 'user-1' },
          { bidderId: 'user-2' },
          { bidderId: 'user-3' },
        ] as any) // Coordinated bidding

      vi.mocked(prisma.fraudAlert.create).mockResolvedValue({} as any)

      const result = await runBidFraudChecks({
        userId: 'bidder-123',
        auctionId: 'auction-123',
        bidAmount: 1100,
        ipAddress: '192.168.1.1',
      })

      const highAlerts = result.alerts.filter(a => a.severity === AlertSeverity.HIGH)
      expect(highAlerts.length).toBeGreaterThanOrEqual(2)
      expect(result.passed).toBe(false)
    })
  })

  describe('createFraudAlert', () => {
    it('should create a fraud alert', async () => {
      const alert = factories.fraudAlert()

      vi.mocked(prisma.fraudAlert.create).mockResolvedValue(alert as any)

      const result = await createFraudAlert({
        userId: 'user-123',
        auctionId: 'auction-123',
        alertType: 'SHILL_BIDDING',
        severity: AlertSeverity.CRITICAL,
        details: { test: 'data' },
      })

      expect(result).toEqual(alert)
      expect(prisma.fraudAlert.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          auctionId: 'auction-123',
          bidId: undefined,
          alertType: 'SHILL_BIDDING',
          severity: AlertSeverity.CRITICAL,
          details: { test: 'data' },
          status: 'OPEN',
        },
      })
    })
  })

  describe('reviewFraudAlert', () => {
    it('should update alert status and reviewer info', async () => {
      const alert = factories.fraudAlert({
        status: 'RESOLVED',
        reviewedById: 'admin-123',
        resolutionNotes: 'False alarm',
      })

      vi.mocked(prisma.fraudAlert.update).mockResolvedValue(alert as any)

      const result = await reviewFraudAlert(
        'alert-123',
        'admin-123',
        'RESOLVED',
        'False alarm'
      )

      expect(result).toEqual(alert)
      expect(prisma.fraudAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-123' },
        data: {
          status: 'RESOLVED',
          reviewedById: 'admin-123',
          reviewedAt: expect.any(Date),
          resolutionNotes: 'False alarm',
        },
      })
    })
  })

  describe('getFraudStats', () => {
    it('should return fraud statistics', async () => {
      vi.mocked(prisma.fraudAlert.count)
        .mockResolvedValueOnce(10) // openAlerts
        .mockResolvedValueOnce(3) // criticalAlerts
        .mockResolvedValueOnce(5) // alertsToday

      vi.mocked(prisma.fraudAlert.groupBy).mockResolvedValue([
        { alertType: 'SHILL_BIDDING', _count: 4 },
        { alertType: 'BID_VELOCITY', _count: 6 },
      ] as any)

      const result = await getFraudStats()

      expect(result.openAlerts).toBe(10)
      expect(result.criticalAlerts).toBe(3)
      expect(result.alertsToday).toBe(5)
      expect(result.alertsByType).toEqual({
        SHILL_BIDDING: 4,
        BID_VELOCITY: 6,
      })
    })
  })

  describe('getUserFraudHistory', () => {
    it('should return user fraud history', async () => {
      const alerts = [factories.fraudAlert(), factories.fraudAlert()]

      vi.mocked(prisma.fraudAlert.count)
        .mockResolvedValueOnce(8) // totalAlerts
        .mockResolvedValueOnce(2) // criticalAlerts

      vi.mocked(prisma.fraudAlert.findMany).mockResolvedValue(alerts as any)

      const result = await getUserFraudHistory('user-123')

      expect(result.totalAlerts).toBe(8)
      expect(result.criticalAlerts).toBe(2)
      expect(result.recentAlerts).toEqual(alerts)
      expect(result.isSuspicious).toBe(true) // totalAlerts >= 5
    })

    it('should mark user as suspicious with critical alerts', async () => {
      vi.mocked(prisma.fraudAlert.count)
        .mockResolvedValueOnce(3) // totalAlerts
        .mockResolvedValueOnce(1) // criticalAlerts

      vi.mocked(prisma.fraudAlert.findMany).mockResolvedValue([])

      const result = await getUserFraudHistory('user-123')

      expect(result.isSuspicious).toBe(true) // criticalAlerts > 0
    })

    it('should not mark user as suspicious with few low-severity alerts', async () => {
      vi.mocked(prisma.fraudAlert.count)
        .mockResolvedValueOnce(2) // totalAlerts
        .mockResolvedValueOnce(0) // criticalAlerts

      vi.mocked(prisma.fraudAlert.findMany).mockResolvedValue([])

      const result = await getUserFraudHistory('user-123')

      expect(result.isSuspicious).toBe(false)
    })
  })
})
