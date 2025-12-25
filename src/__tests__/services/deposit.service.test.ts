import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DepositService } from '@/services/deposit.service'
import { DepositStatus } from '@prisma/client'
import { createMockPrisma, createMockStripe, factories } from '../helpers/test-utils'

describe('DepositService', () => {
  let depositService: DepositService
  let mockPrisma: ReturnType<typeof createMockPrisma>
  let mockStripe: ReturnType<typeof createMockStripe>

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    mockStripe = createMockStripe()
    depositService = new DepositService(mockPrisma, mockStripe)
  })

  describe('checkBiddingEligibility', () => {
    it('should return eligible when user has verified email and payment method', async () => {
      const user = factories.user({
        emailVerified: new Date(),
        stripeCustomerId: 'cus_123',
        biddingEnabled: true,
      })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)
      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)

      const result = await depositService.checkBiddingEligibility('user-123')

      expect(result.eligible).toBe(true)
      expect(result.hasPaymentMethod).toBe(true)
      expect(result.stripeCustomerId).toBe('cus_123')
    })

    it('should return not eligible when user not found', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null)

      const result = await depositService.checkBiddingEligibility('user-123')

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('User not found')
    })

    it('should return not eligible when email not verified', async () => {
      const user = factories.user({ emailVerified: null })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)

      const result = await depositService.checkBiddingEligibility('user-123')

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('Email not verified')
    })

    it('should return not eligible when no stripe customer', async () => {
      const user = factories.user({ stripeCustomerId: null })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)

      const result = await depositService.checkBiddingEligibility('user-123')

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('No payment method on file')
    })

    it('should return not eligible when no payment method', async () => {
      const user = factories.user({ stripeCustomerId: 'cus_123' })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)
      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [],
      } as any)

      const result = await depositService.checkBiddingEligibility('user-123')

      expect(result.eligible).toBe(false)
      expect(result.reason).toBe('No valid payment method')
    })
  })

  describe('createBidDeposit', () => {
    it('should create a held deposit when payment succeeds', async () => {
      const user = factories.user({
        emailVerified: new Date(),
        stripeCustomerId: 'cus_123',
      })

      const paymentIntent = factories.stripePaymentIntent({
        status: 'requires_capture',
        amount: 10000, // 100 EUR in cents
      })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)
      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)
      vi.mocked(mockPrisma.bidDeposit.findFirst).mockResolvedValue(null)
      vi.mocked(mockStripe.paymentIntents.create).mockResolvedValue(paymentIntent)

      const deposit = factories.bidDeposit({ status: DepositStatus.HELD })
      vi.mocked(mockPrisma.bidDeposit.create).mockResolvedValue(deposit as any)

      const result = await depositService.createBidDeposit({
        userId: 'user-123',
        auctionId: 'auction-123',
        bidAmount: 1000,
      })

      expect(result.success).toBe(true)
      expect(result.deposit).toBeDefined()
      expect(result.deposit?.status).toBe(DepositStatus.HELD)
      expect(mockPrisma.bidDeposit.create).toHaveBeenCalled()
    })

    it('should return existing deposit if already held', async () => {
      const user = factories.user({
        emailVerified: new Date(),
        stripeCustomerId: 'cus_123',
      })

      const existingDeposit = factories.bidDeposit({ status: DepositStatus.HELD })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)
      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)
      vi.mocked(mockPrisma.bidDeposit.findFirst).mockResolvedValue(existingDeposit as any)

      const result = await depositService.createBidDeposit({
        userId: 'user-123',
        auctionId: 'auction-123',
        bidAmount: 1000,
      })

      expect(result.success).toBe(true)
      expect(result.deposit).toEqual(existingDeposit)
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled()
    })

    it('should require action when 3DS authentication needed', async () => {
      const user = factories.user({
        emailVerified: new Date(),
        stripeCustomerId: 'cus_123',
      })

      const paymentIntent = factories.stripePaymentIntent({
        status: 'requires_action',
        client_secret: 'pi_123_secret',
      })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)
      vi.mocked(mockStripe.paymentMethods.list).mockResolvedValue({
        data: [factories.stripePaymentMethod()],
      } as any)
      vi.mocked(mockPrisma.bidDeposit.findFirst).mockResolvedValue(null)
      vi.mocked(mockStripe.paymentIntents.create).mockResolvedValue(paymentIntent)

      const deposit = factories.bidDeposit({ status: DepositStatus.PENDING })
      vi.mocked(mockPrisma.bidDeposit.create).mockResolvedValue(deposit as any)

      const result = await depositService.createBidDeposit({
        userId: 'user-123',
        auctionId: 'auction-123',
        bidAmount: 1000,
      })

      expect(result.success).toBe(false)
      expect(result.requiresAction).toBe(true)
      expect(result.clientSecret).toBe('pi_123_secret')
    })

    it('should fail when user is not eligible', async () => {
      const user = factories.user({ emailVerified: null })

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(user as any)

      const result = await depositService.createBidDeposit({
        userId: 'user-123',
        auctionId: 'auction-123',
        bidAmount: 1000,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email not verified')
    })
  })

  describe('releaseBidDeposit', () => {
    it('should release a held deposit', async () => {
      const deposit = factories.bidDeposit({
        status: DepositStatus.HELD,
        stripePaymentIntentId: 'pi_123',
      })

      vi.mocked(mockPrisma.bidDeposit.findUnique).mockResolvedValue(deposit as any)
      vi.mocked(mockStripe.paymentIntents.cancel).mockResolvedValue({} as any)
      vi.mocked(mockPrisma.bidDeposit.update).mockResolvedValue({
        ...deposit,
        status: DepositStatus.RELEASED,
      } as any)

      const result = await depositService.releaseBidDeposit('deposit-123')

      expect(result).toBe(true)
      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_123')
      expect(mockPrisma.bidDeposit.update).toHaveBeenCalledWith({
        where: { id: 'deposit-123' },
        data: {
          status: DepositStatus.RELEASED,
          releasedAt: expect.any(Date),
        },
      })
    })

    it('should return false when deposit not held', async () => {
      const deposit = factories.bidDeposit({ status: DepositStatus.RELEASED })

      vi.mocked(mockPrisma.bidDeposit.findUnique).mockResolvedValue(deposit as any)

      const result = await depositService.releaseBidDeposit('deposit-123')

      expect(result).toBe(false)
      expect(mockStripe.paymentIntents.cancel).not.toHaveBeenCalled()
    })

    it('should return false when deposit not found', async () => {
      vi.mocked(mockPrisma.bidDeposit.findUnique).mockResolvedValue(null)

      const result = await depositService.releaseBidDeposit('deposit-123')

      expect(result).toBe(false)
    })
  })

  describe('captureBidDeposit', () => {
    it('should capture a held deposit', async () => {
      const deposit = factories.bidDeposit({
        status: DepositStatus.HELD,
        stripePaymentIntentId: 'pi_123',
      })

      vi.mocked(mockPrisma.bidDeposit.findUnique).mockResolvedValue(deposit as any)
      vi.mocked(mockStripe.paymentIntents.capture).mockResolvedValue({} as any)
      vi.mocked(mockPrisma.bidDeposit.update).mockResolvedValue({
        ...deposit,
        status: DepositStatus.CAPTURED,
      } as any)

      const result = await depositService.captureBidDeposit('deposit-123')

      expect(result).toBe(true)
      expect(mockStripe.paymentIntents.capture).toHaveBeenCalledWith('pi_123')
      expect(mockPrisma.bidDeposit.update).toHaveBeenCalledWith({
        where: { id: 'deposit-123' },
        data: {
          status: DepositStatus.CAPTURED,
          capturedAt: expect.any(Date),
        },
      })
    })

    it('should return false when deposit not held', async () => {
      const deposit = factories.bidDeposit({ status: DepositStatus.RELEASED })

      vi.mocked(mockPrisma.bidDeposit.findUnique).mockResolvedValue(deposit as any)

      const result = await depositService.captureBidDeposit('deposit-123')

      expect(result).toBe(false)
    })
  })

  describe('releaseNonWinningDeposits', () => {
    it('should release all non-winning deposits', async () => {
      const deposits = [
        factories.bidDeposit({ id: 'dep-1', userId: 'user-1', status: DepositStatus.HELD }),
        factories.bidDeposit({ id: 'dep-2', userId: 'user-2', status: DepositStatus.HELD }),
      ]

      vi.mocked(mockPrisma.bidDeposit.findMany).mockResolvedValue(deposits as any)
      vi.mocked(mockPrisma.bidDeposit.findUnique)
        .mockResolvedValueOnce(deposits[0] as any)
        .mockResolvedValueOnce(deposits[1] as any)
      vi.mocked(mockStripe.paymentIntents.cancel).mockResolvedValue({} as any)
      vi.mocked(mockPrisma.bidDeposit.update).mockResolvedValue({} as any)

      const result = await depositService.releaseNonWinningDeposits('auction-123', 'winner-123')

      expect(result).toBe(2)
      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledTimes(2)
    })

    it('should release all deposits when no winner specified', async () => {
      const deposits = [
        factories.bidDeposit({ id: 'dep-1', status: DepositStatus.HELD }),
      ]

      vi.mocked(mockPrisma.bidDeposit.findMany).mockResolvedValue(deposits as any)
      vi.mocked(mockPrisma.bidDeposit.findUnique).mockResolvedValue(deposits[0] as any)
      vi.mocked(mockStripe.paymentIntents.cancel).mockResolvedValue({} as any)
      vi.mocked(mockPrisma.bidDeposit.update).mockResolvedValue({} as any)

      const result = await depositService.releaseNonWinningDeposits('auction-123')

      expect(result).toBe(1)
    })
  })

  describe('hasValidDeposit', () => {
    it('should return true when user has held deposit', async () => {
      const deposit = factories.bidDeposit({ status: DepositStatus.HELD })

      vi.mocked(mockPrisma.bidDeposit.findFirst).mockResolvedValue(deposit as any)

      const result = await depositService.hasValidDeposit('user-123', 'auction-123')

      expect(result).toBe(true)
    })

    it('should return false when deposit is pending', async () => {
      const deposit = factories.bidDeposit({ status: DepositStatus.PENDING })

      vi.mocked(mockPrisma.bidDeposit.findFirst).mockResolvedValue(deposit as any)

      const result = await depositService.hasValidDeposit('user-123', 'auction-123')

      expect(result).toBe(false)
    })

    it('should return false when no deposit exists', async () => {
      vi.mocked(mockPrisma.bidDeposit.findFirst).mockResolvedValue(null)

      const result = await depositService.hasValidDeposit('user-123', 'auction-123')

      expect(result).toBe(false)
    })
  })
})
