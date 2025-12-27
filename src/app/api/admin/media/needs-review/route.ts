import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requireReviewer } from '@/lib/admin-auth'
import { getContainer } from '@/lib/container'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

/**
 * GET /api/admin/media/needs-review
 *
 * Fetch all media items flagged for manual review due to license plate blur failures.
 * Admin/Moderator/Reviewer only.
 */
export const GET = withErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()

    // Require reviewer role (ADMIN, MODERATOR, or REVIEWER)
    await requireReviewer(session)

    const container = getContainer()

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Use media review service
    const result = await container.mediaReview.getMediaNeedingReview(page, limit)

    return successResponse(result)
  },
  {
    requiresAuth: true,
    resourceType: 'media',
    action: 'admin.media.list_needs_review',
    auditLog: false,
  }
)

/**
 * PATCH /api/admin/media/needs-review
 *
 * Mark a media item as reviewed (remove manual review flag).
 * Admin/Moderator/Reviewer only.
 */
export const PATCH = withErrorHandler(
  async (request: NextRequest) => {
    const session = await auth()

    // Require reviewer role (ADMIN, MODERATOR, or REVIEWER)
    const user = await requireReviewer(session)

    const body = await request.json()
    const { mediaId, action } = body

    if (!mediaId || !action) {
      throw new ValidationError(
        'mediaId and action are required',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { fields: ['mediaId', 'action'] }
      )
    }

    const container = getContainer()

    // Use media review service based on action
    if (action === 'approve') {
      await container.mediaReview.approveMedia(mediaId, user.id)
    } else if (action === 'blur_manually') {
      if (!body.blurredUrl) {
        throw new ValidationError(
          'blurredUrl is required for manual blur action',
          ERROR_CODES.VALIDATION_INVALID_INPUT,
          { field: 'blurredUrl' }
        )
      }
      await container.mediaReview.markAsBlurred(mediaId, user.id, body.blurredUrl)
    } else if (action === 'reject') {
      await container.mediaReview.rejectMedia(mediaId, user.id)
    } else {
      throw new ValidationError(
        'Invalid action. Must be: approve, blur_manually, or reject',
        ERROR_CODES.VALIDATION_INVALID_INPUT,
        { field: 'action', allowedValues: ['approve', 'blur_manually', 'reject'] }
      )
    }

    return successResponse({
      success: true,
    })
  },
  {
    requiresAuth: true,
    resourceType: 'media',
    action: 'admin.media.review',
    auditLog: true,
  }
)
