/**
 * Twilio SMS Provider
 *
 * Production implementation using Twilio API for SMS delivery.
 * Falls back to logging if Twilio package is not installed.
 */

import type { ISMSProvider } from '@/services/contracts/sms-provider.interface'

/**
 * Configuration for Twilio SMS provider
 */
interface TwilioConfig {
  accountSid: string
  authToken: string
  fromNumber: string
}

/**
 * Twilio SMS provider for production SMS delivery
 */
export class TwilioSMSProvider implements ISMSProvider {
  private config: TwilioConfig
  private client: any // Will be Twilio client when package is installed

  /**
   * Create a new Twilio SMS provider
   *
   * @param config - Twilio configuration (account SID, auth token, phone number)
   */
  constructor(config: TwilioConfig) {
    this.config = config
    this.initializeClient()
  }

  /**
   * Initialize Twilio client
   * Attempts to load twilio package, falls back to logging if not available
   */
  private initializeClient(): void {
    try {
      // Try to load Twilio SDK
      const twilio = require('twilio')
      this.client = twilio(this.config.accountSid, this.config.authToken)
      console.log('[TwilioSMSProvider] Initialized with real Twilio client')
    } catch (error) {
      // Twilio not installed - we'll log instead of sending
      console.warn('[TwilioSMSProvider] Twilio package not installed. SMS will be logged only.')
      console.warn('[TwilioSMSProvider] To enable real SMS, run: npm install twilio')
      this.client = null
    }
  }

  /**
   * Send SMS via Twilio API
   *
   * @param to - Phone number in E.164 format
   * @param body - Message body (max 1600 characters for Twilio)
   * @throws Error if SMS sending fails
   */
  async sendSMS(to: string, body: string): Promise<void> {
    // Validate message length (Twilio supports up to 1600 chars)
    if (body.length > 1600) {
      throw new Error(`SMS body too long (${body.length} chars). Maximum is 1600 characters.`)
    }

    // If Twilio client is available, send real SMS
    if (this.client) {
      try {
        const message = await this.client.messages.create({
          body,
          from: this.config.fromNumber,
          to,
        })

        console.log(`[TwilioSMSProvider] SMS sent successfully. SID: ${message.sid}`)
      } catch (error: any) {
        console.error('[TwilioSMSProvider] Failed to send SMS:', error.message)
        throw new Error(`Failed to send SMS: ${error.message}`)
      }
    } else {
      // Fallback: Log the SMS that would have been sent
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[TwilioSMSProvider] WOULD SEND SMS (Twilio not installed)')
      console.log(`[TwilioSMSProvider] From: ${this.config.fromNumber}`)
      console.log(`[TwilioSMSProvider] To: ${to}`)
      console.log(`[TwilioSMSProvider] Body: ${body}`)
      console.log('[TwilioSMSProvider] To enable real SMS: npm install twilio')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

/**
 * Factory function to create Twilio SMS provider from environment variables
 *
 * @returns TwilioSMSProvider configured from env vars
 * @throws Error if required environment variables are missing
 */
export function createTwilioProvider(): TwilioSMSProvider {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Missing Twilio configuration. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.'
    )
  }

  return new TwilioSMSProvider({
    accountSid,
    authToken,
    fromNumber,
  })
}
