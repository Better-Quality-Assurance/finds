import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'

/**
 * GET /api/admin/media/needs-review
 *
 * Fetch all media items flagged for manual review due to license plate blur failures.
 * Admin/Moderator only.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin/moderator permissions
    const userRole = session.user.role
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR' && userRole !== 'REVIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const container = getContainer()

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const skip = (page - 1) * limit

    // Fetch media items needing manual review
    const [mediaItems, totalCount] = await Promise.all([
      container.prisma.listingMedia.findMany({
        where: {
          needsManualReview: true,
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              status: true,
              sellerId: true,
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      container.prisma.listingMedia.count({
        where: {
          needsManualReview: true,
        },
      }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      media: mediaItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Fetch media needing review error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch media items' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/media/needs-review
 *
 * Mark a media item as reviewed (remove manual review flag).
 * Admin/Moderator only.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin/moderator permissions
    const userRole = session.user.role
    if (userRole !== 'ADMIN' && userRole !== 'MODERATOR' && userRole !== 'REVIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { mediaId, action } = body

    if (!mediaId || !action) {
      return NextResponse.json(
        { error: 'mediaId and action are required' },
        { status: 400 }
      )
    }

    const container = getContainer()

    // Verify media exists and needs review
    const media = await container.prisma.listingMedia.findUnique({
      where: { id: mediaId },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    if (!media.needsManualReview) {
      return NextResponse.json(
        { error: 'Media does not need manual review' },
        { status: 400 }
      )
    }

    // Update based on action
    let updateData: any = {
      needsManualReview: false,
    }

    if (action === 'approve') {
      // Admin approved the image as-is (e.g., plate is not visible enough to matter)
      updateData = {
        ...updateData,
        // Keep the original URL, mark as approved
      }
    } else if (action === 'blur_manually') {
      // Admin manually blurred and uploaded a new version
      // This would require additional publicUrl parameter
      if (!body.blurredUrl) {
        return NextResponse.json(
          { error: 'blurredUrl is required for manual blur action' },
          { status: 400 }
        )
      }

      updateData = {
        ...updateData,
        licensePlateBlurred: true,
        originalUrl: media.publicUrl,
        publicUrl: body.blurredUrl,
      }
    } else if (action === 'reject') {
      // Reject the image entirely - could delete or hide it
      // For now, just remove from manual review queue
      updateData = {
        ...updateData,
        // Could set a 'rejected' flag if needed
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, blur_manually, or reject' },
        { status: 400 }
      )
    }

    const updatedMedia = await container.prisma.listingMedia.update({
      where: { id: mediaId },
      data: updateData,
    })

    // Log the action in audit log
    await container.prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: 'media.manual_review_completed',
        resourceType: 'ListingMedia',
        resourceId: mediaId,
        details: {
          action,
          listingId: media.listingId,
          originalUrl: media.publicUrl,
          blurredUrl: body.blurredUrl || null,
        },
        severity: 'LOW',
        status: 'SUCCESS',
      },
    })

    return NextResponse.json({
      success: true,
      media: updatedMedia,
    })
  } catch (error) {
    console.error('Update media review status error:', error)
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    )
  }
}
