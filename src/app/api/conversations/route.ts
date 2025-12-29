import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET /api/conversations - List user's conversations
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch conversations where user is either buyer or seller
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            year: true,
            status: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: {
                publicUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: userId },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Transform conversations to include unread count and other participant
    const transformedConversations = conversations.map((conv) => {
      const isUserBuyer = conv.buyerId === userId
      const otherParticipant = isUserBuyer ? conv.seller : conv.buyer
      const lastMessage = conv.messages[0] || null

      return {
        id: conv.id,
        listingId: conv.listingId,
        listing: {
          ...conv.listing,
          primaryImage:
            conv.listing.media[0]?.thumbnailUrl || conv.listing.media[0]?.publicUrl || null,
        },
        otherParticipant,
        lastMessage,
        unreadCount: conv._count.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      }
    })

    return NextResponse.json({ conversations: transformedConversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/conversations - Create new conversation
const createConversationSchema = z.object({
  listingId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { listingId } = createConversationSchema.parse(body)

    // Fetch the listing to get the seller
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, sellerId: true, status: true },
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Prevent seller from messaging themselves
    if (listing.sellerId === userId) {
      return NextResponse.json(
        { error: 'Cannot message your own listing' },
        { status: 400 }
      )
    }

    // Check if conversation already exists
    const existingConversation = await prisma.conversation.findUnique({
      where: {
        listingId_buyerId: {
          listingId,
          buyerId: userId,
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            year: true,
            status: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: { publicUrl: true, thumbnailUrl: true },
            },
          },
        },
        seller: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    if (existingConversation) {
      return NextResponse.json({
        conversation: {
          id: existingConversation.id,
          listingId: existingConversation.listingId,
          listing: {
            ...existingConversation.listing,
            primaryImage:
              existingConversation.listing.media[0]?.thumbnailUrl ||
              existingConversation.listing.media[0]?.publicUrl ||
              null,
          },
          otherParticipant: existingConversation.seller,
        },
      })
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
      },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            make: true,
            model: true,
            year: true,
            status: true,
            media: {
              where: { isPrimary: true },
              take: 1,
              select: { publicUrl: true, thumbnailUrl: true },
            },
          },
        },
        seller: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return NextResponse.json(
      {
        conversation: {
          id: conversation.id,
          listingId: conversation.listingId,
          listing: {
            ...conversation.listing,
            primaryImage:
              conversation.listing.media[0]?.thumbnailUrl ||
              conversation.listing.media[0]?.publicUrl ||
              null,
          },
          otherParticipant: conversation.seller,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating conversation:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
