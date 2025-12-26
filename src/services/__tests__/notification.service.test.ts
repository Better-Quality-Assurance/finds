/**
 * Example test demonstrating dependency inversion benefits
 * Shows how to test notification service without actual Pusher connection
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { MockNotificationTransport } from './mock-notification-transport'
import {
  setNotificationTransport,
  sendUserNotification,
  broadcastPublic,
} from '../notification.service'

describe('NotificationService with Dependency Inversion', () => {
  let mockTransport: MockNotificationTransport

  beforeEach(() => {
    // Inject mock transport before each test
    mockTransport = new MockNotificationTransport()
    setNotificationTransport(mockTransport)
  })

  it('should send user notification through transport', async () => {
    const userId = 'user-123'
    const notification = {
      type: 'AUCTION_WON' as const,
      title: 'You Won!',
      message: 'Congratulations on winning the auction',
      data: { auctionId: 'auction-456' },
      link: '/auctions/auction-456',
    }

    await sendUserNotification(userId, notification)

    // Verify message was sent through transport
    const messages = mockTransport.getMessagesByUser(userId)
    expect(messages).toHaveLength(1)
    expect(messages[0].event).toBe('notification')
    expect(messages[0].data).toMatchObject({
      type: 'AUCTION_WON',
      title: 'You Won!',
      message: 'Congratulations on winning the auction',
    })
  })

  it('should broadcast public events through transport', async () => {
    const event = 'auction-starting'
    const data = {
      auctionId: 'auction-789',
      listingTitle: 'Classic Porsche 911',
      startingPrice: 50000,
    }

    await broadcastPublic(event, data)

    // Verify broadcast was sent to public channel
    const messages = mockTransport.getMessagesByChannel('public')
    expect(messages).toHaveLength(1)
    expect(messages[0].event).toBe(event)
    expect(messages[0].data).toMatchObject(data)
  })

  it('should handle multiple notifications correctly', async () => {
    // Send multiple notifications
    await sendUserNotification('user-1', {
      type: 'OUTBID' as const,
      title: 'Outbid',
      message: 'You have been outbid',
    })

    await sendUserNotification('user-2', {
      type: 'AUCTION_WON' as const,
      title: 'Winner',
      message: 'You won the auction',
    })

    await broadcastPublic('new-auction', { id: 'auction-1' })

    // Verify all messages were sent
    expect(mockTransport.getMessageCount()).toBe(3)
    expect(mockTransport.getMessagesByUser('user-1')).toHaveLength(1)
    expect(mockTransport.getMessagesByUser('user-2')).toHaveLength(1)
    expect(mockTransport.getMessagesByChannel('public')).toHaveLength(1)
  })
})
