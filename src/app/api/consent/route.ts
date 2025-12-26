import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ConsentType } from '@prisma/client'
import { consentSchema } from '@/lib/validation-schemas'
import { withSimpleErrorHandler } from '@/lib/with-error-handler'
import { successResponse } from '@/lib/api-response'
import { ValidationError, UnauthorizedError } from '@/lib/errors'
import { ERROR_CODES } from '@/lib/error-codes'

export const POST = withSimpleErrorHandler(
  async (request: NextRequest) => {
    // Parse request body
    const body = await request.json()
    const { consents } = consentSchema.parse(body)

    // Get authenticated user if logged in
    const session = await auth()
    const userId = session?.user?.id

    // Extract IP address and user agent for GDPR compliance
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      null

    const userAgent = request.headers.get('user-agent') || null

    // Validate that we have either a userId or an IP address for tracking
    if (!userId && !ipAddress) {
      throw new ValidationError(
        'Unable to identify user for consent tracking',
        ERROR_CODES.VALIDATION_MISSING_FIELD
      )
    }

    // Store each consent record in the database
    const consentRecords = await prisma.$transaction(
      consents.map((consent) =>
        prisma.consentRecord.create({
          data: {
            userId: userId || null,
            consentType: consent.type as ConsentType,
            granted: consent.granted,
            ipAddress,
            userAgent,
          },
        })
      )
    )

    // If user is authenticated and granted marketing consent, update user record
    if (userId && consents.find(c => c.type === 'MARKETING' && c.granted)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          marketingConsent: true,
          marketingConsentDate: new Date(),
        },
      })
    }

    // If user is authenticated and declined marketing consent, update user record
    if (userId && consents.find(c => c.type === 'MARKETING' && !c.granted)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          marketingConsent: false,
          marketingConsentDate: null,
        },
      })
    }

    return successResponse(
      {
        message: 'Consent preferences saved successfully',
        recordCount: consentRecords.length,
      },
      201
    )
  },
  {
    resourceType: 'consent',
    action: 'consent.record',
  }
)

export const GET = withSimpleErrorHandler(
  async () => {
    // Get authenticated user
    const session = await auth()

    if (!session?.user?.id) {
      throw new UnauthorizedError(
        'Unauthorized - please log in to view consent history',
        ERROR_CODES.AUTH_REQUIRED
      )
    }

    // Fetch user's consent history
    const consentRecords = await prisma.consentRecord.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        consentType: true,
        granted: true,
        createdAt: true,
      },
    })

    // Get latest consent for each type
    const latestConsents: Record<string, { granted: boolean; createdAt: Date }> = {}

    for (const record of consentRecords) {
      if (!latestConsents[record.consentType]) {
        latestConsents[record.consentType] = {
          granted: record.granted,
          createdAt: record.createdAt,
        }
      }
    }

    return successResponse({
      latestConsents,
      history: consentRecords,
    })
  },
  {
    requiresAuth: true,
    resourceType: 'consent',
    action: 'consent.list',
  }
)
