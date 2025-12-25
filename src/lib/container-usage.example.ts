/**
 * Container Usage Examples
 *
 * This file demonstrates how to use the dependency injection container
 * in different scenarios throughout the Finds auction platform.
 */

import { getContainer, createTestContainer, setContainer } from './container'

/**
 * Example 1: Using the container in an API route
 *
 * This is the most common usage pattern - get the singleton container
 * and use its services in API routes.
 */
export async function apiRouteExample(userId: string, auctionId: string) {
  const container = getContainer()

  // Check fraud before placing a bid
  const fraudCheck = await container.fraud.runBidFraudChecks({
    userId,
    auctionId,
    bidAmount: 5000,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  })

  if (!fraudCheck.passed) {
    // Log the fraud attempt
    await container.audit.logAuditEvent({
      actorId: userId,
      action: 'BID_BLOCKED_FRAUD',
      resourceType: 'AUCTION',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'FAILURE',
      details: { alerts: fraudCheck.alerts },
    })

    return { success: false, reason: 'Fraud check failed' }
  }

  // Check deposit is valid
  const hasDeposit = await container.deposits.hasValidDeposit(userId, auctionId)

  if (!hasDeposit) {
    return { success: false, reason: 'No valid deposit' }
  }

  // Send notification
  await container.notifications.sendUserNotification(userId, {
    type: 'AUCTION_WON',
    title: 'Bid Placed',
    message: 'Your bid has been placed successfully',
  })

  return { success: true }
}

/**
 * Example 2: Using services in business logic
 *
 * Services can be used together to implement complex workflows
 */
export async function auctionEndWorkflow(auctionId: string, winnerId: string) {
  const container = getContainer()

  // Release non-winning deposits
  const releasedCount = await container.deposits.releaseNonWinningDeposits(
    auctionId,
    winnerId
  )

  // Set payment deadline
  await container.fees.setPaymentDeadline(auctionId)

  // Notify winner
  await container.notifications.notifyAuctionWon(
    winnerId,
    auctionId,
    'Classic Ferrari 250 GT',
    50000,
    'EUR'
  )

  // Notify losers
  await container.notifications.notifyAuctionLost(
    auctionId,
    'Classic Ferrari 250 GT',
    winnerId
  )

  // Log the event
  await container.audit.logAuditEvent({
    action: 'AUCTION_ENDED',
    resourceType: 'AUCTION',
    resourceId: auctionId,
    severity: 'MEDIUM',
    status: 'SUCCESS',
    details: {
      winnerId,
      releasedDeposits: releasedCount,
    },
  })

  return { success: true, releasedDeposits: releasedCount }
}

/**
 * Example 3: Using the container in tests
 *
 * Tests can use the test container to avoid hitting real services
 */
export async function testExample() {
  // Set up test container
  const testContainer = createTestContainer()
  setContainer(testContainer)

  // Now all services are mocked
  const container = getContainer()

  // This won't actually send an email, it's mocked
  await container.email.sendVerificationEmail('test@example.com', 'token-123')

  // This won't create a real fraud alert
  const alert = await container.fraud.createFraudAlert({
    userId: 'user-123',
    alertType: 'TEST_ALERT',
    severity: 'LOW',
    details: { test: true },
  })

  console.log('Mock alert created:', alert.id) // 'mock-alert-id'

  // Clean up (in actual tests, this would be in afterEach)
  // resetContainer()
}

/**
 * Example 4: Direct service usage (without container)
 *
 * For simple cases, you can still import services directly
 */
import * as notificationService from '@/services/notification.service'

export async function directServiceExample(userId: string) {
  // This works fine for simple cases
  await notificationService.sendUserNotification(userId, {
    type: 'LISTING_APPROVED',
    title: 'Listing Approved',
    message: 'Your listing has been approved',
  })
}

/**
 * Example 5: Service composition
 *
 * Complex workflows can compose multiple services
 */
export async function paymentWorkflow(auctionId: string, userId: string) {
  const container = getContainer()

  // Charge buyer fee
  const payment = await container.fees.chargeBuyerFee(auctionId, userId)

  if (!payment.success) {
    // Log payment failure
    await container.audit.logAuditEvent({
      actorId: userId,
      action: 'PAYMENT_FAILED',
      resourceType: 'AUCTION',
      resourceId: auctionId,
      severity: 'HIGH',
      status: 'FAILURE',
      errorMessage: payment.error,
    })

    return { success: false, error: payment.error }
  }

  // Create seller payout
  const payout = await container.payouts.createSellerPayout(auctionId)

  if (!payout.success) {
    await container.audit.logAuditEvent({
      action: 'PAYOUT_FAILED',
      resourceType: 'AUCTION',
      resourceId: auctionId,
      severity: 'CRITICAL',
      status: 'FAILURE',
      errorMessage: payout.error,
    })

    return { success: false, error: payout.error }
  }

  return { success: true, payoutId: payout.payoutId }
}

/**
 * Example 6: Storage service usage
 */
export async function uploadListingPhoto(
  listingId: string,
  file: Buffer,
  filename: string
) {
  const container = getContainer()

  // Generate storage key
  const key = container.storage.generateMediaKey(listingId, 'photo', filename)

  // Upload to R2
  const result = await container.storage.uploadToR2(file, key, 'image/jpeg')

  // Log the upload
  await container.audit.logAuditEvent({
    action: 'MEDIA_UPLOADED',
    resourceType: 'LISTING',
    resourceId: listingId,
    severity: 'LOW',
    status: 'SUCCESS',
    details: {
      key: result.key,
      url: result.url,
      size: result.size,
    },
  })

  return result
}
