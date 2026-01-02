import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { withErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { UnauthorizedError, NotFoundError, BadRequestError } from '@/lib/errors'
import { moderateComment } from '@/services/ai-moderation.service'
import { broadcastNewComment } from '@/services/notification.service'
import { detectContactInfo } from '@/lib/contact-detection'

type RouteParams = { params: Promise<{ id: string }> }

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000, 'Comment too long'),
  parentId: z.string().optional(),
})

// GET - Fetch comments for a listing
export const GET = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }) => {
    const { id: listingId } = await params
    const session = await auth()

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    })

    if (!listing) {
      throw new NotFoundError('Listing not found')
    }

    // Fetch comments with nested replies
    // Only show hidden comments to admins
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'MODERATOR'

    const comments = await prisma.comment.findMany({
      where: {
        listingId,
        parentId: null, // Only top-level comments
        ...(isAdmin ? {} : { isHidden: false }), // Hide hidden comments from non-admins
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' }, // Pinned comments first
        { createdAt: 'desc' }, // Then newest first
      ],
    })

    // For each top-level comment, fetch its replies
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await prisma.comment.findMany({
          where: {
            parentId: comment.id,
            ...(isAdmin ? {} : { isHidden: false }),
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' }, // Oldest replies first
        })

        return {
          ...comment,
          replies,
        }
      })
    )

    return successResponse({
      comments: commentsWithReplies,
      total: comments.length,
    })
  },
  {
    resourceType: 'listing',
    action: 'listing.comments.list',
  }
)

// POST - Add a comment
export const POST = withErrorHandler<{ id: string }>(
  async (request: NextRequest, { params }) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError('You must be logged in to comment')
    }

    const { id: listingId } = await params
    const body = await request.json()
    const { content, parentId } = createCommentSchema.parse(body)

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true, status: true },
    })

    if (!listing) {
      throw new NotFoundError('Listing not found')
    }

    // Only allow comments on active or approved listings
    if (!['ACTIVE', 'APPROVED'].includes(listing.status)) {
      throw new BadRequestError('Comments are not allowed on this listing')
    }

    // If parentId provided, verify parent comment exists and belongs to this listing
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { listingId: true, parentId: true },
      })

      if (!parentComment) {
        throw new NotFoundError('Parent comment not found')
      }

      if (parentComment.listingId !== listingId) {
        throw new BadRequestError('Parent comment does not belong to this listing')
      }

      // Prevent nesting beyond 2 levels (parent -> reply, no reply to reply)
      if (parentComment.parentId !== null) {
        throw new BadRequestError('Cannot reply to a reply. Maximum 2 levels of nesting.')
      }
    }

    // CRITICAL: Block contact info sharing to prevent fee circumvention
    // Private messaging is only available after winning + paying the 5% fee
    const contactCheck = detectContactInfo(content)
    if (contactCheck.hasContactInfo) {
      throw new BadRequestError(
        contactCheck.suggestion ||
          'Sharing contact information (phone numbers, emails, social media) is not allowed in comments. ' +
          'Private contact details are shared automatically after the buyer wins and completes payment.'
      )
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        listingId,
        authorId: session.user.id,
        parentId: parentId || null,
        content,
        isHidden: false,
        isPinned: false,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            createdAt: true,
          },
        },
      },
    })

    // Run AI moderation asynchronously (non-blocking)
    moderateComment(comment.id).catch((error) => {
      console.error('AI moderation failed for comment:', comment.id, error)
      // Don't block comment creation if moderation fails
    })

    // Get auction ID from listing to broadcast the comment
    const auction = await prisma.auction.findFirst({
      where: { listingId },
      select: { id: true },
    })

    // Broadcast new comment to auction viewers via Pusher (non-blocking)
    if (auction?.id) {
      broadcastNewComment({
        commentId: comment.id,
        auctionId: auction.id,
        listingId,
        content: comment.content,
        authorName: comment.author.name,
        authorImage: comment.author.image,
        authorId: session.user.id,
        timestamp: comment.createdAt.toISOString(),
        parentId: parentId || null,
      }).catch((error) => {
        console.error('Failed to broadcast new comment:', comment.id, error)
        // Don't block comment creation if broadcast fails
      })
    }

    return successResponse(
      {
        comment,
        message: 'Comment posted successfully',
      },
      201
    )
  },
  {
    requiresAuth: true,
    auditLog: true,
    resourceType: 'comment',
    action: 'comment.create',
  }
)
