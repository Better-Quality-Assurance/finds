import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { getContainer } from '@/lib/container'
import { VehicleCategory } from '@prisma/client'

const updateListingSchema = z.object({
  title: z.string().min(10).max(100).optional(),
  description: z.string().min(100).max(10000).optional(),
  category: z.nativeEnum(VehicleCategory).optional(),
  make: z.string().min(1).max(50).optional(),
  model: z.string().min(1).max(50).optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  mileage: z.number().int().min(0).optional(),
  mileageUnit: z.enum(['km', 'miles']).optional(),
  vin: z.string().max(20).optional(),
  registrationCountry: z.string().max(50).optional(),
  conditionRating: z.number().int().min(1).max(10).optional(),
  conditionNotes: z.string().max(5000).optional(),
  knownIssues: z.string().max(5000).optional(),
  isRunning: z.boolean().optional(),
  locationCountry: z.string().min(2).max(50).optional(),
  locationCity: z.string().min(2).max(100).optional(),
  locationRegion: z.string().max(100).optional(),
  startingPrice: z.number().min(100).max(10000000).optional(),
  reservePrice: z.number().min(100).max(10000000).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'RON']).optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const container = getContainer()
    const listing = await container.listings.getListingById(id)

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Get listing error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateListingSchema.parse(body)

    const container = getContainer()
    const listing = await container.listings.updateListing(id, session.user.id, data)

    return NextResponse.json(listing)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes('Cannot edit')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('Update listing error:', error)
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    )
  }
}
