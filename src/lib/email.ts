import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables')
}

if (!process.env.EMAIL_FROM) {
  throw new Error('EMAIL_FROM is not defined in environment variables')
}

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.EMAIL_FROM
const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

/**
 * Send verification email to newly registered users
 * @param email - The recipient's email address
 * @param token - The verification token
 * @returns Promise resolving to the Resend API response
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${appUrl}/verify-email?token=${token}`

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Verify your email address - Finds',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your email</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Welcome to Finds!</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Thank you for creating an account. Please verify your email address to get started with bidding on classic and collector cars.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                   style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Verify Email Address
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #0066cc; word-break: break-all;">
                ${verificationUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                This verification link will expire in 24 hours. If you didn't create an account with Finds, you can safely ignore this email.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Welcome to Finds!

Thank you for creating an account. Please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with Finds, you can safely ignore this email.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    throw new Error('Failed to send verification email')
  }
}

/**
 * Send password reset email
 * @param email - The recipient's email address
 * @param token - The password reset token
 * @returns Promise resolving to the Resend API response
 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your password - Finds',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your password</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Reset Your Password</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                We received a request to reset your password for your Finds account. Click the button below to choose a new password.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Reset Password
                </a>
              </div>

              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="font-size: 14px; color: #0066cc; word-break: break-all;">
                ${resetUrl}
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                This password reset link will expire in 24 hours. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Reset Your Password

We received a request to reset your password for your Finds account. Click the link below to choose a new password:

${resetUrl}

This password reset link will expire in 24 hours.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}
