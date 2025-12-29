# Seller Reviews System Implementation

## Overview

A comprehensive seller ratings and reviews system has been implemented for the Finds platform. This allows buyers who have won and paid for auctions to leave reviews for sellers, building trust and transparency in the marketplace.

## Database Schema Changes

### New Model: SellerReview

Location: `/Users/brad/Code2/finds/prisma/schema.prisma`

```prisma
model SellerReview {
  id         String   @id @default(cuid())
  sellerId   String   @map("seller_id")
  seller     User     @relation("SellerReviews", fields: [sellerId], references: [id], onDelete: Cascade)
  reviewerId String   @map("reviewer_id")
  reviewer   User     @relation("ReviewsGiven", fields: [reviewerId], references: [id], onDelete: Cascade)
  auctionId  String   @map("auction_id")
  auction    Auction  @relation(fields: [auctionId], references: [id], onDelete: Cascade)

  rating     Int      // 1-5 stars
  title      String?
  content    String?  @db.Text

  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@unique([auctionId, reviewerId]) // One review per auction per buyer
  @@index([sellerId, createdAt(sort: Desc)])
  @@map("seller_reviews")
}
```

### User Model Updates

Added seller rating fields to User model:
- `averageRating Float?` - Calculated average of all reviews (1-5)
- `totalReviews Int @default(0)` - Count of reviews received
- Relations for `sellerReviews` and `reviewsGiven`

### Auction Model Updates

Added `sellerReviews` relation to track reviews for auctions.

## API Routes

### GET /api/sellers/[id]/reviews

Fetches reviews for a specific seller with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response:**
```json
{
  "reviews": [
    {
      "id": "review_id",
      "rating": 5,
      "title": "Excellent seller!",
      "content": "Great communication and accurate description.",
      "createdAt": "2025-01-15T10:30:00Z",
      "reviewer": {
        "id": "user_id",
        "name": "John Doe",
        "image": "https://..."
      },
      "auction": {
        "id": "auction_id",
        "listing": {
          "title": "1967 Porsche 911",
          "make": "Porsche",
          "model": "911",
          "year": 1967
        }
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 23,
    "totalPages": 3
  },
  "summary": {
    "averageRating": 4.8,
    "totalReviews": 23
  }
}
```

### POST /api/sellers/[id]/reviews

Create a new review for a seller.

**Authentication:** Required

**Validation:**
- User must be authenticated
- User must have won the auction (winnerId matches)
- Payment must be completed (paymentStatus = PAID)
- Cannot review yourself
- One review per auction per buyer
- Rating must be 1-5
- Title: 3-100 characters (optional)
- Content: 10-2000 characters (optional)

**Request Body:**
```json
{
  "auctionId": "auction_id",
  "rating": 5,
  "title": "Excellent seller!",
  "content": "Great communication and accurate description."
}
```

**Features:**
- Creates review
- Recalculates seller's average rating
- Updates seller's total review count
- All operations in a transaction for data consistency

## Components

### 1. SellerRatingBadge

Location: `/Users/brad/Code2/finds/src/components/seller/seller-rating-badge.tsx`

Displays a star rating badge with count.

**Props:**
- `averageRating: number | null` - The average rating (1-5)
- `totalReviews: number` - Total number of reviews
- `size?: 'sm' | 'md' | 'lg'` - Size variant (default: 'md')
- `showCount?: boolean` - Show review count (default: true)
- `className?: string` - Additional CSS classes

**Example:**
```tsx
<SellerRatingBadge
  averageRating={4.8}
  totalReviews={23}
  size="md"
/>
// Renders: ⭐ 4.8 (23)
```

### 2. SellerReviewsList

Location: `/Users/brad/Code2/finds/src/components/seller/seller-reviews-list.tsx`

Displays paginated list of reviews for a seller.

**Props:**
- `sellerId: string` - The seller's user ID

**Features:**
- Fetches reviews with pagination
- Shows reviewer avatar, name, rating, and content
- Displays vehicle information
- Relative timestamps (e.g., "3 days ago")
- Loading skeletons
- Empty state
- Pagination controls

### 3. LeaveReviewDialog

Location: `/Users/brad/Code2/finds/src/components/seller/leave-review-dialog.tsx`

Modal dialog for leaving a review.

**Props:**
- `sellerId: string` - The seller's user ID
- `sellerName: string | null` - The seller's display name
- `auctionId: string` - The auction ID
- `vehicleInfo: { year, make, model }` - Vehicle details
- `children?: React.ReactNode` - Custom trigger button

**Features:**
- Interactive star rating (1-5)
- Rating labels (Poor, Fair, Good, Very Good, Excellent)
- Optional title field
- Optional review content (10-2000 characters)
- Form validation with Zod
- Error handling and success notifications
- Refreshes page data after submission

**Usage:**
```tsx
<LeaveReviewDialog
  sellerId="seller_id"
  sellerName="John Smith"
  auctionId="auction_id"
  vehicleInfo={{
    year: 1967,
    make: "Porsche",
    model: "911"
  }}
/>
```

### 4. Seller Profile Page

Location: `/Users/brad/Code2/finds/src/app/[locale]/sellers/[id]/page.tsx`

Dedicated seller profile page showing:

**Sidebar:**
- Seller avatar
- Display name
- Member since date
- Rating badge
- Total listings count
- Active listings count
- Link to view all listings

**Main Content:**
- Active auctions grid (up to 6)
- Full reviews list with pagination
- Empty states

**URL:** `/{locale}/sellers/{sellerId}`

## Integration Points

### 1. Auction Detail Pages

Location: `/Users/brad/Code2/finds/src/app/[locale]/auctions/[id]/page.tsx`

**Changes:**
- Updated seller query to include `averageRating` and `totalReviews`
- Added seller rating badge display
- Added "View Profile" link to seller profile page

### 2. Auction Cards

Location: `/Users/brad/Code2/finds/src/components/auction/auction-card.tsx`

**Changes:**
- Updated type definition to include optional seller data
- Added seller rating badge below location
- Only displays if seller has reviews

**Usage Note:** When fetching auctions for display in cards, include seller data:
```typescript
const auctions = await prisma.auction.findMany({
  include: {
    listing: {
      include: {
        seller: {
          select: {
            id: true,
            averageRating: true,
            totalReviews: true,
          },
        },
        media: true,
      },
    },
  },
})
```

## Translations

### English (en.json)

Added complete `reviews` namespace with:
- Form labels and placeholders
- Rating labels (Poor to Excellent)
- Status messages
- Profile page labels
- Pagination labels

### Romanian (ro.json)

Complete Romanian translations for all review functionality.

## Business Rules

1. **Review Eligibility:**
   - Must be authenticated
   - Must have won the auction
   - Payment must be completed (PAID status)
   - Cannot review yourself
   - One review per auction per buyer

2. **Rating Calculation:**
   - Average is recalculated after each review
   - Stored as Float (e.g., 4.75)
   - Displayed rounded to 1 decimal (e.g., 4.8)

3. **Review Content:**
   - Rating: Required (1-5 stars)
   - Title: Optional (3-100 chars)
   - Content: Optional (10-2000 chars)

4. **Privacy:**
   - Reviewer name and avatar displayed
   - Vehicle information shown (not full listing)
   - Timestamps in relative format

## Database Migration

After pulling these changes, run:

```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
```

Or create a migration:

```bash
npx prisma migrate dev --name add_seller_reviews
```

## Future Enhancements (Optional)

Consider these features for future iterations:

1. **Seller Response:** Allow sellers to respond to reviews
2. **Review Photos:** Let buyers attach photos to reviews
3. **Verified Purchase Badge:** Visual indicator for verified reviews
4. **Review Sorting:** Sort by rating, date, helpful votes
5. **Helpful Votes:** Let users mark reviews as helpful
6. **Review Moderation:** Flag inappropriate reviews
7. **Review Editing:** Allow buyers to edit their reviews (with edit history)
8. **Email Notifications:** Notify sellers of new reviews
9. **Review Reminders:** Prompt winners to leave reviews after successful purchase
10. **Aggregate Statistics:** Show rating distribution (e.g., 70% 5-star, 20% 4-star)

## Testing Checklist

- [ ] Create a review as a winning bidder with completed payment
- [ ] Verify review appears on seller profile
- [ ] Verify seller's average rating is calculated correctly
- [ ] Verify pagination works on reviews list
- [ ] Test preventing duplicate reviews for same auction
- [ ] Test preventing reviews before payment completion
- [ ] Test preventing self-reviews
- [ ] Verify rating badge appears on auction cards
- [ ] Verify rating badge appears on auction detail pages
- [ ] Test in both English and Romanian locales
- [ ] Verify responsive design on mobile

## Files Modified/Created

### Created Files:
- `/Users/brad/Code2/finds/src/app/api/sellers/[id]/reviews/route.ts`
- `/Users/brad/Code2/finds/src/components/seller/seller-rating-badge.tsx`
- `/Users/brad/Code2/finds/src/components/seller/seller-reviews-list.tsx`
- `/Users/brad/Code2/finds/src/components/seller/leave-review-dialog.tsx`
- `/Users/brad/Code2/finds/src/app/[locale]/sellers/[id]/page.tsx`

### Modified Files:
- `/Users/brad/Code2/finds/prisma/schema.prisma`
- `/Users/brad/Code2/finds/src/app/[locale]/auctions/[id]/page.tsx`
- `/Users/brad/Code2/finds/src/components/auction/auction-card.tsx`
- `/Users/brad/Code2/finds/messages/en.json`
- `/Users/brad/Code2/finds/messages/ro.json`

## Architecture Notes

- **SOLID Principles:** API route follows single responsibility principle
- **Type Safety:** Full TypeScript coverage with Zod validation
- **Transaction Safety:** Database operations use Prisma transactions
- **i18n Ready:** All text uses next-intl translation keys
- **Responsive:** Components work on mobile and desktop
- **Accessibility:** Proper ARIA labels and semantic HTML
- **Performance:** Efficient queries with proper indexing
- **Security:** Authentication and authorization checks in place
