import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import { createMockPrisma, factories, timeUtils } from '../helpers/test-utils'
import { AUCTION_RULES } from '@/domain/auction/rules'

// Mock the prisma import first before importing the service
vi.mock('@/lib/db', () => ({
  prisma: createMockPrisma(),
}))

// Import service after mocking
import {
  placeBid,
  createAuction,
  endAuction,
} from '@/services/auction.service'

describe('Auction Service', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(async () => {
    // Get the mocked prisma instance
    const { prisma: mockedPrisma } = await import('@/lib/db')
    prisma = mockedPrisma as unknown as ReturnType<typeof createMockPrisma>
    vi.clearAllMocks()
  })

  describe('placeBid', () => {
    it('should place a valid bid and update auction', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        startingPrice: 1000,
        currentBid: new Prisma.Decimal(1100),
        startTime: new Date('2024-01-01'),
        currentEndTime: new Date('2024-12-31'),
        antiSnipingEnabled: true,
        extensionCount: 0,
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
        startingPrice: 1000,
      })

      const newBid = factories.bid({
        id: 'bid-new',
        amount: new Prisma.Decimal(1200),
        isWinning: true,
      })

      const updatedAuction = {
        ...auction,
        currentBid: new Prisma.Decimal(1200),
        bidCount: 1,
      }

      // Mock transaction
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
            update: vi.fn().mockResolvedValue(updatedAuction),
          },
          bid: {
            create: vi.fn().mockResolvedValue(newBid),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return callback(txPrisma)
      })

      const result = await placeBid('auction-123', 'bidder-123', 1200)

      expect(result.bid).toBeDefined()
      expect(result.bid.amount).toEqual(new Prisma.Decimal(1200))
      expect(result.auction.currentBid).toEqual(new Prisma.Decimal(1200))
      expect(result.extended).toBe(false)
    })

    it('should reject bid from seller', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        startTime: new Date('2024-01-01'),
        currentEndTime: new Date('2024-12-31'),
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
      })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
          },
        }
        return callback(txPrisma)
      })

      await expect(
        placeBid('auction-123', 'seller-123', 1100)
      ).rejects.toThrow('Sellers cannot bid on their own listings')
    })

    it('should reject bid when auction not active', async () => {
      const auction = factories.auction({
        status: 'ENDED',
      })

      const listing = factories.listing()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
          },
        }
        return callback(txPrisma)
      })

      await expect(
        placeBid('auction-123', 'bidder-123', 1100)
      ).rejects.toThrow('Auction is not active')
    })

    it('should reject bid when auction has ended', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        startTime: new Date('2024-01-01'),
        currentEndTime: new Date('2024-01-02'), // Past end time
      })

      const listing = factories.listing()

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
          },
        }
        return callback(txPrisma)
      })

      await expect(
        placeBid('auction-123', 'bidder-123', 1100)
      ).rejects.toThrow('Auction has ended')
    })

    it('should reject bid below minimum', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        startingPrice: 1000,
        currentBid: new Prisma.Decimal(1100),
        startTime: new Date('2024-01-01'),
        currentEndTime: new Date('2024-12-31'),
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
        startingPrice: 1000,
      })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
          },
        }
        return callback(txPrisma)
      })

      // Minimum bid should be 1100 + max(1%, €10) = 1111
      await expect(
        placeBid('auction-123', 'bidder-123', 1105)
      ).rejects.toThrow(/Bid must be at least/)
    })

    it('should trigger anti-sniping extension when bid in last 2 minutes', async () => {
      const now = new Date('2024-01-05T12:00:00Z')
      const endTime = new Date('2024-01-05T12:01:30Z') // 1.5 minutes from now

      const auction = factories.auction({
        status: 'ACTIVE',
        startingPrice: 1000,
        currentBid: new Prisma.Decimal(1100),
        startTime: new Date('2024-01-01'),
        currentEndTime: endTime,
        antiSnipingEnabled: true,
        extensionCount: 0,
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
        startingPrice: 1000,
      })

      const newBid = factories.bid({
        amount: new Prisma.Decimal(1200),
        triggeredExtension: true,
      })

      const extendedEndTime = new Date(endTime.getTime() + 2 * 60 * 1000) // +2 minutes

      const updatedAuction = {
        ...auction,
        currentBid: new Prisma.Decimal(1200),
        currentEndTime: extendedEndTime,
        extensionCount: 1,
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
            update: vi.fn().mockResolvedValue(updatedAuction),
          },
          bid: {
            create: vi.fn().mockResolvedValue(newBid),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return callback(txPrisma)
      })

      // Mock Date.now() to control time
      vi.spyOn(Date, 'now').mockReturnValue(now.getTime())

      const result = await placeBid('auction-123', 'bidder-123', 1200)

      expect(result.extended).toBe(true)
      expect(result.bid.triggeredExtension).toBe(true)
      expect(result.auction.extensionCount).toBe(1)

      vi.restoreAllMocks()
    })

    it('should not extend after max extensions reached', async () => {
      const now = new Date('2024-01-05T12:00:00Z')
      const endTime = new Date('2024-01-05T12:01:30Z')

      const auction = factories.auction({
        status: 'ACTIVE',
        startingPrice: 1000,
        currentBid: new Prisma.Decimal(1100),
        startTime: new Date('2024-01-01'),
        currentEndTime: endTime,
        antiSnipingEnabled: true,
        extensionCount: AUCTION_RULES.MAX_EXTENSIONS, // Max extensions reached
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
        startingPrice: 1000,
      })

      const newBid = factories.bid({
        amount: new Prisma.Decimal(1200),
        triggeredExtension: false,
      })

      const updatedAuction = {
        ...auction,
        currentBid: new Prisma.Decimal(1200),
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
            update: vi.fn().mockResolvedValue(updatedAuction),
          },
          bid: {
            create: vi.fn().mockResolvedValue(newBid),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return callback(txPrisma)
      })

      vi.spyOn(Date, 'now').mockReturnValue(now.getTime())

      const result = await placeBid('auction-123', 'bidder-123', 1200)

      expect(result.extended).toBe(false)

      vi.restoreAllMocks()
    })

    it('should mark previous winning bid as not winning', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        startingPrice: 1000,
        currentBid: new Prisma.Decimal(1100),
        startTime: new Date('2024-01-01'),
        currentEndTime: new Date('2024-12-31'),
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
      })

      const newBid = factories.bid({
        amount: new Prisma.Decimal(1200),
      })

      const updatedAuction = {
        ...auction,
        currentBid: new Prisma.Decimal(1200),
      }

      const updateManyMock = vi.fn().mockResolvedValue({ count: 1 })

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
            update: vi.fn().mockResolvedValue(updatedAuction),
          },
          bid: {
            create: vi.fn().mockResolvedValue(newBid),
            updateMany: updateManyMock,
          },
        }
        return callback(txPrisma)
      })

      await placeBid('auction-123', 'bidder-123', 1200)

      expect(updateManyMock).toHaveBeenCalledWith({
        where: {
          auctionId: 'auction-123',
          isWinning: true,
          id: { not: newBid.id },
        },
        data: { isWinning: false },
      })
    })

    it('should update reserve met status when bid meets reserve', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        startingPrice: 1000,
        currentBid: new Prisma.Decimal(1100),
        startTime: new Date('2024-01-01'),
        currentEndTime: new Date('2024-12-31'),
        reserveMet: false,
      })

      const listing = factories.listing({
        sellerId: 'seller-123',
        startingPrice: 1000,
        reservePrice: new Prisma.Decimal(2000), // Reserve at 2000
      })

      const newBid = factories.bid({
        amount: new Prisma.Decimal(2100), // Meets reserve
      })

      const updatedAuction = {
        ...auction,
        currentBid: new Prisma.Decimal(2100),
        reserveMet: true,
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        const txPrisma = {
          auction: {
            findUnique: vi.fn().mockResolvedValue({ ...auction, listing }),
            update: vi.fn().mockResolvedValue(updatedAuction),
          },
          bid: {
            create: vi.fn().mockResolvedValue(newBid),
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return callback(txPrisma)
      })

      const result = await placeBid('auction-123', 'bidder-123', 2100)

      expect(result.auction.reserveMet).toBe(true)
    })
  })

  describe('createAuction', () => {
    it('should create auction for approved listing', async () => {
      const listing = factories.listing({
        status: 'APPROVED',
        startingPrice: 1000,
      })

      const auction = factories.auction({
        listingId: 'listing-123',
        startingPrice: 1000,
        status: 'ACTIVE',
      })

      vi.mocked(prisma.listing.findUnique).mockResolvedValue(listing as any)
      vi.mocked(prisma.auction.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.auction.create).mockResolvedValue(auction as any)
      vi.mocked(prisma.listing.update).mockResolvedValue({} as any)

      const result = await createAuction(
        'listing-123',
        new Date('2024-01-01'),
        7
      )

      expect(result).toEqual(auction)
      expect(prisma.auction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            listingId: 'listing-123',
            startingPrice: 1000,
            antiSnipingEnabled: true,
          }),
        })
      )
    })

    it('should throw error when listing not approved', async () => {
      const listing = factories.listing({
        status: 'PENDING',
      })

      vi.mocked(prisma.listing.findUnique).mockResolvedValue(listing as any)

      await expect(
        createAuction('listing-123', new Date(), 7)
      ).rejects.toThrow('Listing must be approved before creating auction')
    })

    it('should throw error when auction already exists', async () => {
      const listing = factories.listing({ status: 'APPROVED' })
      const existingAuction = factories.auction()

      vi.mocked(prisma.listing.findUnique).mockResolvedValue(listing as any)
      vi.mocked(prisma.auction.findUnique).mockResolvedValue(existingAuction as any)

      await expect(
        createAuction('listing-123', new Date(), 7)
      ).rejects.toThrow('Auction already exists for this listing')
    })
  })

  describe('endAuction', () => {
    it('should end auction with winner and calculate buyer fee', async () => {
      const winningBid = factories.bid({
        bidderId: 'winner-123',
        amount: new Prisma.Decimal(10000),
        isWinning: true,
      })

      const auction = factories.auction({
        status: 'ACTIVE',
        currentBid: new Prisma.Decimal(10000),
        currentEndTime: new Date('2024-01-01'),
      })

      const listing = factories.listing({
        reservePrice: null,
      })

      const updatedAuction = {
        ...auction,
        status: 'SOLD',
        winnerId: 'winner-123',
        finalPrice: new Prisma.Decimal(10000),
        buyerFeeAmount: new Prisma.Decimal(500), // 5% of 10000
        paymentStatus: 'UNPAID',
      }

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [winningBid],
      } as any)

      vi.mocked(prisma.auction.update).mockResolvedValue(updatedAuction as any)
      vi.mocked(prisma.listing.update).mockResolvedValue({} as any)

      const result = await endAuction('auction-123')

      expect(result.status).toBe('SOLD')
      expect(result.winnerId).toBe('winner-123')
      expect(result.finalPrice).toEqual(new Prisma.Decimal(10000))
      expect(result.buyerFeeAmount).toEqual(new Prisma.Decimal(500))
      expect(prisma.listing.update).toHaveBeenCalledWith({
        where: { id: auction.listingId },
        data: { status: 'SOLD' },
      })
    })

    it('should end auction as NO_SALE when reserve not met', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        currentBid: new Prisma.Decimal(1000),
      })

      const listing = factories.listing({
        reservePrice: new Prisma.Decimal(2000), // Reserve not met
      })

      const updatedAuction = {
        ...auction,
        status: 'NO_SALE',
        winnerId: null,
        finalPrice: null,
      }

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.auction.update).mockResolvedValue(updatedAuction as any)
      vi.mocked(prisma.listing.update).mockResolvedValue({} as any)

      const result = await endAuction('auction-123')

      expect(result.status).toBe('NO_SALE')
      expect(result.winnerId).toBeNull()
      expect(prisma.listing.update).toHaveBeenCalledWith({
        where: { id: auction.listingId },
        data: { status: 'EXPIRED' },
      })
    })

    it('should end auction as NO_SALE when no bids', async () => {
      const auction = factories.auction({
        status: 'ACTIVE',
        currentBid: null,
      })

      const listing = factories.listing()

      const updatedAuction = {
        ...auction,
        status: 'NO_SALE',
      }

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      vi.mocked(prisma.auction.update).mockResolvedValue(updatedAuction as any)
      vi.mocked(prisma.listing.update).mockResolvedValue({} as any)

      const result = await endAuction('auction-123')

      expect(result.status).toBe('NO_SALE')
    })

    it('should throw error when auction not active', async () => {
      const auction = factories.auction({
        status: 'ENDED',
      })

      const listing = factories.listing()

      vi.mocked(prisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
        bids: [],
      } as any)

      await expect(endAuction('auction-123')).rejects.toThrow('Auction is not active')
    })
  })
})
