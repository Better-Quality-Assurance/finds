import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schema for creating a data request
const createDataRequestSchema = z.object({
  requestType: z.enum(['EXPORT', 'DELETE']),
})

// GET - Fetch user's data requests
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const dataRequests = await prisma.dataRequest.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        requestType: true,
        status: true,
        createdAt: true,
        completedAt: true,
        exportFilePath: true,
        exportExpiresAt: true,
        rejectionReason: true,
      },
    })

    return NextResponse.json({ dataRequests })
  } catch (error) {
    console.error('Failed to fetch data requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data requests' },
      { status: 500 }
    )
  }
}

// POST - Create a new data request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = createDataRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { requestType } = validation.data

    // Check for existing pending/processing requests of the same type
    const existingRequest = await prisma.dataRequest.findFirst({
      where: {
        userId: session.user.id,
        requestType,
        status: {
          in: ['PENDING', 'PROCESSING'],
        },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending request of this type' },
        { status: 409 }
      )
    }

    // For DELETE requests, check if user has active auctions or listings
    if (requestType === 'DELETE') {
      const activeListings = await prisma.listing.findFirst({
        where: {
          sellerId: session.user.id,
          status: {
            in: ['ACTIVE', 'PENDING_REVIEW', 'APPROVED'],
          },
        },
      })

      if (activeListings) {
        return NextResponse.json(
          {
            error: 'Cannot delete account with active listings. Please withdraw or complete all listings first.'
          },
          { status: 400 }
        )
      }

      const activeBids = await prisma.bid.findFirst({
        where: {
          bidderId: session.user.id,
          isValid: true,
          auction: {
            status: {
              in: ['SCHEDULED', 'ACTIVE', 'EXTENDED'],
            },
          },
        },
      })

      if (activeBids) {
        return NextResponse.json(
          {
            error: 'Cannot delete account with active bids. Please wait for auctions to complete.'
          },
          { status: 400 }
        )
      }
    }

    // Create the data request
    const dataRequest = await prisma.dataRequest.create({
      data: {
        userId: session.user.id,
        requestType,
        status: 'PENDING',
      },
      select: {
        id: true,
        requestType: true,
        status: true,
        createdAt: true,
      },
    })

    // TODO: In a production environment, you would trigger:
    // 1. For EXPORT: A background job to generate the data export file
    // 2. For DELETE: A background job to anonymize/delete user data after a grace period
    // 3. Send email notification to user confirming the request

    return NextResponse.json({
      dataRequest,
      message: requestType === 'EXPORT'
        ? 'Data export request created. You will receive an email when your data is ready to download.'
        : 'Account deletion request created. You will receive an email confirmation. You have a grace period to cancel this request.'
    })
  } catch (error) {
    console.error('Failed to create data request:', error)
    return NextResponse.json(
      { error: 'Failed to create data request' },
      { status: 500 }
    )
  }
}
