import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getContainer } from '@/lib/container'

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has verified their email
    if (!session.user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before submitting a listing' },
        { status: 403 }
      )
    }

    const { id } = await params

    const container = getContainer()
    const listing = await container.listings.submitForReview(id, session.user.id)

    return NextResponse.json(listing)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes('Cannot') || error.message.includes('Minimum')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('Submit listing error:', error)
    return NextResponse.json(
      { error: 'Failed to submit listing' },
      { status: 500 }
    )
  }
}
