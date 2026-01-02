import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * Check if a user can see full contact details for a listing
 * Contact is only revealed when:
 * 1. User is the auction winner AND
 * 2. Payment status is PAID
 */
async function canSeeContactDetails(
  userId: string,
  listingId: string
): Promise<boolean> {
  const auction = await prisma.auction.findFirst({
    where: {
      listingId,
      status: 'SOLD',
      winnerId: userId,
      paymentStatus: 'PAID',
    },
    select: { id: true },
  })

  return !!auction
}

/**
 * Mask email for privacy - show domain only
 * e.g., "john.doe@example.com" -> "j***@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) {return '***@***.com'}
  const maskedLocal = local.length > 1 ? local[0] + '***' : '***'
  return `${maskedLocal}@${domain}`
}

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
            phone: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
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

    // Transform conversations with privacy-aware contact info
    const transformedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const isUserBuyer = conv.buyerId === userId
        const otherParticipant = isUserBuyer ? conv.seller : conv.buyer
        const lastMessage = conv.messages[0] || null

        // Check if user can see full contact details
        // Buyers need to win + pay, sellers can always see buyer info for their listing
        let canSeeContact = false
        if (isUserBuyer) {
          // Buyer can see seller contact only if they won and paid
          canSeeContact = await canSeeContactDetails(userId, conv.listingId)
        } else {
          // Seller can see buyer contact only if buyer won and paid
          canSeeContact = await canSeeContactDetails(conv.buyerId, conv.listingId)
        }

        // Mask contact info if not authorized
        const safeParticipant = {
          id: otherParticipant.id,
          name: otherParticipant.name,
          image: otherParticipant.image,
          // Only reveal email/phone after payment
          email: canSeeContact ? otherParticipant.email : maskEmail(otherParticipant.email),
          phone: canSeeContact ? otherParticipant.phone : null,
          contactRevealed: canSeeContact,
        }

        return {
          id: conv.id,
          listingId: conv.listingId,
          listing: {
            ...conv.listing,
            primaryImage:
              conv.listing.media[0]?.thumbnailUrl || conv.listing.media[0]?.publicUrl || null,
          },
          otherParticipant: safeParticipant,
          lastMessage,
          unreadCount: conv._count.messages,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        }
      })
    )

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
// IMPORTANT: Private messaging is only available after buyer wins auction AND pays 5% fee
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

    // Check if buyer has won + paid (required for private messaging)
    const canAccessMessaging = await canSeeContactDetails(userId, listingId)

    // Also check if user is the seller (sellers can message after buyer pays)
    const isSellerForPaidAuction = listing.sellerId === userId
      ? false // Already blocked above
      : await prisma.auction.findFirst({
          where: {
            listingId,
            status: 'SOLD',
            paymentStatus: 'PAID',
            listing: { sellerId: userId },
          },
          select: { id: true },
        }).then(a => !!a)

    // Block messaging until payment is complete
    if (!canAccessMessaging && !isSellerForPaidAuction) {
      return NextResponse.json(
        {
          error: 'Private messaging is only available after auction payment is complete',
          code: 'MESSAGING_LOCKED',
          message: 'Win the auction and complete payment to unlock private messaging with the seller. Until then, you can ask questions in the public comments section.',
        },
        { status: 403 }
      )
    }

    // At this point, either buyer paid or seller is responding to paid buyer
    const canSeeContact = true // Payment complete = contact revealed

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
          select: { id: true, name: true, email: true, image: true, phone: true },
        },
      },
    })

    if (existingConversation) {
      // Mask seller contact if buyer hasn't paid
      const safeParticipant = {
        id: existingConversation.seller.id,
        name: existingConversation.seller.name,
        image: existingConversation.seller.image,
        email: canSeeContact
          ? existingConversation.seller.email
          : maskEmail(existingConversation.seller.email),
        phone: canSeeContact ? existingConversation.seller.phone : null,
        contactRevealed: canSeeContact,
      }

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
          otherParticipant: safeParticipant,
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
          select: { id: true, name: true, email: true, image: true, phone: true },
        },
      },
    })

    // Mask seller contact for new conversations (buyer hasn't paid yet)
    const safeParticipant = {
      id: conversation.seller.id,
      name: conversation.seller.name,
      image: conversation.seller.image,
      email: canSeeContact
        ? conversation.seller.email
        : maskEmail(conversation.seller.email),
      phone: canSeeContact ? conversation.seller.phone : null,
      contactRevealed: canSeeContact,
    }

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
          otherParticipant: safeParticipant,
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
