import { INotificationTransport } from './contracts/notification-transport.interface'
import { pusher, CHANNELS } from '@/lib/pusher'

/**
 * Pusher implementation of notification transport
 * Wraps Pusher-specific logic and provides a clean interface
 */
export class PusherNotificationTransport implements INotificationTransport {
  /**
   * Send a message to a specific channel using Pusher
   */
  async send(channel: string, event: string, data: unknown): Promise<void> {
    try {
      await pusher.trigger(channel, event, data)
      console.log(`[PusherTransport] Sent event '${event}' to channel '${channel}'`)
    } catch (error) {
      console.error(`[PusherTransport] Failed to send to channel '${channel}':`, error)
      throw error
    }
  }

  /**
   * Send a message to a user-specific private channel
   * Uses Pusher's user notification channel naming convention
   */
  async sendToUser(userId: string, event: string, data: unknown): Promise<void> {
    const channel = CHANNELS.userNotifications(userId)
    try {
      await pusher.trigger(channel, event, data)
      console.log(`[PusherTransport] Sent event '${event}' to user ${userId}`)
    } catch (error) {
      console.error(`[PusherTransport] Failed to send to user ${userId}:`, error)
      throw error
    }
  }
}

/**
 * Factory function to create the default notification transport
 * Centralizes instantiation for easier dependency injection
 */
export function createNotificationTransport(): INotificationTransport {
  return new PusherNotificationTransport()
}
