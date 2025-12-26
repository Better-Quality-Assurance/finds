/**
 * Mock Comment Generator Service
 *
 * Generates realistic Q&A activity on listings for demo purposes.
 * Follows SRP: Only responsible for comment generation logic.
 */

import { prisma } from '@/lib/db'
import type { Comment, Listing, User } from '@prisma/client'
import type {
  IMockCommentGenerator,
  MockCommentConfig,
  MockCommentResult,
} from './contracts/mock-activity.interface'

// =============================================================================
// MOCK COMMENT TEMPLATES
// =============================================================================

const BUYER_QUESTIONS = [
  'What is the service history like? Any major work done recently?',
  'Are there any oil leaks or mechanical issues I should know about?',
  'How long have you owned the car?',
  'Is the mileage original and documented?',
  'Can you share more photos of the engine bay?',
  'What is the condition of the underside? Any rust?',
  'Has the car ever been in an accident?',
  'Are all the electrics working properly?',
  'Is there any documentation or history file with the car?',
  'Can you arrange a viewing before the auction ends?',
  'What is the tire condition like?',
  'Does the AC work? Has it been regassed recently?',
  'Are there any modifications from factory spec?',
  'Is this the original paint color?',
  'How does it drive? Any vibrations or noises?',
  'What is the reason for selling?',
  'Are both keys included?',
  'Has the timing belt/chain been replaced?',
  'Is the car currently registered and insured?',
  'Can you arrange transport to [country]?',
  'Mașina poate fi văzută în weekend?',
  'Care este starea reală a caroseriei?',
  'Acceptați schimb parțial?',
  'ITP-ul este valabil?',
  'Există defecte ascunse pe care ar trebui să le știu?',
]

const SELLER_RESPONSES = [
  'Yes, I can provide all the documentation. Happy to answer any questions!',
  'The car has been well maintained throughout its life. Full service history available.',
  'Absolutely, viewings can be arranged. Please contact me to schedule.',
  'All original and documented. I have receipts for all work done.',
  "I've owned it for 5 years and it has been my weekend car. Low mileage as a result.",
  'No accidents, clean history. I can provide a Carfax/AutoDNA report.',
  'The underside is clean - I can share photos. Originally from a dry climate.',
  'Everything works as it should. Recently had a full service.',
  'Happy to provide more photos. Let me know what specific areas you need.',
  'Transport can be arranged. I have contacts with reliable transporters.',
  'Da, mașina poate fi văzută oricând. Sunați-mă pentru programare.',
  'Toate documentele sunt în regulă. ITP valabil încă 2 ani.',
  'Starea este exact cea din poze. Nu există defecte ascunse.',
  'Accept doar vânzare, nu schimb. Prețul este negociabil pentru cumpărător serios.',
]

const ENTHUSIAST_COMMENTS = [
  'Beautiful spec! GLWS (Good Luck With Sale)',
  'One of the best examples I have seen online. Someone will be lucky!',
  'The color combination is perfect. These are getting rare.',
  "I had one of these years ago. Miss it every day. Don't make my mistake, keep it!",
  'Great price for this spec. Should sell quickly.',
  'Watching with interest. Might have to bid!',
  'Ce mașină frumoasă! Mult succes cu vânzarea!',
  'Brings back memories. Had the same model in the 90s.',
]

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export class MockCommentGenerator implements IMockCommentGenerator {
  private commentCountByListing: Map<string, number> = new Map()

  /**
   * Get all mock commenter users
   */
  async getMockCommenters(): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        email: { contains: 'mock' },
        bannedAt: null,
      },
    })
  }

  /**
   * Get a random question template
   */
  private getRandomQuestion(): string {
    return BUYER_QUESTIONS[Math.floor(Math.random() * BUYER_QUESTIONS.length)]
  }

  /**
   * Get a random seller response template
   */
  private getRandomSellerResponse(): string {
    return SELLER_RESPONSES[Math.floor(Math.random() * SELLER_RESPONSES.length)]
  }

  /**
   * Get a random enthusiast comment
   */
  private getRandomEnthusiastComment(): string {
    return ENTHUSIAST_COMMENTS[Math.floor(Math.random() * ENTHUSIAST_COMMENTS.length)]
  }

  /**
   * Generate a single mock comment for a listing
   */
  async generateComment(
    listingId: string,
    config: MockCommentConfig
  ): Promise<MockCommentResult> {
    try {
      // Get listing with seller info
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          seller: { select: { id: true, name: true } },
        },
      })

      if (!listing) {
        return {
          success: false,
          listingId,
          authorId: '',
          error: 'Listing not found',
        }
      }

      // Check max comments limit
      const currentCount = this.commentCountByListing.get(listingId) ?? 0
      if (currentCount >= config.maxCommentsPerAuction) {
        return {
          success: false,
          listingId,
          authorId: '',
          error: 'Max comments reached for this listing',
        }
      }

      // Random chance to skip
      if (Math.random() > config.commentProbability) {
        return {
          success: false,
          listingId,
          authorId: '',
          error: 'Skipped due to probability',
        }
      }

      // Get mock commenters (excluding seller)
      const commenters = await this.getMockCommenters()
      const eligibleCommenters = commenters.filter(
        (c) => c.id !== listing.sellerId
      )

      if (eligibleCommenters.length === 0) {
        return {
          success: false,
          listingId,
          authorId: '',
          error: 'No eligible mock commenters found',
        }
      }

      // Select random commenter
      const selectedCommenter =
        eligibleCommenters[Math.floor(Math.random() * eligibleCommenters.length)]

      // Decide comment type: 70% question, 30% enthusiast comment
      const isQuestion = Math.random() < 0.7
      const content = isQuestion
        ? this.getRandomQuestion()
        : this.getRandomEnthusiastComment()

      // Create comment
      const comment = await prisma.comment.create({
        data: {
          listingId,
          authorId: selectedCommenter.id,
          content,
          isPinned: false,
        },
      })

      // Track count
      this.commentCountByListing.set(listingId, currentCount + 1)

      return {
        success: true,
        comment,
        listingId,
        authorId: selectedCommenter.id,
        isSellerResponse: false,
      }
    } catch (error) {
      return {
        success: false,
        listingId,
        authorId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate a seller response to an existing comment
   */
  async generateSellerResponse(
    listingId: string,
    _parentCommentId: string
  ): Promise<MockCommentResult> {
    try {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true },
      })

      if (!listing) {
        return {
          success: false,
          listingId,
          authorId: '',
          error: 'Listing not found',
        }
      }

      const content = this.getRandomSellerResponse()

      const comment = await prisma.comment.create({
        data: {
          listingId,
          authorId: listing.sellerId,
          content,
          isPinned: false,
        },
      })

      return {
        success: true,
        comment,
        listingId,
        authorId: listing.sellerId,
        isSellerResponse: true,
      }
    } catch (error) {
      return {
        success: false,
        listingId,
        authorId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Generate comments across multiple listings
   */
  async generateComments(
    listingIds: string[],
    config: MockCommentConfig
  ): Promise<MockCommentResult[]> {
    const results: MockCommentResult[] = []

    // Process listings in random order
    const shuffled = [...listingIds].sort(() => Math.random() - 0.5)

    for (const listingId of shuffled) {
      // Random delay between comments
      const delay =
        config.minIntervalMs +
        Math.random() * (config.maxIntervalMs - config.minIntervalMs)
      await new Promise((resolve) =>
        setTimeout(resolve, delay / shuffled.length)
      )

      // Generate buyer question
      const questionResult = await this.generateComment(listingId, config)
      results.push(questionResult)

      // Maybe generate seller response
      if (
        questionResult.success &&
        questionResult.comment &&
        config.includeSellResponses &&
        Math.random() < 0.6 // 60% chance of seller response
      ) {
        // Small delay before seller responds
        await new Promise((resolve) =>
          setTimeout(resolve, 2000 + Math.random() * 5000)
        )

        const responseResult = await this.generateSellerResponse(
          listingId,
          questionResult.comment.id
        )
        results.push(responseResult)
      }
    }

    return results
  }

  /**
   * Reset comment counts
   */
  resetCounts(): void {
    this.commentCountByListing.clear()
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let mockCommentGeneratorInstance: MockCommentGenerator | null = null

export function getMockCommentGenerator(): MockCommentGenerator {
  if (!mockCommentGeneratorInstance) {
    mockCommentGeneratorInstance = new MockCommentGenerator()
  }
  return mockCommentGeneratorInstance
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export async function generateMockComment(
  listingId: string,
  config: MockCommentConfig
): Promise<MockCommentResult> {
  return getMockCommentGenerator().generateComment(listingId, config)
}

export async function generateMockComments(
  listingIds: string[],
  config: MockCommentConfig
): Promise<MockCommentResult[]> {
  return getMockCommentGenerator().generateComments(listingIds, config)
}
