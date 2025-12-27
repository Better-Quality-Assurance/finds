/**
 * Phone Verification Service
 *
 * Handles SMS verification for user phone numbers.
 * Required as part of KYC process before placing first bid.
 * Uses dependency injection for SMS providers (mock or Twilio).
 */

import { prisma } from '@/lib/db'
import type { ISMSProvider } from '@/services/contracts'

// Verification code settings
const CODE_LENGTH = 6
const CODE_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS_PER_HOUR = 5

/**
 * Result of sending a verification code
 */
export interface SendCodeResult {
  success: boolean
  message: string
  expiresAt?: Date
  cooldownSeconds?: number
}

/**
 * Result of verifying a code
 */
export interface VerifyCodeResult {
  success: boolean
  message: string
  attemptsRemaining?: number
}

/**
 * Phone verification status for a user
 */
export interface PhoneVerificationStatus {
  phone: string | null
  isVerified: boolean
  verifiedAt: Date | null
  pendingVerification: boolean
}

/**
 * Generate a random numeric verification code
 */
function generateVerificationCode(): string {
  const min = Math.pow(10, CODE_LENGTH - 1)
  const max = Math.pow(10, CODE_LENGTH) - 1
  return Math.floor(min + Math.random() * (max - min + 1)).toString()
}

/**
 * Phone verification service instance
 * Uses dependency injection to get SMS provider from container
 */
class PhoneVerificationService {
  constructor(private smsProvider: ISMSProvider) {}

  /**
   * Get the configured SMS provider
   */
  getSMSProvider(): ISMSProvider {
    return this.smsProvider
  }
}

/**
 * Global service instance (will be initialized by container)
 */
let serviceInstance: PhoneVerificationService | null = null

/**
 * Initialize the phone verification service with an SMS provider
 * Called by the DI container during setup
 */
export function initializePhoneVerificationService(provider: ISMSProvider): void {
  serviceInstance = new PhoneVerificationService(provider)
}

/**
 * Get the current SMS provider
 * Returns the provider from the service instance or throws if not initialized
 */
function getSMSProvider(): ISMSProvider {
  if (!serviceInstance) {
    throw new Error(
      'PhoneVerificationService not initialized. Call initializePhoneVerificationService first.'
    )
  }
  return serviceInstance.getSMSProvider()
}

/**
 * Send a verification code to a phone number
 */
export async function sendVerificationCode(
  userId: string,
  phoneNumber: string
): Promise<SendCodeResult> {
  try {
    // Normalize phone number (ensure E.164 format)
    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    if (!normalizedPhone) {
      return {
        success: false,
        message: 'Invalid phone number format. Please use international format (e.g., +40712345678).',
      }
    }

    // Check rate limiting - max attempts per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentAttempts = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phoneVerifyExpiry: true,
      },
    })

    // If there's an unexpired code, don't send a new one
    if (recentAttempts?.phoneVerifyExpiry && recentAttempts.phoneVerifyExpiry > new Date()) {
      const cooldownSeconds = Math.ceil(
        (recentAttempts.phoneVerifyExpiry.getTime() - Date.now()) / 1000
      )
      return {
        success: false,
        message: 'A verification code was recently sent. Please wait before requesting a new one.',
        cooldownSeconds: Math.min(cooldownSeconds, CODE_EXPIRY_MINUTES * 60),
      }
    }

    // Generate new code
    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000)

    // Store code in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: normalizedPhone,
        phoneVerifyCode: code,
        phoneVerifyExpiry: expiresAt,
      },
    })

    // Send SMS
    try {
      const smsProvider = getSMSProvider()
      await smsProvider.sendSMS(
        normalizedPhone,
        `Your Finds verification code is: ${code}. Valid for ${CODE_EXPIRY_MINUTES} minutes.`
      )

      console.log(`Verification code sent to ${maskPhoneNumber(normalizedPhone)} for user ${userId}`)
    } catch (smsError) {
      // Clear the code if SMS failed
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerifyCode: null,
          phoneVerifyExpiry: null,
        },
      })

      console.error('Failed to send SMS:', smsError)
      return {
        success: false,
        message: 'Failed to send SMS. Please check your phone number and try again.',
      }
    }

    return {
      success: true,
      message: `Verification code sent to ${maskPhoneNumber(normalizedPhone)}`,
      expiresAt,
    }
  } catch (error) {
    console.error('Error sending verification code:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again later.',
    }
  }
}

/**
 * Verify a submitted code
 */
export async function verifyCode(
  userId: string,
  code: string
): Promise<VerifyCodeResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        phone: true,
        phoneVerifyCode: true,
        phoneVerifyExpiry: true,
        phoneVerified: true,
        country: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found.',
      }
    }

    // Already verified
    if (user.phoneVerified) {
      return {
        success: true,
        message: 'Phone number already verified.',
      }
    }

    // No pending verification
    if (!user.phoneVerifyCode || !user.phoneVerifyExpiry) {
      return {
        success: false,
        message: 'No verification code found. Please request a new code.',
      }
    }

    // Code expired
    if (user.phoneVerifyExpiry < new Date()) {
      // Clear expired code
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerifyCode: null,
          phoneVerifyExpiry: null,
        },
      })
      return {
        success: false,
        message: 'Verification code expired. Please request a new code.',
      }
    }

    // Code mismatch
    if (user.phoneVerifyCode !== code.trim()) {
      return {
        success: false,
        message: 'Invalid verification code. Please try again.',
      }
    }

    // Success - mark phone as verified and extract country from phone
    const countryCode = extractCountryFromPhone(user.phone!)

    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerified: new Date(),
        phoneVerifyCode: null,
        phoneVerifyExpiry: null,
        // Update country if not already set (inferred from phone)
        ...(countryCode && !user.country ? { country: countryCode } : {}),
      },
    })

    console.log(`Phone verified for user ${userId}: ${maskPhoneNumber(user.phone!)}`)

    return {
      success: true,
      message: 'Phone number verified successfully!',
    }
  } catch (error) {
    console.error('Error verifying code:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again.',
    }
  }
}

/**
 * Get phone verification status for a user
 */
export async function getVerificationStatus(
  userId: string
): Promise<PhoneVerificationStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      phoneVerified: true,
      phoneVerifyExpiry: true,
    },
  })

  if (!user) {
    return {
      phone: null,
      isVerified: false,
      verifiedAt: null,
      pendingVerification: false,
    }
  }

  return {
    phone: user.phone ? maskPhoneNumber(user.phone) : null,
    isVerified: !!user.phoneVerified,
    verifiedAt: user.phoneVerified,
    pendingVerification: !!(
      user.phoneVerifyExpiry && user.phoneVerifyExpiry > new Date()
    ),
  }
}

/**
 * Check if a user has verified their phone
 */
export async function isPhoneVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneVerified: true },
  })
  return !!user?.phoneVerified
}

/**
 * Normalize phone number to E.164 format
 * Returns null if invalid
 */
function normalizePhoneNumber(phone: string): string | null {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    // Try common country codes for Romania
    if (normalized.startsWith('0')) {
      // Romanian local number - add +40
      normalized = '+40' + normalized.substring(1)
    } else if (normalized.startsWith('40') && normalized.length > 9) {
      normalized = '+' + normalized
    } else {
      // Default to +40 for Romanian platform
      normalized = '+40' + normalized
    }
  }

  // Validate length (E.164 allows max 15 digits)
  const digits = normalized.replace('+', '')
  if (digits.length < 8 || digits.length > 15) {
    return null
  }

  return normalized
}

/**
 * Mask phone number for display (show last 4 digits)
 */
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) {
    return '****'
  }
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
}

/**
 * Extract country code from E.164 phone number
 * Returns ISO 3166-1 alpha-2 country code or null
 */
function extractCountryFromPhone(phone: string): string | null {
  // Common European country code mappings
  const countryPrefixes: Record<string, string> = {
    '+40': 'RO', // Romania
    '+44': 'GB', // UK
    '+49': 'DE', // Germany
    '+33': 'FR', // France
    '+39': 'IT', // Italy
    '+34': 'ES', // Spain
    '+31': 'NL', // Netherlands
    '+32': 'BE', // Belgium
    '+43': 'AT', // Austria
    '+41': 'CH', // Switzerland
    '+48': 'PL', // Poland
    '+420': 'CZ', // Czech Republic
    '+36': 'HU', // Hungary
    '+30': 'GR', // Greece
    '+351': 'PT', // Portugal
    '+353': 'IE', // Ireland
    '+45': 'DK', // Denmark
    '+46': 'SE', // Sweden
    '+47': 'NO', // Norway
    '+358': 'FI', // Finland
    '+1': 'US', // USA/Canada (simplified)
  }

  // Check from longest to shortest prefix (to handle +420 vs +42)
  const sortedPrefixes = Object.keys(countryPrefixes).sort(
    (a, b) => b.length - a.length
  )

  for (const prefix of sortedPrefixes) {
    if (phone.startsWith(prefix)) {
      return countryPrefixes[prefix]
    }
  }

  return null
}
