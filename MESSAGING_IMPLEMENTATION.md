# Messaging System Implementation

A complete buyer-seller messaging system has been implemented for the Finds auction platform.

## Files Created

### Database Schema
- **`/Users/brad/Code2/finds/prisma/schema.prisma`** - Added `Conversation` and `Message` models with proper relations

### API Routes
- **`/Users/brad/Code2/finds/src/app/api/conversations/route.ts`** - List and create conversations
- **`/Users/brad/Code2/finds/src/app/api/conversations/[id]/messages/route.ts`** - Fetch and send messages

### UI Components
- **`/Users/brad/Code2/finds/src/app/[locale]/account/messages/page.tsx`** - Full messaging interface with real-time updates
- **`/Users/brad/Code2/finds/src/components/listing/ask-seller-button.tsx`** - Button component to initiate conversations

### Translations
- **`/Users/brad/Code2/finds/messages/en.json`** - English translations for messaging
- **`/Users/brad/Code2/finds/messages/ro.json`** - Romanian translations for messaging

## Features Implemented

### 1. Database Models
```prisma
model Conversation {
  id        String   @id @default(cuid())
  listingId String   @map("listing_id")
  buyerId   String   @map("buyer_id")
  sellerId  String   @map("seller_id")
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([listingId, buyerId]) // One conversation per buyer per listing
}

model Message {
  id             String       @id @default(cuid())
  conversationId String       @map("conversation_id")
  senderId       String       @map("sender_id")
  content        String       @db.Text
  isRead         Boolean      @default(false)
  createdAt      DateTime     @default(now())
}
```

### 2. API Endpoints

**GET /api/conversations**
- Lists all conversations for the authenticated user
- Includes unread message count
- Returns listing details and last message

**POST /api/conversations**
- Creates or retrieves a conversation for a listing
- Prevents sellers from messaging their own listings
- Returns existing conversation if already exists

**GET /api/conversations/:id/messages**
- Fetches all messages in a conversation
- Automatically marks messages as read
- Verifies user has access to the conversation

**POST /api/conversations/:id/messages**
- Sends a new message
- Triggers real-time Pusher event
- Updates conversation timestamp

### 3. Real-time Updates

The messaging system uses **Pusher** for real-time message delivery:

- Messages appear instantly without page refresh
- Uses channel: `private-conversation-{conversationId}`
- Event: `new-message`
- Also triggers notification to recipient via `private-user-{userId}-notifications`

### 4. Messages Page (`/account/messages`)

Features:
- **Conversation list** (left sidebar)
  - Shows avatar, name, listing details
  - Displays last message preview
  - Unread message badge
  - Sorted by most recent activity

- **Message thread** (right panel)
  - Full conversation history
  - Real-time message updates
  - Scrolls to bottom automatically
  - Shows sender avatars and timestamps
  - Distinguished styling for own vs. other messages

- **Message input**
  - Text input with Send button
  - Character limit: 5000 characters
  - Disabled during sending
  - Optimistic UI updates

### 5. Ask Seller Button Component

**Usage Example:**

```tsx
import { AskSellerButton } from '@/components/listing/ask-seller-button'

// In your listing page:
<AskSellerButton listingId={listing.id} />

// With custom styling:
<AskSellerButton
  listingId={listing.id}
  variant="default"
  size="lg"
  className="w-full"
/>
```

**Features:**
- Requires authentication (redirects to login)
- Prevents sellers from messaging their own listings
- Creates conversation if it doesn't exist
- Redirects to messages page with conversation selected
- Loading state while processing

## Integration Instructions

### Add to Listing Detail Page

Edit `/Users/brad/Code2/finds/src/app/[locale]/auctions/[id]/page.tsx`:

```tsx
import { AskSellerButton } from '@/components/listing/ask-seller-button'

// Inside the component, add the button near other action buttons:
<div className="flex gap-2">
  <AskSellerButton listingId={auction.listing.id} variant="outline" />
  {/* Other buttons (watchlist, bid, etc.) */}
</div>
```

### Add to Navigation (Optional)

To add a Messages link to the account navigation, edit your navigation component:

```tsx
import { MessageSquare } from 'lucide-react'

// In navigation items:
{
  href: '/account/messages',
  label: t('nav.messages'),
  icon: MessageSquare
}
```

### Deploy Database Changes

When deploying to production:

```bash
# On your deployment platform (Railway, Vercel, etc.)
npm run db:push
# or
npx prisma db push

# This will create:
# - conversations table
# - messages table
# - Add relations to users and listings tables
```

## Security Features

1. **Authentication Required** - All endpoints require valid session
2. **Authorization Checks** - Users can only access their own conversations
3. **Seller Protection** - Cannot message own listings
4. **Input Validation** - Zod schemas validate all inputs
5. **SQL Injection Prevention** - Prisma ORM handles all queries
6. **XSS Prevention** - Content is properly escaped in UI

## Business Rules

1. **One conversation per buyer per listing** - Unique constraint prevents duplicates
2. **Sellers own the conversation** - Seller is determined by listing ownership
3. **Cascade deletes** - Messages deleted when conversation is deleted
4. **Read receipts** - Messages marked as read when conversation is opened
5. **No file attachments in v1** - Text-only messaging for simplicity

## Pusher Configuration

Ensure these environment variables are set:

```bash
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster
PUSHER_APP_ID=your_pusher_app_id
PUSHER_SECRET=your_pusher_secret
```

The Pusher client is already configured in `/Users/brad/Code2/finds/src/lib/pusher.ts`.

## Future Enhancements (Not Implemented)

Potential improvements for future versions:

1. **File attachments** - Allow photos/documents
2. **Message search** - Search within conversations
3. **Email notifications** - Notify users of new messages
4. **Typing indicators** - Show when other party is typing
5. **Message deletion** - Allow users to delete messages
6. **Conversation archiving** - Archive old conversations
7. **Block users** - Prevent messaging from specific users
8. **Admin monitoring** - Allow admins to view conversations for moderation

## Testing Checklist

- [ ] Buyer can click "Ask Seller" on a listing
- [ ] Conversation is created successfully
- [ ] Message appears in real-time
- [ ] Unread count updates correctly
- [ ] Seller cannot message their own listing
- [ ] Unauthenticated users are redirected to login
- [ ] Messages are marked as read when opened
- [ ] Conversation list is sorted by most recent
- [ ] Works in both English and Romanian locales

## Translation Keys

All messaging-related translations are under the `messages` namespace:

- `messages.title` - Page title
- `messages.askSeller` - Button text
- `messages.noConversations` - Empty state
- `messages.typeMessage` - Input placeholder
- etc.

See `/Users/brad/Code2/finds/messages/en.json` for complete list.

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify Pusher connection in Network tab
3. Ensure DATABASE_URL is set in production
4. Check that Prisma migrations have been applied
5. Verify user is authenticated with valid session
