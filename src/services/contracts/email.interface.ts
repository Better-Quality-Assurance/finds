/**
 * Email send result
 */
export type EmailResult = {
  success: boolean
  data?: unknown
}

/**
 * Interface for email service
 * Handles transactional emails via Resend
 */
export interface IEmailService {
  /**
   * Send verification email to newly registered users
   */
  sendVerificationEmail(email: string, token: string): Promise<EmailResult>

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: string, token: string): Promise<EmailResult>
}
