import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

// GET - Check if current user follows this seller
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth()
    const { id: sellerId } = await context.params

    if (!session?.user?.id) {
      return NextResponse.json(
        { isFollowing: false },
        { status: 200 }
      )
    }

    const follow = await prisma.sellerFollow.findUnique({
      where: {
        followerId_sellerId: {
          followerId: session.user.id,
          sellerId,
        },
      },
    })

    return NextResponse.json({
      isFollowing: !!follow,
    })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json(
      { error: 'Failed to check follow status' },
      { status: 500 }
    )
  }
}

// POST - Follow a seller
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth()
    const { id: sellerId } = await context.params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Prevent following yourself
    if (session.user.id === sellerId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if seller exists
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true },
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Create follow relationship and increment follower count
    await prisma.$transaction([
      prisma.sellerFollow.create({
        data: {
          followerId: session.user.id,
          sellerId,
        },
      }),
      prisma.user.update({
        where: { id: sellerId },
        data: {
          followerCount: {
            increment: 1,
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      isFollowing: true,
    })
  } catch (error: any) {
    // Handle unique constraint violation (already following)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Already following this seller' },
        { status: 400 }
      )
    }

    console.error('Error following seller:', error)
    return NextResponse.json(
      { error: 'Failed to follow seller' },
      { status: 500 }
    )
  }
}

// DELETE - Unfollow a seller
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth()
    const { id: sellerId } = await context.params

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Delete follow relationship and decrement follower count
    const follow = await prisma.sellerFollow.findUnique({
      where: {
        followerId_sellerId: {
          followerId: session.user.id,
          sellerId,
        },
      },
    })

    if (!follow) {
      return NextResponse.json(
        { error: 'Not following this seller' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.sellerFollow.delete({
        where: {
          followerId_sellerId: {
            followerId: session.user.id,
            sellerId,
          },
        },
      }),
      prisma.user.update({
        where: { id: sellerId },
        data: {
          followerCount: {
            decrement: 1,
          },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      isFollowing: false,
    })
  } catch (error) {
    console.error('Error unfollowing seller:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow seller' },
      { status: 500 }
    )
  }
}
