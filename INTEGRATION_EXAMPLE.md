# Ask Seller Button - Integration Example

## Quick Start

Add the "Ask Seller" button to the auction detail page to allow buyers to message sellers about listings.

## Step 1: Import the Component

Add this import at the top of `/Users/brad/Code2/finds/src/app/[locale]/auctions/[id]/page.tsx`:

```tsx
import { AskSellerButton } from '@/components/listing/ask-seller-button'
```

## Step 2: Add the Button

There are several good placement options:

### Option A: Below the Seller Info (Recommended)

Add after line 332, inside the seller info card:

```tsx
{/* Seller info - anonymized for privacy */}
<div className="rounded-lg border p-3 sm:p-4">
  <h3 className="text-sm font-medium sm:text-base">Seller</h3>
  <div className="mt-2 flex items-center gap-3 sm:mt-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success text-sm text-success-foreground sm:h-10 sm:w-10">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-sm font-medium sm:text-base">
        Verified Seller
        <Badge variant="success" className="text-[10px]">Verified</Badge>
      </div>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Member since{' '}
        {new Date(listing.seller.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
        })}
      </p>
    </div>
  </div>

  {/* ADD THIS: Ask Seller Button */}
  <div className="mt-3 sm:mt-4">
    <AskSellerButton
      listingId={listing.id}
      variant="outline"
      className="w-full"
    />
  </div>
</div>
```

### Option B: As a Standalone Card (Alternative)

Add as a new section between the seller info and comments (after line 333):

```tsx
{/* Contact Seller */}
<div className="rounded-lg border p-3 sm:p-4">
  <h3 className="mb-3 text-sm font-medium sm:mb-4 sm:text-base">
    Have Questions?
  </h3>
  <AskSellerButton
    listingId={listing.id}
    variant="default"
    size="lg"
    className="w-full"
  />
  <p className="mt-2 text-xs text-muted-foreground">
    Send a message to the seller to ask questions about this vehicle
  </p>
</div>
```

### Option C: In the BidPanel Sidebar (Mobile & Desktop)

To add inside the BidPanel component itself, edit:
`/Users/brad/Code2/finds/src/components/auction/bid-panel.tsx`

Import at the top:
```tsx
import { AskSellerButton } from '@/components/listing/ask-seller-button'
```

Add after the bid button (look for the section with the "Place Bid" button):

```tsx
{/* Existing bid button */}
<Button>Place Bid</Button>

{/* ADD THIS: Ask Seller Button */}
<AskSellerButton
  listingId={auction.listing.id}
  variant="outline"
  className="w-full"
/>
```

## Component Props

The `AskSellerButton` component accepts these props:

```tsx
type AskSellerButtonProps = {
  listingId: string          // Required: The listing ID
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string         // Additional Tailwind classes
}
```

## Examples

### Full Width Primary Button
```tsx
<AskSellerButton
  listingId={listing.id}
  variant="default"
  size="lg"
  className="w-full"
/>
```

### Small Outline Button
```tsx
<AskSellerButton
  listingId={listing.id}
  variant="outline"
  size="sm"
/>
```

### With Custom Styling
```tsx
<AskSellerButton
  listingId={listing.id}
  variant="secondary"
  className="w-full sm:w-auto"
/>
```

## Behavior

1. **Unauthenticated Users**: Redirected to `/login` with error toast
2. **Own Listing**: Shows error toast "You cannot message your own listing"
3. **New Conversation**: Creates conversation and redirects to `/account/messages`
4. **Existing Conversation**: Redirects to existing conversation in `/account/messages`
5. **Loading State**: Button shows spinner while processing

## Testing

After adding the button:

1. **As a buyer**: Click "Ask Seller" → Should redirect to messages page
2. **As the seller**: Click "Ask Seller" → Should show error toast
3. **Not logged in**: Click "Ask Seller" → Should redirect to login

## Full Implementation Example

Here's a complete example showing the recommended placement:

```tsx
// File: /Users/brad/Code2/finds/src/app/[locale]/auctions/[id]/page.tsx

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { BidPanel } from '@/components/auction/bid-panel'
import { ImageGallery } from './image-gallery'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { MapPin, Calendar, Gauge, Car, Wrench, FileText } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'
import { AskSellerButton } from '@/components/listing/ask-seller-button' // ADD THIS
import {
  transformAuctionForBidPanel,
  transformBidsForBidPanel,
} from '@/utils/auction-transformers'

// ... rest of component ...

{/* Seller info - anonymized for privacy */}
<div className="rounded-lg border p-3 sm:p-4">
  <h3 className="text-sm font-medium sm:text-base">Seller</h3>
  <div className="mt-2 flex items-center gap-3 sm:mt-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success text-sm text-success-foreground sm:h-10 sm:w-10">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-sm font-medium sm:text-base">
        Verified Seller
        <Badge variant="success" className="text-[10px]">Verified</Badge>
      </div>
      <p className="text-xs text-muted-foreground sm:text-sm">
        Member since{' '}
        {new Date(listing.seller.createdAt).toLocaleDateString('en-US', {
          year: 'numeric',
        })}
      </p>
    </div>
  </div>

  {/* Contact Seller Button */}
  <div className="mt-3 border-t pt-3 sm:mt-4 sm:pt-4">
    <AskSellerButton
      listingId={listing.id}
      variant="outline"
      className="w-full"
    />
  </div>
</div>
```

## Navigation Integration (Optional)

To add "Messages" to the account navigation menu, edit your navigation component and add:

```tsx
{
  href: '/account/messages',
  label: 'Messages',  // or t('nav.messages') for i18n
  icon: MessageSquare
}
```

The translations are already in place:
- English: `nav.messages` = "Messages"
- Romanian: `nav.messages` = "Mesaje"
