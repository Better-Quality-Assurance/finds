/**
 * Rate limit configurations for different endpoints
 */

import { RateLimitConfig } from './rate-limiter'

/**
 * Login attempts - Prevent brute force attacks
 * 5 attempts per 15 minutes per IP
 */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
}

/**
 * Password reset requests - Prevent abuse and enumeration
 * 3 attempts per hour per email
 */
export const PASSWORD_RESET_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
}

/**
 * Registration - Prevent spam account creation
 * 5 registrations per hour per IP
 */
export const REGISTRATION_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
}

/**
 * Bid placement - Prevent bid spam and manipulation
 * 30 bids per minute per user
 */
export const BID_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
}

/**
 * General API rate limit - Prevent API abuse
 * 100 requests per minute per IP
 */
export const API_GENERAL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
}

/**
 * Email verification resend - Prevent spam
 * 3 attempts per hour per email
 */
export const EMAIL_VERIFICATION_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
}

/**
 * Watchlist operations - Prevent abuse
 * 20 operations per minute per user
 */
export const WATCHLIST_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
}

/**
 * File upload - Prevent storage abuse
 * 10 uploads per 5 minutes per user
 */
export const UPLOAD_RATE_LIMIT: RateLimitConfig = {
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
}

/**
 * Analytics page view tracking - Prevent abuse
 * 60 page views per minute per session (generous for SPA navigation)
 */
export const PAGE_VIEW_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
}
