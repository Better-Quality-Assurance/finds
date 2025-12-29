import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { pusher, CHANNELS, EVENTS } from '@/lib/pusher'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/conversations/:id/messages - Get messages in a conversation
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await context.params
    const userId = session.user.id

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to view this conversation' },
        { status: 403 }
      )
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Mark unread messages as read (messages sent by the other party)
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// POST /api/conversations/:id/messages - Send a message
const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
})

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: conversationId } = await context.params
    const userId = session.user.id
    const body = await request.json()
    const { content } = sendMessageSchema.parse(body)

    // Verify user is part of this conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        listing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to send messages in this conversation' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Trigger real-time event via Pusher
    const recipientId =
      conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId

    try {
      await pusher.trigger(
        `private-conversation-${conversationId}`,
        'new-message',
        {
          message: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            sender: message.sender,
            createdAt: message.createdAt,
            isRead: message.isRead,
          },
        }
      )

      // Also trigger a notification event for the recipient
      await pusher.trigger(`private-user-${recipientId}-notifications`, 'new-message', {
        conversationId,
        listingTitle: conversation.listing.title,
        senderName: message.sender.name || message.sender.email,
        preview: content.slice(0, 100),
      })
    } catch (pusherError) {
      console.error('Pusher error:', pusherError)
      // Don't fail the request if Pusher fails
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
