/**
 * Mock SMS Provider
 *
 * Development/testing implementation that logs SMS messages to console
 * instead of sending real SMS. Useful for local development and testing.
 */

import type { ISMSProvider } from '@/services/contracts/sms-provider.interface'

/**
 * Mock SMS provider that logs messages to console
 * Use this in development/test environments where real SMS is not needed
 */
export class MockSMSProvider implements ISMSProvider {
  /**
   * Log SMS message to console instead of sending
   *
   * @param to - Phone number (E.164 format)
   * @param body - Message body
   */
  async sendSMS(to: string, body: string): Promise<void> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[MOCK SMS] SMS not sent (using mock provider)')
    console.log(`[MOCK SMS] To: ${to}`)
    console.log(`[MOCK SMS] Body: ${body}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}
