import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null
let fromEmail: string | null = null
const appUrl: string = 'http://localhost:3000'

function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not defined in environment variables')
    }
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

function getFromEmail(): string {
  if (!fromEmail) {
    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM is not defined in environment variables')
    }
    fromEmail = process.env.EMAIL_FROM
  }
  return fromEmail
}

function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || appUrl
}

/**
 * Send verification email to newly registered users
 * @param email - The recipient's email address
 * @param token - The verification token
 * @returns Promise resolving to the Resend API response
 */
export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${getAppUrl()}/verify-email?token=${token}`

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
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
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
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

/**
 * Send license plate detection notification email
 * @param email - The seller's email address
 * @param listingTitle - The title of the listing
 * @param plateCount - Number of license plates detected
 * @param wasBlurred - Whether the plates were automatically blurred
 * @param listingUrl - URL to view the listing
 * @returns Promise resolving to the Resend API response
 */
export async function sendLicensePlateDetectionEmail(
  email: string,
  listingTitle: string,
  plateCount: number,
  wasBlurred: boolean,
  listingUrl: string
) {
  const subject = wasBlurred
    ? 'License Plates Auto-Blurred in Your Listing - Finds'
    : 'License Plates Detected in Your Listing - Finds'

  const pluralPlate = plateCount > 1 ? 'plates' : 'plate'
  const pluralThem = plateCount > 1 ? 'them' : 'it'

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">License ${pluralPlate === 'plates' ? 'Plates' : 'Plate'} ${wasBlurred ? 'Auto-Blurred' : 'Detected'}</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                We detected <strong>${plateCount} license ${pluralPlate}</strong> in one of the photos for your listing:
              </p>

              <p style="font-size: 16px; margin-bottom: 20px; font-weight: 600;">
                "${listingTitle}"
              </p>

              ${wasBlurred ? `
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 15px; color: #2e7d32;">
                  <strong>Privacy Protection:</strong> We've automatically blurred the license ${pluralPlate} to protect privacy. The blurred version is now displayed to all buyers.
                </p>
              </div>

              <p style="font-size: 15px; margin-bottom: 20px;">
                The original unblurred image is safely stored and only accessible to you and our administrators. No action is required on your part.
              </p>
              ` : `
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 15px; color: #856404;">
                  <strong>Please Review:</strong> We detected license ${pluralPlate} but couldn't automatically blur ${pluralThem}. Please review your listing and consider updating the image.
                </p>
              </div>
              `}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${listingUrl}"
                   style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  View Your Listing
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                This is an automated notification to help you maintain privacy and comply with data protection regulations. We use AI-powered license plate detection to protect both sellers and buyers.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `License ${pluralPlate === 'plates' ? 'Plates' : 'Plate'} ${wasBlurred ? 'Auto-Blurred' : 'Detected'}

We detected ${plateCount} license ${pluralPlate} in one of the photos for your listing:

"${listingTitle}"

${wasBlurred
  ? `Privacy Protection: We've automatically blurred the license ${pluralPlate} to protect privacy. The blurred version is now displayed to all buyers.

The original unblurred image is safely stored and only accessible to you and our administrators. No action is required on your part.`
  : `Please Review: We detected license ${pluralPlate} but couldn't automatically blur ${pluralThem}. Please review your listing and consider updating the image.`}

View your listing: ${listingUrl}

This is an automated notification to help you maintain privacy and comply with data protection regulations.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send license plate detection email:', error)
    throw new Error('Failed to send license plate detection email')
  }
}

/**
 * Send auction won email to the winning bidder
 * @param to - The winner's email address
 * @param name - The winner's name
 * @param auctionTitle - The title of the auction
 * @param finalPrice - The final hammer price
 * @param currency - The currency code (e.g., 'EUR')
 * @param auctionUrl - URL to view the auction and complete payment
 * @returns Promise resolving to the Resend API response
 */
export async function sendAuctionWonEmail(
  to: string,
  name: string,
  auctionTitle: string,
  finalPrice: number,
  currency: string,
  auctionUrl: string
) {
  const buyerFee = finalPrice * 0.05
  const totalAmount = finalPrice + buyerFee

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Congratulations! You Won: ${auctionTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You Won the Auction!</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Congratulations, ${name}!</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                You are the winning bidder for:
              </p>

              <p style="font-size: 18px; margin-bottom: 30px; font-weight: 600; color: #1a1a1a;">
                "${auctionTitle}"
              </p>

              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px; color: #2e7d32;">Winning Bid:</td>
                    <td style="padding: 8px 0; font-size: 15px; color: #2e7d32; text-align: right; font-weight: 600;">${formatCurrency(finalPrice)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px; color: #2e7d32;">Buyer Fee (5%):</td>
                    <td style="padding: 8px 0; font-size: 15px; color: #2e7d32; text-align: right; font-weight: 600;">${formatCurrency(buyerFee)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #4caf50;">
                    <td style="padding: 12px 0 8px 0; font-size: 17px; color: #1a1a1a; font-weight: 700;">Total Amount:</td>
                    <td style="padding: 12px 0 8px 0; font-size: 17px; color: #1a1a1a; text-align: right; font-weight: 700;">${formatCurrency(totalAmount)}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 15px; margin: 20px 0;">
                Please complete your payment within the next 7 days to secure your winning purchase. We'll connect you with the seller to arrange collection or delivery.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${auctionUrl}"
                   style="background-color: #4caf50; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Complete Payment
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                Questions? Our team is here to help with the payment and collection process. Simply reply to this email or contact us through your account dashboard.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Congratulations, ${name}!

You are the winning bidder for: "${auctionTitle}"

Winning Bid: ${formatCurrency(finalPrice)}
Buyer Fee (5%): ${formatCurrency(buyerFee)}
Total Amount: ${formatCurrency(totalAmount)}

Please complete your payment within the next 7 days to secure your winning purchase. We'll connect you with the seller to arrange collection or delivery.

Complete payment here: ${auctionUrl}

Questions? Our team is here to help with the payment and collection process.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send auction won email:', error)
    throw new Error('Failed to send auction won email')
  }
}

/**
 * Send auction lost email to unsuccessful bidder
 * @param to - The bidder's email address
 * @param name - The bidder's name
 * @param auctionTitle - The title of the auction
 * @param finalPrice - The final hammer price
 * @param currency - The currency code (e.g., 'EUR')
 * @returns Promise resolving to the Resend API response
 */
export async function sendAuctionLostEmail(
  to: string,
  name: string,
  auctionTitle: string,
  finalPrice: number,
  currency: string
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Auction Ended: ${auctionTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Auction Ended</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Thanks for Bidding, ${name}</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                The auction for <strong>"${auctionTitle}"</strong> has ended.
              </p>

              <p style="font-size: 15px; margin-bottom: 20px;">
                Unfortunately, you were not the winning bidder this time. The auction closed at <strong>${formatCurrency(finalPrice)}</strong>.
              </p>

              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 15px; color: #1565c0;">
                  <strong>Don't give up!</strong> New classic cars and collector vehicles are listed daily on Finds. Your perfect find might be just around the corner.
                </p>
              </div>

              <p style="font-size: 15px; margin: 20px 0;">
                We appreciate your participation and hope to see you bidding again soon. Keep an eye on our latest auctions to discover more incredible vehicles.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${getAppUrl()}/auctions"
                   style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Browse Active Auctions
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                Thank you for being part of the Finds community. Happy hunting!
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Thanks for Bidding, ${name}

The auction for "${auctionTitle}" has ended.

Unfortunately, you were not the winning bidder this time. The auction closed at ${formatCurrency(finalPrice)}.

Don't give up! New classic cars and collector vehicles are listed daily on Finds. Your perfect find might be just around the corner.

We appreciate your participation and hope to see you bidding again soon.

Browse active auctions: ${getAppUrl()}/auctions

Thank you for being part of the Finds community. Happy hunting!

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send auction lost email:', error)
    throw new Error('Failed to send auction lost email')
  }
}

/**
 * Send listing approved email to seller
 * @param to - The seller's email address
 * @param name - The seller's name
 * @param listingTitle - The title of the listing
 * @param auctionUrl - URL to view the live auction
 * @returns Promise resolving to the Resend API response
 */
export async function sendListingApprovedEmail(
  to: string,
  name: string,
  listingTitle: string,
  auctionUrl: string
) {
  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Your Listing is Live: ${listingTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Listing is Live!</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Great News, ${name}!</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Your listing has been approved and is now live on Finds:
              </p>

              <p style="font-size: 18px; margin-bottom: 30px; font-weight: 600; color: #1a1a1a;">
                "${listingTitle}"
              </p>

              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-size: 15px; color: #2e7d32;">
                  <strong>Your auction is now visible to buyers!</strong> Interested bidders can view your listing, ask questions, and place bids.
                </p>
              </div>

              <p style="font-size: 15px; margin: 20px 0;">
                Watch your auction come to life as collectors and enthusiasts discover your vehicle. You'll receive notifications for new bids and questions from potential buyers.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${auctionUrl}"
                   style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  View Your Live Auction
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
                <strong>What happens next?</strong>
              </p>
              <ul style="font-size: 14px; color: #666; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Monitor bidding activity in real-time</li>
                <li style="margin-bottom: 8px;">Respond to buyer questions promptly</li>
                <li style="margin-bottom: 8px;">After the auction ends, we'll connect you with the winning bidder</li>
                <li style="margin-bottom: 8px;">No seller fees - you keep your full hammer price</li>
              </ul>

              <p style="font-size: 13px; color: #999; margin-top: 30px;">
                Questions? We're here to help. Reply to this email or contact us through your seller dashboard.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Great News, ${name}!

Your listing has been approved and is now live on Finds:

"${listingTitle}"

Your auction is now visible to buyers! Interested bidders can view your listing, ask questions, and place bids.

Watch your auction come to life as collectors and enthusiasts discover your vehicle. You'll receive notifications for new bids and questions from potential buyers.

View your live auction: ${auctionUrl}

What happens next?
- Monitor bidding activity in real-time
- Respond to buyer questions promptly
- After the auction ends, we'll connect you with the winning bidder
- No seller fees - you keep your full hammer price

Questions? We're here to help.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send listing approved email:', error)
    throw new Error('Failed to send listing approved email')
  }
}

/**
 * Send listing rejected email to seller
 * @param to - The seller's email address
 * @param name - The seller's name
 * @param listingTitle - The title of the listing
 * @param reason - The reason for rejection
 * @returns Promise resolving to the Resend API response
 */
export async function sendListingRejectedEmail(
  to: string,
  name: string,
  listingTitle: string,
  reason: string
) {
  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Listing Not Approved: ${listingTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Listing Not Approved</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Listing Update</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Dear ${name},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Thank you for submitting your listing for:
              </p>

              <p style="font-size: 18px; margin-bottom: 30px; font-weight: 600; color: #1a1a1a;">
                "${listingTitle}"
              </p>

              <p style="font-size: 15px; margin-bottom: 20px;">
                After careful review, we're unable to approve this listing for auction at this time.
              </p>

              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #856404; font-weight: 600;">
                  Reason for rejection:
                </p>
                <p style="margin: 0; font-size: 15px; color: #856404;">
                  ${reason}
                </p>
              </div>

              <p style="font-size: 15px; margin: 20px 0;">
                Our goal is to maintain the highest quality standards for all listings on Finds. If you have questions about this decision or would like guidance on resubmitting, please don't hesitate to reach out.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${getAppUrl()}/sell"
                   style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Submit Another Listing
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                We appreciate your interest in selling with Finds. If you'd like to discuss this decision or need assistance, please reply to this email or contact our support team.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Listing Update

Dear ${name},

Thank you for submitting your listing for: "${listingTitle}"

After careful review, we're unable to approve this listing for auction at this time.

Reason for rejection:
${reason}

Our goal is to maintain the highest quality standards for all listings on Finds. If you have questions about this decision or would like guidance on resubmitting, please don't hesitate to reach out.

Submit another listing: ${getAppUrl()}/sell

We appreciate your interest in selling with Finds.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send listing rejected email:', error)
    throw new Error('Failed to send listing rejected email')
  }
}

/**
 * Send listing changes requested email to seller
 * @param to - The seller's email address
 * @param name - The seller's name
 * @param listingTitle - The title of the listing
 * @param changes - The requested changes
 * @param editUrl - URL to edit the listing
 * @returns Promise resolving to the Resend API response
 */
export async function sendListingChangesRequestedEmail(
  to: string,
  name: string,
  listingTitle: string,
  changes: string,
  editUrl: string
) {
  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Changes Requested: ${listingTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Changes Requested</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #1a1a1a; margin-bottom: 20px;">Action Required: Update Your Listing</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Dear ${name},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                We've reviewed your listing for:
              </p>

              <p style="font-size: 18px; margin-bottom: 30px; font-weight: 600; color: #1a1a1a;">
                "${listingTitle}"
              </p>

              <p style="font-size: 15px; margin-bottom: 20px;">
                Your listing is almost ready to go live! We just need you to make a few updates before we can approve it.
              </p>

              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #1565c0; font-weight: 600;">
                  Requested changes:
                </p>
                <p style="margin: 0; font-size: 15px; color: #1565c0; white-space: pre-line;">
                  ${changes}
                </p>
              </div>

              <p style="font-size: 15px; margin: 20px 0;">
                Once you've made these updates, our team will review your listing again. We aim to review resubmissions within 24 hours.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${editUrl}"
                   style="background-color: #2196f3; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  Edit Your Listing
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                Questions about the requested changes? Reply to this email and our team will be happy to help clarify.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Action Required: Update Your Listing

Dear ${name},

We've reviewed your listing for: "${listingTitle}"

Your listing is almost ready to go live! We just need you to make a few updates before we can approve it.

Requested changes:
${changes}

Once you've made these updates, our team will review your listing again. We aim to review resubmissions within 24 hours.

Edit your listing: ${editUrl}

Questions about the requested changes? Reply to this email and our team will be happy to help clarify.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send listing changes requested email:', error)
    throw new Error('Failed to send listing changes requested email')
  }
}

/**
 * Send payment complete email to buyer with seller contact details
 * This is sent after the buyer fee is paid - the key moment for contact exchange
 */
export async function sendPaymentCompleteEmail(
  to: string,
  buyerName: string,
  vehicleTitle: string,
  finalPrice: number,
  currency: string,
  seller: { name: string; email: string; phone?: string }
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Payment Complete - Seller Contact for ${vehicleTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Complete - Seller Contact</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #4caf50; margin-bottom: 20px;">Payment Complete!</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${buyerName},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Your payment for <strong>"${vehicleTitle}"</strong> has been received. You can now contact the seller directly to arrange collection or delivery.
              </p>

              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #2e7d32;">Seller Contact Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px;"><strong>Name:</strong></td>
                    <td style="padding: 8px 0; font-size: 15px;">${seller.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px;"><strong>Email:</strong></td>
                    <td style="padding: 8px 0; font-size: 15px;"><a href="mailto:${seller.email}" style="color: #1565c0;">${seller.email}</a></td>
                  </tr>
                  ${seller.phone ? `
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px;"><strong>Phone:</strong></td>
                    <td style="padding: 8px 0; font-size: 15px;"><a href="tel:${seller.phone}" style="color: #1565c0;">${seller.phone}</a></td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #e65100;">Purchase Summary</h3>
                <p style="margin: 0; font-size: 15px;">
                  Vehicle: ${vehicleTitle}<br>
                  Amount: <strong>${formatCurrency(finalPrice)}</strong>
                </p>
              </div>

              <h3 style="color: #1a1a1a; margin-top: 30px;">Next Steps</h3>
              <ol style="padding-left: 20px; margin-bottom: 20px;">
                <li style="margin-bottom: 10px;">Contact the seller to arrange a viewing and collection time</li>
                <li style="margin-bottom: 10px;">Inspect the vehicle before finalizing the transaction</li>
                <li style="margin-bottom: 10px;">Arrange payment directly with the seller</li>
                <li style="margin-bottom: 10px;">Complete the ownership transfer paperwork</li>
              </ol>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                If you have any issues with the transaction, please contact our support team.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Payment Complete - Seller Contact Details

Hi ${buyerName},

Your payment for "${vehicleTitle}" has been received. You can now contact the seller directly.

SELLER CONTACT DETAILS:
Name: ${seller.name}
Email: ${seller.email}
${seller.phone ? `Phone: ${seller.phone}` : ''}

PURCHASE SUMMARY:
Vehicle: ${vehicleTitle}
Amount: ${formatCurrency(finalPrice)}

NEXT STEPS:
1. Contact the seller to arrange a viewing and collection time
2. Inspect the vehicle before finalizing the transaction
3. Arrange payment directly with the seller
4. Complete the ownership transfer paperwork

If you have any issues with the transaction, please contact our support team.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send payment complete email:', error)
    throw new Error('Failed to send payment complete email')
  }
}

/**
 * Send payment received email to seller with buyer contact details
 * This is sent after the buyer fee is paid
 */
export async function sendPaymentReceivedEmail(
  to: string,
  sellerName: string,
  vehicleTitle: string,
  finalPrice: number,
  currency: string,
  buyer: { name: string; email: string; phone?: string }
) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  try {
    const data = await getResendClient().emails.send({
      from: getFromEmail(),
      to,
      subject: `Buyer Payment Complete - ${vehicleTitle} - Finds`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Buyer Payment Complete</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
              <h1 style="color: #4caf50; margin-bottom: 20px;">Payment Received!</h1>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Hi ${sellerName},
              </p>

              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! The buyer has completed their payment for <strong>"${vehicleTitle}"</strong>. You can now contact them to arrange handover.
              </p>

              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 15px 0; color: #1565c0;">Buyer Contact Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px;"><strong>Name:</strong></td>
                    <td style="padding: 8px 0; font-size: 15px;">${buyer.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px;"><strong>Email:</strong></td>
                    <td style="padding: 8px 0; font-size: 15px;"><a href="mailto:${buyer.email}" style="color: #1565c0;">${buyer.email}</a></td>
                  </tr>
                  ${buyer.phone ? `
                  <tr>
                    <td style="padding: 8px 0; font-size: 15px;"><strong>Phone:</strong></td>
                    <td style="padding: 8px 0; font-size: 15px;"><a href="tel:${buyer.phone}" style="color: #1565c0;">${buyer.phone}</a></td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px 0; color: #2e7d32;">Sale Summary</h3>
                <p style="margin: 0; font-size: 15px;">
                  Vehicle: ${vehicleTitle}<br>
                  Sale Price: <strong>${formatCurrency(finalPrice)}</strong>
                </p>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
                  Your payout will be processed within 2-3 business days after the sale is finalized.
                </p>
              </div>

              <h3 style="color: #1a1a1a; margin-top: 30px;">Next Steps</h3>
              <ol style="padding-left: 20px; margin-bottom: 20px;">
                <li style="margin-bottom: 10px;">Contact the buyer to arrange handover</li>
                <li style="margin-bottom: 10px;">Prepare the vehicle and documentation</li>
                <li style="margin-bottom: 10px;">Meet with the buyer and complete the sale</li>
                <li style="margin-bottom: 10px;">Ensure all ownership transfer paperwork is completed</li>
              </ol>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

              <p style="font-size: 13px; color: #999;">
                If you have any issues with the transaction, please contact our support team.
              </p>

              <p style="font-size: 13px; color: #999; margin-top: 20px;">
                Best regards,<br>
                The Finds Team
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Buyer Payment Complete

Hi ${sellerName},

Great news! The buyer has completed their payment for "${vehicleTitle}". You can now contact them to arrange handover.

BUYER CONTACT DETAILS:
Name: ${buyer.name}
Email: ${buyer.email}
${buyer.phone ? `Phone: ${buyer.phone}` : ''}

SALE SUMMARY:
Vehicle: ${vehicleTitle}
Sale Price: ${formatCurrency(finalPrice)}

Your payout will be processed within 2-3 business days after the sale is finalized.

NEXT STEPS:
1. Contact the buyer to arrange handover
2. Prepare the vehicle and documentation
3. Meet with the buyer and complete the sale
4. Ensure all ownership transfer paperwork is completed

If you have any issues with the transaction, please contact our support team.

Best regards,
The Finds Team`,
    })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send payment received email:', error)
    throw new Error('Failed to send payment received email')
  }
}
