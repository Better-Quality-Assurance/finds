/**
 * AI Listing Analysis Service
 *
 * Analyzes listing submissions for approval recommendations.
 * Single Responsibility: Only handles listing content analysis.
 */

import type { PrismaClient, AIListingAnalysis, ModerationDecision } from '@prisma/client'
import type { IAIProvider } from '@/services/contracts/ai-provider.interface'
import type { IAuditService } from '@/services/contracts/audit.interface'
import type {
  ListingAnalysisResult,
  AIModerationConfig,
} from '@/services/contracts/ai-moderation.interface'

const LISTING_ANALYSIS_PROMPT = `You are an expert classic car auction moderator. Analyze this listing submission and determine if it should be approved for the Finds.ro auction platform.

LISTING DETAILS:
Title: {title}
Category: {category}
Make: {make}
Model: {model}
Year: {year}
Mileage: {mileage} {mileageUnit}
VIN: {vin}
Location: {locationCity}, {locationCountry}
Starting Price: {startingPrice} {currency}
Condition Rating: {conditionRating}/10
Is Running: {isRunning}

DESCRIPTION:
{description}

KNOWN ISSUES:
{knownIssues}

CONDITION NOTES:
{conditionNotes}

NUMBER OF PHOTOS: {photoCount}
PHOTO CATEGORIES PRESENT: {photoCategories}

{imageObservations}

Evaluate this listing based on:
1. Title quality - Is it descriptive, accurate, not spammy?
2. Description completeness - Does it provide necessary details about the vehicle?
3. Transparency - Are known issues disclosed?
4. Pricing reasonableness - Is the starting price within market norms?
5. Photo requirements - Are required categories present (exterior 4 sides, interior, engine, etc.)?
6. Red flags - Any signs of fraud, scam, or policy violations?

Respond in JSON format:
{
  "decision": "APPROVE" | "REJECT" | "FLAG_FOR_REVIEW" | "NEEDS_CHANGES",
  "confidenceScore": 0.0-1.0,
  "approvalReasoning": "Brief explanation of decision",
  "issues": [
    {"type": "content|images|pricing|documentation|authenticity", "severity": "low|medium|high|critical", "description": "..."}
  ],
  "suggestions": ["Improvement suggestions..."],
  "titleAnalysis": {
    "isSpam": false,
    "isDescriptive": true,
    "hasKeywords": true,
    "suggestedTitle": "Optional better title",
    "issues": []
  },
  "descriptionAnalysis": {
    "completeness": 85,
    "hasRedFlags": false,
    "redFlags": [],
    "missingInfo": ["Service history", "..."],
    "qualityScore": 80
  },
  "imageAnalysis": {
    "totalImages": 45,
    "hasRequiredCategories": true,
    "missingCategories": [],
    "qualityIssues": [],
    "authenticityScore": 95,
    "potentialManipulation": false
  }
}`

const IMAGE_ANALYSIS_PROMPT = `Analyze these photos of a classic car listing for an auction platform. Focus on:
1. Photo quality and clarity
2. Required angles present (front, rear, both sides, interior, engine, trunk, wheels, VIN)
3. Signs of damage, rust, or issues not mentioned
4. Signs of photo manipulation or stock photos
5. Consistency between photos (same car, same location)

Provide a brief assessment of the photo quality and any concerns.`

export interface ListingAnalysisServiceDeps {
  prisma: PrismaClient
  aiProvider: IAIProvider
  audit: IAuditService
  config: AIModerationConfig
}

export class ListingAnalysisService {
  private prisma: PrismaClient
  private aiProvider: IAIProvider
  private audit: IAuditService
  private config: AIModerationConfig

  constructor(deps: ListingAnalysisServiceDeps) {
    this.prisma = deps.prisma
    this.aiProvider = deps.aiProvider
    this.audit = deps.audit
    this.config = deps.config
  }

  async analyzeListing(listingId: string, actorId?: string): Promise<AIListingAnalysis> {
    const startTime = Date.now()

    const rateCheck = this.aiProvider.checkRateLimit()
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateCheck.retryAfter}ms`)
    }

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        media: {
          where: { type: 'PHOTO' },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`)
    }

    let analysis = await this.prisma.aIListingAnalysis.upsert({
      where: { listingId },
      create: { listingId, status: 'PROCESSING' },
      update: { status: 'PROCESSING', errorMessage: null },
    })

    try {
      // Analyze images first if available (fixing the gap!)
      let imageObservations = ''
      if (listing.media.length > 0) {
        const imageUrls = listing.media.slice(0, 10).map((m) => m.publicUrl)
        const imageResult = await this.aiProvider.analyzeImages(
          imageUrls,
          IMAGE_ANALYSIS_PROMPT,
          { model: this.config.visionModel }
        )
        imageObservations = `IMAGE OBSERVATIONS:\n${imageResult.content}`
      }

      const photoCategories = Array.from(new Set(listing.media.map((m) => m.category).filter((c): c is string => Boolean(c))))

      const prompt = LISTING_ANALYSIS_PROMPT
        .replace('{title}', listing.title)
        .replace('{category}', listing.category)
        .replace('{make}', listing.make)
        .replace('{model}', listing.model)
        .replace('{year}', String(listing.year))
        .replace('{mileage}', listing.mileage ? String(listing.mileage) : 'Not specified')
        .replace('{mileageUnit}', listing.mileageUnit)
        .replace('{vin}', listing.vin || 'Not provided')
        .replace('{locationCity}', listing.locationCity)
        .replace('{locationCountry}', listing.locationCountry)
        .replace('{startingPrice}', listing.startingPrice.toString())
        .replace('{currency}', listing.currency)
        .replace('{conditionRating}', listing.conditionRating ? String(listing.conditionRating) : 'Not rated')
        .replace('{isRunning}', listing.isRunning ? 'Yes' : 'No')
        .replace('{description}', listing.description)
        .replace('{knownIssues}', listing.knownIssues || 'None disclosed')
        .replace('{conditionNotes}', listing.conditionNotes || 'None')
        .replace('{photoCount}', String(listing.media.length))
        .replace('{photoCategories}', photoCategories.join(', ') || 'Unknown')
        .replace('{imageObservations}', imageObservations)

      const { data: result, usage } = await this.aiProvider.completeJSON<ListingAnalysisResult>(
        [{ role: 'user', content: prompt }],
        { model: this.config.defaultModel, temperature: 0.2 }
      )

      analysis = await this.prisma.aIListingAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'COMPLETED',
          decision: result.decision as ModerationDecision,
          confidenceScore: result.confidenceScore,
          approvalReasoning: result.approvalReasoning,
          titleAnalysis: result.titleAnalysis as object,
          descriptionAnalysis: result.descriptionAnalysis as object,
          imageAnalysis: result.imageAnalysis as object,
          issues: result.issues as object[],
          suggestions: result.suggestions,
          modelUsed: this.config.defaultModel,
          tokensUsed: usage.totalTokens,
          processingTimeMs: Date.now() - startTime,
        },
      })

      // Audit log the analysis
      await this.audit.logAuditEvent({
        actorId,
        action: 'AI_LISTING_ANALYZED',
        resourceType: 'LISTING',
        resourceId: listingId,
        severity: 'LOW',
        status: 'SUCCESS',
        details: {
          decision: result.decision,
          confidenceScore: result.confidenceScore,
          issueCount: result.issues.length,
          tokensUsed: usage.totalTokens,
          processingTimeMs: Date.now() - startTime,
        },
      })

      return analysis
    } catch (error) {
      analysis = await this.prisma.aIListingAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processingTimeMs: Date.now() - startTime,
        },
      })

      await this.audit.logAuditEvent({
        actorId,
        action: 'AI_LISTING_ANALYZED',
        resourceType: 'LISTING',
        resourceId: listingId,
        severity: 'MEDIUM',
        status: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  async getAnalysis(listingId: string): Promise<AIListingAnalysis | null> {
    return this.prisma.aIListingAnalysis.findUnique({
      where: { listingId },
    })
  }

  async getPendingAnalyses(limit = 20): Promise<AIListingAnalysis[]> {
    return this.prisma.aIListingAnalysis.findMany({
      where: { status: 'PENDING' },
      take: limit,
      orderBy: { createdAt: 'asc' },
    })
  }

  async retryFailedAnalysis(listingId: string, actorId?: string): Promise<AIListingAnalysis> {
    return this.analyzeListing(listingId, actorId)
  }
}
