import { Role } from '@prisma/client'

/**
 * Role Validator
 *
 * Centralized role validation for permission checks across the application.
 * Implements role-based access control (RBAC) for different admin functions.
 *
 * Role Hierarchy (from highest to lowest):
 * - ADMIN: Full system access, user management, all operations
 * - MODERATOR: Listing/auction management, audit logs, fraud alerts
 * - REVIEWER: Listing approval/rejection only
 * - USER: Standard user, no admin privileges
 */
export class RoleValidator {
  /**
   * Check if user is an administrator
   * Admins have full system access including user management
   */
  isAdmin(role: Role): boolean {
    return role === 'ADMIN'
  }

  /**
   * Check if user is admin or moderator
   * Used for operations requiring elevated privileges
   */
  isAdminOrModerator(role: Role): boolean {
    return ['ADMIN', 'MODERATOR'].includes(role)
  }

  /**
   * Check if user has review privileges
   * Reviewers can approve/reject listings but not manage them further
   */
  isReviewer(role: Role): boolean {
    return ['ADMIN', 'MODERATOR', 'REVIEWER'].includes(role)
  }

  /**
   * Check if user can manage other users
   * Only admins can ban, suspend, or change user roles
   */
  canManageUsers(role: Role): boolean {
    return role === 'ADMIN'
  }

  /**
   * Check if user can manage listings
   * Includes approval, rejection, editing, and deletion
   */
  canManageListings(role: Role): boolean {
    return ['ADMIN', 'MODERATOR', 'REVIEWER'].includes(role)
  }

  /**
   * Check if user can manage auctions
   * Includes starting, pausing, canceling, and extending auctions
   */
  canManageAuctions(role: Role): boolean {
    return ['ADMIN', 'MODERATOR'].includes(role)
  }

  /**
   * Check if user can view audit logs
   * Access to system activity logs and user actions
   */
  canViewAuditLogs(role: Role): boolean {
    return ['ADMIN', 'MODERATOR'].includes(role)
  }

  /**
   * Check if user can view fraud alerts
   * Access to fraud detection and suspicious activity monitoring
   */
  canViewFraudAlerts(role: Role): boolean {
    return ['ADMIN', 'MODERATOR'].includes(role)
  }

  /**
   * Check if user can perform financial operations
   * Includes payment processing, refunds, and fee adjustments
   */
  canManageFinancials(role: Role): boolean {
    return role === 'ADMIN'
  }

  /**
   * Check if user can manage platform settings
   * Includes configuration, feature flags, and system parameters
   */
  canManageSettings(role: Role): boolean {
    return role === 'ADMIN'
  }
}

// Export singleton instance
export const roleValidator = new RoleValidator()
