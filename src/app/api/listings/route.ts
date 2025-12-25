import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { getContainer } from '@/lib/container'
import { VehicleCategory } from '@prisma/client'

const createListingSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(100).max(10000),
  category: z.nativeEnum(VehicleCategory),
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.number().int().min(0).optional(),
  mileageUnit: z.enum(['km', 'miles']).optional(),
  vin: z.string().max(20).optional(),
  registrationCountry: z.string().max(50).optional(),
  conditionRating: z.number().int().min(1).max(10).optional(),
  conditionNotes: z.string().max(5000).optional(),
  knownIssues: z.string().max(5000).optional(),
  isRunning: z.boolean(),
  locationCountry: z.string().min(2).max(50),
  locationCity: z.string().min(2).max(100),
  locationRegion: z.string().max(100).optional(),
  startingPrice: z.number().min(100).max(10000000),
  reservePrice: z.number().min(100).max(10000000).optional(),
  currency: z.enum(['EUR', 'USD', 'GBP', 'RON']).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has verified their email
    if (!session.user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before creating a listing' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = createListingSchema.parse(body)

    const container = getContainer()
    const listing = await container.listings.createListing({
      ...data,
      sellerId: session.user.id,
    })

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create listing error:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as any

    const container = getContainer()
    const listings = await container.listings.getSellerListings(session.user.id, status)

    return NextResponse.json(listings)
  } catch (error) {
    console.error('Get listings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}
