/**
 * Admin Authorization Helper
 *
 * Centralized authorization utilities for admin routes.
 * Provides reusable functions to check user roles and permissions.
 */

import { Session } from 'next-auth'
import { Role } from '@prisma/client'
import { prisma } from './db'
import { ForbiddenError, UnauthorizedError } from './errors'
import { ERROR_CODES } from './error-codes'

/**
 * User object returned after successful authorization
 */
export type AuthorizedUser = {
  id: string
  email: string | null
  role: Role
}

/**
 * Require that the user has one of the allowed roles
 *
 * @param session - Auth.js session object
 * @param allowedRoles - Array of roles that are permitted
 * @returns The authorized user object with role information
 * @throws UnauthorizedError if no session exists
 * @throws ForbiddenError if user doesn't have required role
 *
 * @example
 * const user = await requireAdminRole(session, ['ADMIN', 'MODERATOR'])
 * // user.role is guaranteed to be ADMIN or MODERATOR
 */
export async function requireAdminRole(
  session: Session | null,
  allowedRoles: Role[]
): Promise<AuthorizedUser> {
  // Check if user is authenticated
  if (!session?.user) {
    throw new UnauthorizedError(
      'You must be logged in',
      ERROR_CODES.AUTH_REQUIRED
    )
  }

  // Fetch user role from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true
    },
  })

  // Verify user exists
  if (!user) {
    throw new UnauthorizedError(
      'User not found',
      ERROR_CODES.AUTH_REQUIRED
    )
  }

  // Check if user has one of the allowed roles
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
      {
        userRole: user.role,
        requiredRoles: allowedRoles
      }
    )
  }

  return user
}

/**
 * Check if user is an admin
 * Convenience wrapper for requireAdminRole
 */
export async function requireAdmin(session: Session | null): Promise<AuthorizedUser> {
  return requireAdminRole(session, ['ADMIN'])
}

/**
 * Check if user is admin or moderator
 * Convenience wrapper for requireAdminRole
 */
export async function requireAdminOrModerator(session: Session | null): Promise<AuthorizedUser> {
  return requireAdminRole(session, ['ADMIN', 'MODERATOR'])
}

/**
 * Check if user has review privileges (admin, moderator, or reviewer)
 * Convenience wrapper for requireAdminRole
 */
export async function requireReviewer(session: Session | null): Promise<AuthorizedUser> {
  return requireAdminRole(session, ['ADMIN', 'MODERATOR', 'REVIEWER'])
}
