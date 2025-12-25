import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BuyerFeeService } from '@/services/buyer-fee.service'
import { PaymentStatus, Prisma } from '@prisma/client'
import { createMockPrisma, createMockStripe, factories } from '../helpers/test-utils'

describe('BuyerFeeService', () => {
  let buyerFeeService: BuyerFeeService
  let mockPrisma: ReturnType<typeof createMockPrisma>
  let mockStripe: ReturnType<typeof createMockStripe>

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    mockStripe = createMockStripe()
    buyerFeeService = new BuyerFeeService(mockPrisma, mockStripe)
  })

  describe('chargeBuyerFee', () => {
    it('should charge 5% buyer fee on final price', async () => {
      const finalPrice = 10000 // 10,000 EUR
      const buyerFee = finalPrice * 0.05 // 500 EUR (5%)
      const totalAmount = finalPrice + buyerFee // 10,500 EUR

      const auction = factories.auction({
        status: 'SOLD',
        winnerId: 'user-123',
        finalPrice: new Prisma.Decimal(finalPrice),
        buyerFeeAmount: new Prisma.Decimal(buyerFee),
        paymentStatus: PaymentStatus.UNPAID,
        paymentDeadline: new Date('2024-12-31'),
      })

      const listing = factories.listing()

      const user = factories.user({
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      const paymentIntent = factories.stripePaymentIntent({
        status: 'succeeded',
        amount: Math.round(totalAmount * 100), // Convert to cents
      })

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)

      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)

      vi.mocked(mockStripe.paymentIntents.create).mockResolvedValue(paymentIntent)
      vi.mocked(mockPrisma.auction.update).mockResolvedValue({} as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(true)
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1050000, // 10,500 EUR in cents
          currency: 'eur',
          customer: 'cus_123',
        })
      )
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 'auction-123' },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentIntentId: 'pi_123',
          paidAt: expect.any(Date),
        },
      })
    })

    it('should fail when auction is not sold', async () => {
      const auction = factories.auction({ status: 'ACTIVE' })
      const listing = factories.listing()

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Auction is not sold')
    })

    it('should fail when user is not the winner', async () => {
      const auction = factories.auction({
        status: 'SOLD',
        winnerId: 'other-user',
        finalPrice: new Prisma.Decimal(1000),
        buyerFeeAmount: new Prisma.Decimal(50),
      })
      const listing = factories.listing()

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('User is not the auction winner')
    })

    it('should fail when buyer fee already paid', async () => {
      const auction = factories.auction({
        status: 'SOLD',
        winnerId: 'user-123',
        paymentStatus: PaymentStatus.PAID,
        finalPrice: new Prisma.Decimal(1000),
        buyerFeeAmount: new Prisma.Decimal(50),
      })
      const listing = factories.listing()

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Buyer fee already paid')
    })

    it('should fail when payment deadline has passed', async () => {
      const auction = factories.auction({
        status: 'SOLD',
        winnerId: 'user-123',
        finalPrice: new Prisma.Decimal(1000),
        buyerFeeAmount: new Prisma.Decimal(50),
        paymentDeadline: new Date('2020-01-01'),
      })
      const listing = factories.listing()

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment deadline has passed')
    })

    it('should require action when 3DS authentication needed', async () => {
      const auction = factories.auction({
        status: 'SOLD',
        winnerId: 'user-123',
        finalPrice: new Prisma.Decimal(1000),
        buyerFeeAmount: new Prisma.Decimal(50),
        paymentDeadline: new Date('2024-12-31'),
      })
      const listing = factories.listing()

      const user = factories.user({
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      const paymentIntent = factories.stripePaymentIntent({
        status: 'requires_action',
        client_secret: 'pi_123_secret',
      })

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)

      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)

      vi.mocked(mockStripe.paymentIntents.create).mockResolvedValue(paymentIntent)
      vi.mocked(mockPrisma.auction.update).mockResolvedValue({} as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.requiresAction).toBe(true)
      expect(result.clientSecret).toBe('pi_123_secret')
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 'auction-123' },
        data: {
          paymentStatus: PaymentStatus.PENDING,
          paymentIntentId: 'pi_123',
        },
      })
    })

    it('should handle card declined error', async () => {
      const auction = factories.auction({
        status: 'SOLD',
        winnerId: 'user-123',
        finalPrice: new Prisma.Decimal(1000),
        buyerFeeAmount: new Prisma.Decimal(50),
        paymentDeadline: new Date('2024-12-31'),
      })
      const listing = factories.listing()

      const user = factories.user({
        id: 'user-123',
        stripeCustomerId: 'cus_123',
      })

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue({
        ...auction,
        listing,
      } as any)

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)

      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)

      vi.mocked(mockStripe.paymentIntents.create).mockRejectedValue(
        new Error('card_declined: Your card was declined')
      )
      vi.mocked(mockPrisma.auction.update).mockResolvedValue({} as any)

      const result = await buyerFeeService.chargeBuyerFee('auction-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Card declined')
    })
  })

  describe('getAuctionPaymentStatus', () => {
    it('should return payment status with fee breakdown', async () => {
      const finalPrice = 1000
      const buyerFee = 50

      const auction = {
        paymentStatus: PaymentStatus.UNPAID,
        paidAt: null,
        paymentDeadline: new Date('2024-12-31'),
        finalPrice: new Prisma.Decimal(finalPrice),
        buyerFeeAmount: new Prisma.Decimal(buyerFee),
      }

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue(auction as any)

      const result = await buyerFeeService.getAuctionPaymentStatus('auction-123')

      expect(result.status).toBe(PaymentStatus.UNPAID)
      expect(result.totalAmount).toBe(1050)
      expect(result.breakdown.finalPrice).toBe(1000)
      expect(result.breakdown.buyerFee).toBe(50)
    })

    it('should throw error when auction not found', async () => {
      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue(null)

      await expect(
        buyerFeeService.getAuctionPaymentStatus('auction-123')
      ).rejects.toThrow('Auction not found')
    })
  })

  describe('setPaymentDeadline', () => {
    it('should set payment deadline 5 business days after auction end', async () => {
      const auctionEndTime = new Date('2024-01-01T10:00:00Z') // Monday

      const auction = {
        currentEndTime: auctionEndTime,
      }

      const updatedAuction = factories.auction({
        paymentDeadline: new Date('2024-01-08T10:00:00Z'), // 5 business days later
      })

      vi.mocked(mockPrisma.auction.findUnique).mockResolvedValue(auction as any)
      vi.mocked(mockPrisma.auction.update).mockResolvedValue(updatedAuction as any)

      const result = await buyerFeeService.setPaymentDeadline('auction-123')

      expect(result.paymentDeadline).toBeDefined()
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 'auction-123' },
        data: { paymentDeadline: expect.any(Date) },
      })
    })
  })

  describe('checkOverduePayments', () => {
    it('should mark overdue payments as failed', async () => {
      const overdueAuctions = [
        {
          id: 'auction-1',
          winnerId: 'user-1',
          listing: { title: 'Item 1' },
        },
        {
          id: 'auction-2',
          winnerId: 'user-2',
          listing: { title: 'Item 2' },
        },
      ]

      vi.mocked(mockPrisma.auction.findMany).mockResolvedValue(overdueAuctions as any)
      vi.mocked(mockPrisma.auction.update).mockResolvedValue({} as any)

      const result = await buyerFeeService.checkOverduePayments()

      expect(result).toHaveLength(2)
      expect(result).toEqual(['auction-1', 'auction-2'])
      expect(mockPrisma.auction.update).toHaveBeenCalledTimes(2)
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 'auction-1' },
        data: { paymentStatus: PaymentStatus.FAILED },
      })
    })

    it('should return empty array when no overdue payments', async () => {
      vi.mocked(mockPrisma.auction.findMany).mockResolvedValue([])

      const result = await buyerFeeService.checkOverduePayments()

      expect(result).toHaveLength(0)
    })
  })

  describe('confirmBuyerFeePayment', () => {
    it('should confirm payment after 3DS authentication', async () => {
      const paymentIntent = factories.stripePaymentIntent({
        status: 'succeeded',
        metadata: {
          type: 'buyer_fee',
          auctionId: 'auction-123',
        },
      })

      vi.mocked(mockStripe.paymentIntents.retrieve).mockResolvedValue(paymentIntent)
      vi.mocked(mockPrisma.auction.update).mockResolvedValue({} as any)

      const result = await buyerFeeService.confirmBuyerFeePayment('pi_123')

      expect(result.success).toBe(true)
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 'auction-123' },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paidAt: expect.any(Date),
        },
      })
    })

    it('should fail when payment requires new payment method', async () => {
      const paymentIntent = factories.stripePaymentIntent({
        status: 'requires_payment_method',
        metadata: {
          type: 'buyer_fee',
          auctionId: 'auction-123',
        },
      })

      vi.mocked(mockStripe.paymentIntents.retrieve).mockResolvedValue(paymentIntent)
      vi.mocked(mockPrisma.auction.update).mockResolvedValue({} as any)

      const result = await buyerFeeService.confirmBuyerFeePayment('pi_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('try a different payment method')
      expect(mockPrisma.auction.update).toHaveBeenCalledWith({
        where: { id: 'auction-123' },
        data: { paymentStatus: PaymentStatus.FAILED },
      })
    })
  })
})
