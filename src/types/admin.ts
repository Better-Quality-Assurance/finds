// Admin dashboard type definitions
// Centralized types for admin interfaces, user management, fraud detection, audit logs

/**
 * User role types
 */
export type UserRole = 'USER' | 'SELLER' | 'MODERATOR' | 'REVIEWER' | 'ADMIN'

/**
 * User data for admin management
 */
export type UserData = {
  id: string
  email: string
  name: string | null
  role: UserRole
  emailVerified: string | null
  biddingEnabled: boolean
  bannedAt: string | null
  banReason: string | null
  unbannedAt: string | null
  unbanReason: string | null
  createdAt: string
  _count: {
    listings: number
    bids: number
  }
}

/**
 * Listing data for admin review
 */
export type AdminListing = {
  id: string
  title: string
  description: string
  make: string
  model: string
  year: number
  mileage: number | null
  locationCity: string
  locationCountry: string
  startingPrice: unknown // Prisma Decimal type
  reservePrice: unknown // Prisma Decimal type
  currency: string
  status: string
  isRunning: boolean
  conditionRating: number | null
  knownIssues: string | null
  createdAt: string | Date
  seller: {
    id: string
    name: string | null
    email: string
  }
  media: {
    id: string
    publicUrl: string
    type: string
    category: string | null
  }[]
  _count: {
    media: number
  }
}

/**
 * Listing status filter types
 */
export type ListingStatusFilter = 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'ALL'

/**
 * Admin auction status types (for filtering and display)
 */
export type AdminAuctionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXTENDED' | 'ENDED' | 'SOLD' | 'NO_SALE' | 'CANCELLED'

/**
 * Auction data for admin management
 */
export type AdminAuctionData = {
  id: string
  status: AdminAuctionStatus
  currentBid: string | null
  bidCount: number
  startTime: string
  currentEndTime: string
  extensionCount: number
  reserveMet: boolean
  currency: string
  listing: {
    id: string
    title: string
    make: string
    model: string
    year: number
    seller: {
      id: string
      name: string | null
      email: string
    }
  }
  _count: {
    bids: number
    watchlist: number
  }
}

/**
 * Fraud alert severity levels
 */
export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

/**
 * Fraud alert status types
 */
export type FraudAlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'

/**
 * Fraud alert data
 */
export type FraudAlert = {
  id: string
  alertType: string
  severity: FraudSeverity
  status: FraudAlertStatus
  details: Record<string, unknown>
  createdAt: string
  userId: string | null
  auctionId: string | null
  user?: {
    id: string
    name: string | null
    email: string
  } | null
}

/**
 * Fraud detection statistics
 */
export type FraudStats = {
  openAlerts: number
  criticalAlerts: number
  alertsToday: number
  alertsByType: Record<string, number>
}

/**
 * Audit log severity levels
 */
export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null

/**
 * Audit log status types
 */
export type AuditLogStatus = 'SUCCESS' | 'FAILURE' | 'BLOCKED' | null

/**
 * Audit log entry
 */
export type AuditLogEntry = {
  id: string
  createdAt: string
  actorId: string | null
  actorEmail: string | null
  actorIp: string | null
  action: string
  resourceType: string
  resourceId: string | null
  severity: AuditSeverity
  status: AuditLogStatus
  details: Record<string, unknown>
  changes: Record<string, unknown> | null
  errorMessage: string | null
  actor?: {
    id: string
    name: string | null
    email: string
  } | null
}

/**
 * Audit log statistics
 */
export type AuditStats = {
  totalToday: number
  failedToday: number
  highSeverityToday: number
  topActions: Array<{ action: string; count: number }>
}

/**
 * Generic stats record for dashboard metrics
 */
export type DashboardStats = Record<string, number>
