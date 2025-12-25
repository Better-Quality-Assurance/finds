import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { removeMedia, updateMedia } from '@/services/listing.service'
import { LISTING_RULES } from '@/domain/listing/rules'

type RouteParams = { params: Promise<{ id: string; mediaId: string }> }

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mediaId } = await params
    const body = await request.json()

    // Validate input
    const updates: {
      category?: string
      position?: number
      isPrimary?: boolean
      caption?: string
    } = {}

    if (body.category !== undefined) {
      if (typeof body.category !== 'string') {
        return NextResponse.json(
          { error: 'Category must be a string' },
          { status: 400 }
        )
      }
      if (!(LISTING_RULES.PHOTO_CATEGORIES as readonly string[]).includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${LISTING_RULES.PHOTO_CATEGORIES.join(', ')}` },
          { status: 400 }
        )
      }
      updates.category = body.category
    }

    if (body.position !== undefined) {
      const position = Number(body.position)
      if (!Number.isInteger(position) || position < 0) {
        return NextResponse.json(
          { error: 'Position must be a positive integer' },
          { status: 400 }
        )
      }
      updates.position = position
    }

    if (body.isPrimary !== undefined) {
      if (typeof body.isPrimary !== 'boolean') {
        return NextResponse.json(
          { error: 'isPrimary must be a boolean' },
          { status: 400 }
        )
      }
      updates.isPrimary = body.isPrimary
    }

    if (body.caption !== undefined) {
      if (typeof body.caption !== 'string') {
        return NextResponse.json(
          { error: 'Caption must be a string' },
          { status: 400 }
        )
      }
      updates.caption = body.caption
    }

    // At least one field must be provided
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'At least one field to update must be provided' },
        { status: 400 }
      )
    }

    const media = await updateMedia(mediaId, session.user.id, updates)

    return NextResponse.json({ media })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (
        error.message.includes('Cannot update') ||
        error.message.includes('Only one photo') ||
        error.message.includes('Invalid')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('Update media error:', error)
    return NextResponse.json(
      { error: 'Failed to update media' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mediaId } = await params

    await removeMedia(mediaId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes('Cannot remove')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    console.error('Delete media error:', error)
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    )
  }
}
