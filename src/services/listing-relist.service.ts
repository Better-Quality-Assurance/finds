/**
 * Listing Relist Service
 *
 * Handles duplicating expired listings for relisting with AI-suggested improvements.
 * Single Responsibility: Relist functionality for expired listings.
 */

import type { PrismaClient, Listing, AIListingImprovement } from '@prisma/client'
import { paymentLogger as logger, logError } from '@/lib/logger'

interface RelistResult {
  success: boolean
  newListingId?: string
  error?: string
}

interface RelistServiceDeps {
  prisma: PrismaClient
}

export class RelistService {
  private readonly prisma: PrismaClient

  constructor(deps: RelistServiceDeps) {
    this.prisma = deps.prisma
  }

  /**
   * Relist an expired listing with optional AI improvements applied
   */
  async relistListing(
    listingId: string,
    userId: string,
    options?: {
      applyImprovements?: boolean
    }
  ): Promise<RelistResult> {
    try {
      // Fetch original listing with media
      const original = await this.prisma.listing.findUnique({
        where: { id: listingId },
        include: {
          media: true,
          aiImprovements: {
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!original) {
        return { success: false, error: 'Listing not found' }
      }

      // Verify ownership
      if (original.sellerId !== userId) {
        return { success: false, error: 'Not authorized to relist this listing' }
      }

      // Verify status allows relisting
      if (original.status !== 'EXPIRED' && original.status !== 'WITHDRAWN') {
        return { success: false, error: `Cannot relist listing in status: ${original.status}` }
      }

      // Get AI improvements if available and requested
      const improvements = options?.applyImprovements
        ? original.aiImprovements[0]
        : null

      // Prepare new listing data
      const newListingData = {
        sellerId: original.sellerId,
        title: original.title,
        description: original.description,
        category: original.category,
        make: original.make,
        model: original.model,
        year: original.year,
        mileage: original.mileage,
        mileageUnit: original.mileageUnit,
        vin: original.vin,
        registrationCountry: original.registrationCountry,
        conditionRating: original.conditionRating,
        conditionNotes: original.conditionNotes,
        knownIssues: original.knownIssues,
        isRunning: original.isRunning,
        conditionOverall: original.conditionOverall,
        conditionOverallNotes: original.conditionOverallNotes,
        conditionPaintBody: original.conditionPaintBody,
        conditionPaintBodyNotes: original.conditionPaintBodyNotes,
        conditionInterior: original.conditionInterior,
        conditionInteriorNotes: original.conditionInteriorNotes,
        conditionFrame: original.conditionFrame,
        conditionFrameNotes: original.conditionFrameNotes,
        conditionMechanical: original.conditionMechanical,
        conditionMechanicalNotes: original.conditionMechanicalNotes,
        locationCountry: original.locationCountry,
        locationCity: original.locationCity,
        locationRegion: original.locationRegion,
        currency: original.currency,
        // Apply AI-suggested pricing if available
        startingPrice: improvements?.suggestedStartingPrice ?? original.startingPrice,
        reservePrice: improvements?.suggestedReserve ?? original.reservePrice,
        // Reset status
        status: 'DRAFT' as const,
        // Clear review fields
        reviewedById: null,
        reviewedAt: null,
        rejectionReason: null,
        changeRequests: [],
        submittedAt: null,
        approvedAt: null,
      }

      // Create new listing
      const newListing = await this.prisma.listing.create({
        data: newListingData,
      })

      // Copy media to new listing (reference same files)
      if (original.media.length > 0) {
        await this.prisma.listingMedia.createMany({
          data: original.media.map(m => ({
            listingId: newListing.id,
            type: m.type,
            storagePath: m.storagePath,
            publicUrl: m.publicUrl,
            thumbnailUrl: m.thumbnailUrl,
            originalUrl: m.originalUrl,
            position: m.position,
            isPrimary: m.isPrimary,
            category: m.category,
            caption: m.caption,
            fileSize: m.fileSize,
            mimeType: m.mimeType,
            width: m.width,
            height: m.height,
            licensePlateDetected: m.licensePlateDetected,
            licensePlateBlurred: m.licensePlateBlurred,
            // Prisma JSON null requires special handling
            ...(m.plateDetectionData !== null && { plateDetectionData: m.plateDetectionData }),
            needsManualReview: m.needsManualReview,
          })),
        })
      }

      logger.info(
        {
          originalListingId: listingId,
          newListingId: newListing.id,
          appliedImprovements: !!improvements,
        },
        'Relisted listing successfully'
      )

      return {
        success: true,
        newListingId: newListing.id,
      }
    } catch (error) {
      logError(logger, 'Failed to relist listing', error, { listingId })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to relist',
      }
    }
  }

  /**
   * Get improvement suggestions for a listing
   */
  async getImprovements(listingId: string): Promise<AIListingImprovement | null> {
    return this.prisma.aIListingImprovement.findFirst({
      where: { listingId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
    })
  }
}

// Factory function
import { prisma } from '@/lib/db'

export function createRelistService(): RelistService {
  return new RelistService({ prisma })
}
