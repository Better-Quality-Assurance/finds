/**
 * Low-level notification transport interface
 * Abstracts the underlying real-time communication mechanism (Pusher, WebSockets, SSE, etc.)
 *
 * This enables:
 * - Swapping notification providers without changing business logic
 * - Easier testing with mock transports
 * - Support for multiple transport strategies
 */
export interface INotificationTransport {
  /**
   * Send a message to a specific channel
   * @param channel - Channel identifier (e.g., 'public', 'auction-123')
   * @param event - Event type/name
   * @param data - Event payload
   */
  send(channel: string, event: string, data: unknown): Promise<void>

  /**
   * Send a message to a user-specific channel
   * @param userId - User identifier
   * @param event - Event type/name
   * @param data - Event payload
   */
  sendToUser(userId: string, event: string, data: unknown): Promise<void>
}
