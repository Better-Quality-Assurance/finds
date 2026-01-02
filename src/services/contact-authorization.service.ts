/**
 * Contact Authorization Service
 *
 * Centralized service for contact revelation authorization.
 * Implements the business rule: contact details only revealed after
 * buyer wins auction AND pays the 5% fee.
 *
 * SOLID: Single Responsibility - only handles contact authorization
 * DIP: Can be injected/mocked for testing
 */

import { prisma } from '@/lib/db'
import { logAuditEvent } from '@/services/audit.service'

// ============================================================================
// Types
// ============================================================================

export interface ContactAuthorizationResult {
  authorized: boolean
  reason: 'not_winner' | 'not_paid' | 'authorized' | 'no_auction'
  auctionId?: string
  auctionStatus?: string
  paymentStatus?: string
}

export interface MaskedContact {
  email: string
  phone: string | null
  contactRevealed: boolean
}

// ============================================================================
// Core Authorization
// ============================================================================

/**
 * Check if contact details can be revealed between buyer and seller.
 *
 * Rules:
 * 1. Auction must be in SOLD status
 * 2. User must be the auction winner
 * 3. Payment status must be PAID
 *
 * @param buyerId - The buyer's user ID (potential winner)
 * @param listingId - The listing ID to check
 * @returns Authorization result with reason
 */
export async function canRevealContact(
  buyerId: string,
  listingId: string
): Promise<ContactAuthorizationResult> {
  const auction = await prisma.auction.findFirst({
    where: { listingId },
    select: {
      id: true,
      status: true,
      winnerId: true,
      paymentStatus: true,
    },
  })

  if (!auction) {
    return { authorized: false, reason: 'no_auction' }
  }

  if (auction.winnerId !== buyerId) {
    return {
      authorized: false,
      reason: 'not_winner',
      auctionId: auction.id,
      auctionStatus: auction.status,
    }
  }

  if (auction.status !== 'SOLD' || auction.paymentStatus !== 'PAID') {
    return {
      authorized: false,
      reason: 'not_paid',
      auctionId: auction.id,
      auctionStatus: auction.status,
      paymentStatus: auction.paymentStatus || undefined,
    }
  }

  return {
    authorized: true,
    reason: 'authorized',
    auctionId: auction.id,
    auctionStatus: auction.status,
    paymentStatus: auction.paymentStatus,
  }
}

/**
 * Simple boolean check for backward compatibility
 */
export async function canSeeContactDetails(
  buyerId: string,
  listingId: string
): Promise<boolean> {
  const result = await canRevealContact(buyerId, listingId)
  return result.authorized
}

// ============================================================================
// Contact Masking
// ============================================================================

/**
 * Mask email for privacy - show first char + domain only
 * e.g., "john.doe@example.com" -> "j***@example.com"
 */
export function maskEmail(email: string): string {
  if (!email) {return '***@***.com'}
  const [local, domain] = email.split('@')
  if (!domain) {return '***@***.com'}
  const maskedLocal = local.length > 1 ? local[0] + '***' : '***'
  return `${maskedLocal}@${domain}`
}

/**
 * Get masked or revealed contact based on authorization
 */
export function getContactInfo(
  email: string,
  phone: string | null,
  authorized: boolean
): MaskedContact {
  return {
    email: authorized ? email : maskEmail(email),
    phone: authorized ? phone : null,
    contactRevealed: authorized,
  }
}

// ============================================================================
// Audit Logging for Fee Protection
// ============================================================================

export type FeeProtectionEvent =
  | 'MESSAGING_BLOCKED'
  | 'CONVERSATION_BLOCKED'
  | 'CONTACT_INFO_DETECTED'
  | 'CONTACT_REVEALED'

interface FeeProtectionAuditParams {
  event: FeeProtectionEvent
  userId: string
  userEmail?: string
  listingId?: string
  auctionId?: string
  ip?: string
  userAgent?: string
  details?: Record<string, unknown>
}

/**
 * Log fee protection security events for audit trail
 */
export async function logFeeProtectionEvent(
  params: FeeProtectionAuditParams
): Promise<void> {
  const { event, userId, userEmail, listingId, auctionId, ip, userAgent, details } = params

  const severityMap: Record<FeeProtectionEvent, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
    MESSAGING_BLOCKED: 'MEDIUM',
    CONVERSATION_BLOCKED: 'MEDIUM',
    CONTACT_INFO_DETECTED: 'HIGH',
    CONTACT_REVEALED: 'LOW',
  }

  const actionMap: Record<FeeProtectionEvent, string> = {
    MESSAGING_BLOCKED: 'fee_protection.messaging_blocked',
    CONVERSATION_BLOCKED: 'fee_protection.conversation_blocked',
    CONTACT_INFO_DETECTED: 'fee_protection.contact_detected',
    CONTACT_REVEALED: 'fee_protection.contact_revealed',
  }

  try {
    await logAuditEvent({
      actorId: userId,
      actorEmail: userEmail,
      actorIp: ip || 'unknown',
      actorUserAgent: userAgent || 'unknown',
      action: actionMap[event],
      resourceType: listingId ? 'LISTING' : 'USER',
      resourceId: listingId || auctionId || userId,
      details: {
        event,
        listingId,
        auctionId,
        ...details,
      },
      severity: severityMap[event],
    })
  } catch (error) {
    // Don't fail the request if audit logging fails, but log error
    console.error('Failed to log fee protection event:', error)
  }
}

// ============================================================================
// Batch Operations (for N+1 optimization)
// ============================================================================

/**
 * Check contact authorization for multiple listings at once
 * Optimizes the N+1 query problem in conversation lists
 */
export async function canRevealContactBatch(
  buyerId: string,
  listingIds: string[]
): Promise<Map<string, boolean>> {
  const auctions = await prisma.auction.findMany({
    where: {
      listingId: { in: listingIds },
      status: 'SOLD',
      winnerId: buyerId,
      paymentStatus: 'PAID',
    },
    select: {
      listingId: true,
    },
  })

  const authorizedListings = new Set(auctions.map(a => a.listingId))
  const result = new Map<string, boolean>()

  for (const listingId of listingIds) {
    result.set(listingId, authorizedListings.has(listingId))
  }

  return result
}
