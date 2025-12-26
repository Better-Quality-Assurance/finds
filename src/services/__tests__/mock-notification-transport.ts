import { INotificationTransport } from '../contracts/notification-transport.interface'

/**
 * Mock notification transport for testing
 * Captures sent notifications instead of actually sending them
 */
export class MockNotificationTransport implements INotificationTransport {
  private messages: Array<{
    channel: string
    event: string
    data: unknown
    timestamp: Date
  }> = []

  async send(channel: string, event: string, data: unknown): Promise<void> {
    this.messages.push({
      channel,
      event,
      data,
      timestamp: new Date(),
    })
  }

  async sendToUser(userId: string, event: string, data: unknown): Promise<void> {
    // Store with user-specific channel format for inspection
    this.messages.push({
      channel: `private-user-${userId}-notifications`,
      event,
      data,
      timestamp: new Date(),
    })
  }

  /**
   * Get all captured messages
   */
  getMessages() {
    return [...this.messages]
  }

  /**
   * Get messages sent to a specific channel
   */
  getMessagesByChannel(channel: string) {
    return this.messages.filter(m => m.channel === channel)
  }

  /**
   * Get messages sent to a specific user
   */
  getMessagesByUser(userId: string) {
    const userChannel = `private-user-${userId}-notifications`
    return this.messages.filter(m => m.channel === userChannel)
  }

  /**
   * Get messages of a specific event type
   */
  getMessagesByEvent(event: string) {
    return this.messages.filter(m => m.event === event)
  }

  /**
   * Clear all captured messages
   */
  clear() {
    this.messages = []
  }

  /**
   * Get count of messages sent
   */
  getMessageCount(): number {
    return this.messages.length
  }

  /**
   * Check if a specific message was sent
   */
  wasSent(channel: string, event: string): boolean {
    return this.messages.some(m => m.channel === channel && m.event === event)
  }

  /**
   * Get the last message sent
   */
  getLastMessage() {
    return this.messages[this.messages.length - 1]
  }
}
