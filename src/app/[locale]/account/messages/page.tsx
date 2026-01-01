'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  MessageSquare,
  Send,
  Car,
  Loader2,
  Lock,
  Mail,
  Phone,
  CheckCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import Pusher from 'pusher-js'

type Message = {
  id: string
  content: string
  senderId: string
  sender: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  createdAt: string
  isRead: boolean
}

type Conversation = {
  id: string
  listingId: string
  listing: {
    id: string
    title: string
    make: string
    model: string
    year: number
    status: string
    primaryImage: string | null
  }
  otherParticipant: {
    id: string
    name: string | null
    email: string
    phone: string | null
    image: string | null
    contactRevealed: boolean
  }
  lastMessage: Message | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export default function MessagesPage() {
  const t = useTranslations('messages')
  const { data: session } = useSession()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    null
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pusherRef = useRef<Pusher | null>(null)

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch conversations callback
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations')
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error(t('fetchError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Set up Pusher for real-time updates
  useEffect(() => {
    if (!selectedConversation?.id) {return}

    // Initialize Pusher
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    }

    const channel = pusherRef.current.subscribe(
      `private-conversation-${selectedConversation.id}`
    )

    channel.bind('new-message', (data: { message: Message }) => {
      setMessages((prev) => [...prev, data.message])

      // Update conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: data.message,
                updatedAt: data.message.createdAt,
              }
            : conv
        )
      )
    })

    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [selectedConversation?.id])

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }
      const data = await response.json()
      setMessages(data.messages || [])

      // Mark conversation as read
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      )
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error(t('fetchMessagesError'))
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageInput.trim() || !selectedConversation) {return}

    const content = messageInput.trim()
    setMessageInput('')
    setSending(true)

    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Optimistically add message (Pusher will also send it, but this is faster)
      setMessages((prev) => [...prev, data.message])

      // Update conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation.id
            ? {
                ...conv,
                lastMessage: data.message,
                updatedAt: data.message.createdAt,
              }
            : conv
        )
      )
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error(t('sendError'))
      // Restore message input on error
      setMessageInput(content)
    } finally {
      setSending(false)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="container max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('description')}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="mt-4 h-20 w-full" />
                <Skeleton className="mt-4 h-20 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('description')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-[calc(100vh-240px)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('conversations')}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-80px)] overflow-y-auto p-0">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t('noConversations')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('noConversationsHint')}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleConversationSelect(conv)}
                      className={cn(
                        'w-full p-4 text-left transition-colors hover:bg-muted',
                        selectedConversation?.id === conv.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.otherParticipant.image || undefined} />
                          <AvatarFallback>
                            {getInitials(
                              conv.otherParticipant.name,
                              conv.otherParticipant.email
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate font-medium">
                              {conv.otherParticipant.name || conv.otherParticipant.email}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge variant="default" className="shrink-0">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {conv.listing.year} {conv.listing.make} {conv.listing.model}
                          </p>
                          {conv.lastMessage && (
                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {conv.lastMessage.content}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.updatedAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages Panel */}
        <div className="lg:col-span-2">
          <Card className="h-[calc(100vh-240px)]">
            {selectedConversation ? (
              <div className="flex h-full flex-col">
                {/* Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    {selectedConversation.listing.primaryImage ? (
                      <img
                        src={selectedConversation.listing.primaryImage}
                        alt={selectedConversation.listing.title}
                        className="h-12 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 items-center justify-center rounded bg-muted">
                        <Car className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">
                        {selectedConversation.otherParticipant.name ||
                          selectedConversation.otherParticipant.email}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {t('regarding')} {selectedConversation.listing.year}{' '}
                        {selectedConversation.listing.make}{' '}
                        {selectedConversation.listing.model}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info Section */}
                  <div className="mt-3 rounded-lg border p-3">
                    {selectedConversation.otherParticipant.contactRevealed ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">
                            {t('contactUnlocked')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`mailto:${selectedConversation.otherParticipant.email}`}
                              className="text-primary hover:underline"
                            >
                              {selectedConversation.otherParticipant.email}
                            </a>
                          </div>
                          {selectedConversation.otherParticipant.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <a
                                href={`tel:${selectedConversation.otherParticipant.phone}`}
                                className="text-primary hover:underline"
                              >
                                {selectedConversation.otherParticipant.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm">
                        <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-muted-foreground">
                            {t('contactLocked')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('contactLockedHint')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground" />
                      <p className="mt-4 text-sm text-muted-foreground">
                        {t('noMessages')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('startConversation')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwn = message.senderId === session?.user?.id
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex gap-3',
                              isOwn ? 'justify-end' : 'justify-start'
                            )}
                          >
                            {!isOwn && (
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={message.sender.image || undefined} />
                                <AvatarFallback>
                                  {getInitials(message.sender.name, message.sender.email)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2',
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm">
                                {message.content}
                              </p>
                              <p
                                className={cn(
                                  'mt-1 text-xs',
                                  isOwn
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {formatDistanceToNow(new Date(message.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </CardContent>

                {/* Input */}
                <div className="border-t p-4">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={t('typeMessage')}
                      disabled={sending}
                      maxLength={5000}
                    />
                    <Button type="submit" disabled={!messageInput.trim() || sending}>
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            ) : (
              <CardContent className="flex h-full items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t('selectConversation')}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
