/**
 * SMS Provider Interface
 *
 * Defines the contract for SMS delivery providers.
 * Implementations can use different backends (Twilio, mock, etc.)
 * following the Open/Closed Principle.
 */

/**
 * SMS Provider interface for sending SMS messages
 */
export interface ISMSProvider {
  /**
   * Send an SMS message to a phone number
   *
   * @param to - Phone number in E.164 format (e.g., +40712345678)
   * @param body - Message body (max length varies by provider, typically 160-1600 chars)
   * @throws Error if SMS delivery fails
   */
  sendSMS(to: string, body: string): Promise<void>
}
