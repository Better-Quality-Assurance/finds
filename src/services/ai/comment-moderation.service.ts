/**
 * AI Comment Moderation Service
 *
 * Moderates comments for spam, toxicity, and policy violations.
 * Single Responsibility: Only handles comment content moderation.
 */

import type { PrismaClient, AICommentModeration, ModerationDecision } from '@prisma/client'
import type { IAIProvider } from '@/services/contracts/ai-provider.interface'
import type { IAuditService } from '@/services/contracts/audit.interface'
import type {
  CommentModerationResult,
  AIModerationConfig,
} from '@/services/contracts/ai-moderation.interface'

const COMMENT_MODERATION_PROMPT = `You are a content moderator for a classic car auction platform. Analyze this comment and determine if it should be approved.

COMMENT CONTEXT:
Listing: {listingTitle} ({year} {make} {model})
Author Account Age: {accountAge}
Author Previous Comments: {previousComments}
Is Reply To: {isReply}

COMMENT TEXT:
{commentText}

Evaluate for:
1. Spam - promotional content, links, repetitive text
2. Harassment/Toxicity - personal attacks, threats, hate speech
3. Profanity - inappropriate language
4. Scam indicators - contact requests outside platform, payment requests
5. Personal information - phone numbers, emails, addresses
6. Off-topic - unrelated to the vehicle or auction
7. Quality - meaningful contribution to discussion

Respond in JSON format:
{
  "decision": "APPROVE" | "REJECT" | "FLAG_FOR_REVIEW",
  "confidenceScore": 0.0-1.0,
  "isSpam": false,
  "spamScore": 0.0-1.0,
  "isInappropriate": false,
  "toxicityScore": 0.0-1.0,
  "isOffTopic": false,
  "flaggedCategories": ["spam", "harassment", "hate_speech", "profanity", "scam", "personal_info", "off_topic", "low_quality"],
  "reasoning": "Explanation of moderation decision",
  "autoAction": "approve" | "hide" | "delete" | null
}`

export interface CommentModerationServiceDeps {
  prisma: PrismaClient
  aiProvider: IAIProvider
  audit: IAuditService
  config: AIModerationConfig
}

export class CommentModerationService {
  private prisma: PrismaClient
  private aiProvider: IAIProvider
  private audit: IAuditService
  private config: AIModerationConfig

  constructor(deps: CommentModerationServiceDeps) {
    this.prisma = deps.prisma
    this.aiProvider = deps.aiProvider
    this.audit = deps.audit
    this.config = deps.config
  }

  async moderateComment(commentId: string, actorId?: string): Promise<AICommentModeration> {
    const startTime = Date.now()

    const rateCheck = this.aiProvider.checkRateLimit()
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        listing: {
          select: { title: true, year: true, make: true, model: true },
        },
        author: {
          select: {
            id: true,
            createdAt: true,
            _count: { select: { comments: true } },
          },
        },
      },
    })

    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`)
    }

    let moderation = await this.prisma.aICommentModeration.upsert({
      where: { commentId },
      create: { commentId, status: 'PENDING' },
      update: { status: 'PENDING' },
    })

    try {
      const accountAgeDays = Math.floor(
        (Date.now() - comment.author.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      const prompt = COMMENT_MODERATION_PROMPT
        .replace('{listingTitle}', comment.listing.title)
        .replace('{year}', String(comment.listing.year))
        .replace('{make}', comment.listing.make)
        .replace('{model}', comment.listing.model)
        .replace('{accountAge}', `${accountAgeDays} days`)
        .replace('{previousComments}', String(comment.author._count.comments))
        .replace('{isReply}', comment.parentId ? 'Yes' : 'No')
        .replace('{commentText}', comment.content)

      const { data: result, usage } = await this.aiProvider.completeJSON<CommentModerationResult>(
        [{ role: 'user', content: prompt }],
        { model: 'anthropic/claude-3-haiku', temperature: 0.1 }
      )

      // Determine auto-action based on thresholds
      let autoActioned = false
      let actionTaken: string | null = null

      if (result.confidenceScore >= this.config.commentAutoApproveThreshold && result.decision === 'APPROVE') {
        autoActioned = true
        actionTaken = 'approved'
      } else if (result.spamScore >= this.config.commentAutoRejectThreshold || result.toxicityScore >= 0.9) {
        autoActioned = true
        actionTaken = 'hidden'
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { isHidden: true },
        })
      }

      moderation = await this.prisma.aICommentModeration.update({
        where: { id: moderation.id },
        data: {
          status: autoActioned
            ? (actionTaken === 'approved' ? 'APPROVED' : 'REJECTED')
            : 'FLAGGED',
          decision: result.decision as ModerationDecision,
          confidenceScore: result.confidenceScore,
          isSpam: result.isSpam,
          spamScore: result.spamScore,
          isInappropriate: result.isInappropriate,
          toxicityScore: result.toxicityScore,
          isOffTopic: result.isOffTopic,
          flaggedCategories: result.flaggedCategories,
          reasoning: result.reasoning,
          autoActioned,
          actionTaken,
          actionedAt: autoActioned ? new Date() : null,
          modelUsed: 'anthropic/claude-3-haiku',
          tokensUsed: usage.totalTokens,
          processingTimeMs: Date.now() - startTime,
        },
      })

      await this.audit.logAuditEvent({
        actorId,
        action: 'AI_COMMENT_MODERATED',
        resourceType: 'COMMENT',
        resourceId: commentId,
        severity: result.isSpam || result.isInappropriate ? 'MEDIUM' : 'LOW',
        status: 'SUCCESS',
        details: {
          decision: result.decision,
          confidenceScore: result.confidenceScore,
          autoActioned,
          actionTaken,
          isSpam: result.isSpam,
          toxicityScore: result.toxicityScore,
        },
      })

      return moderation
    } catch (error) {
      moderation = await this.prisma.aICommentModeration.update({
        where: { id: moderation.id },
        data: {
          status: 'FLAGGED',
          modelUsed: 'anthropic/claude-3-haiku',
          processingTimeMs: Date.now() - startTime,
        },
      })

      throw error
    }
  }

  async getModeration(commentId: string): Promise<AICommentModeration | null> {
    return this.prisma.aICommentModeration.findUnique({
      where: { commentId },
    })
  }

  async getPendingModerations(limit = 50): Promise<AICommentModeration[]> {
    return this.prisma.aICommentModeration.findMany({
      where: { status: 'FLAGGED' },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        comment: {
          include: {
            author: { select: { id: true, name: true, email: true } },
            listing: { select: { id: true, title: true } },
          },
        },
      },
    })
  }

  async overrideModeration(
    commentId: string,
    decision: ModerationDecision,
    reviewerId: string
  ): Promise<AICommentModeration> {
    const moderation = await this.prisma.aICommentModeration.update({
      where: { commentId },
      data: {
        status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        decision,
        actionTaken: decision === 'APPROVE' ? 'approved' : 'hidden',
        actionedAt: new Date(),
      },
    })

    // Apply action to comment
    if (decision === 'REJECT') {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { isHidden: true },
      })
    } else if (decision === 'APPROVE') {
      await this.prisma.comment.update({
        where: { id: commentId },
        data: { isHidden: false },
      })
    }

    // Audit log with reviewer ID (fixing the gap!)
    await this.audit.logAuditEvent({
      actorId: reviewerId,
      action: 'AI_MODERATION_OVERRIDDEN',
      resourceType: 'COMMENT',
      resourceId: commentId,
      severity: 'MEDIUM',
      status: 'SUCCESS',
      details: {
        decision,
        actionTaken: decision === 'APPROVE' ? 'approved' : 'hidden',
      },
    })

    return moderation
  }
}
