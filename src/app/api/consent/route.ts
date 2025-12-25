import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ConsentType } from '@prisma/client'

const consentSchema = z.object({
  consents: z.array(
    z.object({
      type: z.enum(['ESSENTIAL', 'ANALYTICS', 'MARKETING', 'DATA_PROCESSING']),
      granted: z.boolean(),
    })
  ),
})

export async function POST(request: Request) {
  try {
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
      return NextResponse.json(
        { message: 'Unable to identify user for consent tracking' },
        { status: 400 }
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

    return NextResponse.json(
      {
        message: 'Consent preferences saved successfully',
        recordCount: consentRecords.length,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid consent data', errors: error.errors },
        { status: 400 }
      )
    }

    console.error('Consent recording error:', error)
    return NextResponse.json(
      {
        message: 'Failed to save consent preferences',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Get authenticated user
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized - please log in to view consent history' },
        { status: 401 }
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

    return NextResponse.json({
      latestConsents,
      history: consentRecords,
    })
  } catch (error) {
    console.error('Consent retrieval error:', error)
    return NextResponse.json(
      {
        message: 'Failed to retrieve consent history',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
