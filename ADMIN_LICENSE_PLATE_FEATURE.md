# Admin License Plate Viewer - Implementation Summary

## What Was Added

A comprehensive admin interface for viewing original (unblurred) images when license plates are detected in listing photos.

## Files Created

### Components
1. **`/src/components/admin/admin-media-viewer.tsx`** (347 lines)
   - React component for displaying media in admin interface
   - Toggle functionality to switch between blurred and original images
   - Grid view with hover effects and full-screen dialog viewer
   - Badge indicators for primary images and license plate detection
   - Warning alerts explaining privacy protection

2. **`/src/components/ui/separator.tsx`** (33 lines)
   - Radix UI separator component for visual dividers
   - Used in admin detail pages for content organization

### Pages
3. **`/src/app/[locale]/admin/listings/[id]/page.tsx`** (102 lines)
   - Server component for admin listing detail page
   - Fetches complete listing data including all media with license plate info
   - Role-based access control (Admin/Moderator/Reviewer only)
   - Includes AI analysis and auction data

4. **`/src/app/[locale]/admin/listings/[id]/admin-listing-detail-client.tsx`** (656 lines)
   - Client component for interactive admin listing detail view
   - Full listing information display with organized card layout
   - Media viewer integration with license plate toggle
   - Review action dialogs (approve/reject/request changes)
   - Seller information and timeline tracking

### Documentation
5. **`/docs/ADMIN_LICENSE_PLATE_VIEWER.md`** (242 lines)
   - Complete technical documentation
   - Usage examples and API reference
   - Security and privacy considerations
   - Troubleshooting guide

## Files Modified

### Type Definitions
1. **`/src/types/admin.ts`**
   - Added license plate detection fields to `AdminListing` media type:
     - `originalUrl: string | null`
     - `licensePlateDetected: boolean`
     - `licensePlateBlurred: boolean`

### Admin Pages
2. **`/src/app/[locale]/admin/listings/page.tsx`**
   - Updated media query to fetch license plate detection fields
   - Added explicit select for media fields

3. **`/src/app/[locale]/admin/listings/admin-listings-client.tsx`**
   - Added `ShieldAlert` icon import
   - Added license plate badge indicator in photo count area
   - Changed "View Full Details" button to functional link

### API Routes
4. **`/src/app/api/admin/listings/route.ts`**
   - Updated media query to include license plate detection fields
   - Ensures API returns necessary data for admin interface

## Key Features

### 1. Visual Indicators
- **Listings Overview**: Red "Plate" badge when license plates detected
- **Detail View**: Orange warning banner explaining privacy protection
- **Image Badges**:
  - Red/Orange badges on images with detected plates
  - Blue badges for primary images

### 2. Toggle Functionality
- **Grid View**: Small eye icon button on each affected image
- **Full-Screen Dialog**: Two clear toggle buttons:
  - "Show Blurred (Public)" - Public version
  - "Show Original (Admin Only)" - Unprocessed original

### 3. Privacy Protection
- Original URLs only accessible to admins
- Clear warnings about admin-only access
- Maintains public privacy while enabling admin review

### 4. Complete Media Management
- Grid layout with responsive design
- Hover effects and click-to-enlarge
- Category and caption display
- Position and metadata tracking
- Detection confidence scores (when available)

## Database Fields Used

From `ListingMedia` model:
```typescript
{
  publicUrl: string           // Public-facing URL (blurred if plate detected)
  originalUrl: string | null  // Original unprocessed URL (admin-only)
  licensePlateDetected: boolean
  licensePlateBlurred: boolean
  plateDetectionData: Json    // Confidence scores, bounding boxes
}
```

## Access Control

- **Required Roles**: ADMIN, MODERATOR, or REVIEWER
- **Protected Routes**: All `/admin/*` pages check user role
- **API Protection**: Admin endpoints verify permissions
- **Audit Logging**: Configured for admin listing actions

## User Flow

1. Admin navigates to `/admin/listings`
2. Sees listings with "Plate" badge if plates detected
3. Clicks "View Full Details" on a listing
4. Views orange warning banner explaining privacy protection
5. Sees media grid with shield badges on affected images
6. Clicks eye icon to toggle between blurred and original
7. Opens full-screen viewer for larger view
8. Uses toggle buttons to switch between versions

## Testing Checklist

- [ ] Navigate to `/admin/listings` as admin user
- [ ] Verify "Plate" badge appears on affected listings
- [ ] Click "View Full Details" on listing with detected plates
- [ ] Confirm orange warning banner displays
- [ ] Verify shield badges on affected images in grid
- [ ] Test toggle button in grid view
- [ ] Open full-screen dialog viewer
- [ ] Test toggle buttons in dialog
- [ ] Verify blurred version matches public view
- [ ] Verify original version shows unblurred image
- [ ] Check detection confidence display (if available)

## Technical Stack

- **Framework**: Next.js 14+ with App Router
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React useState hooks
- **Image Handling**: Next.js Image component
- **Icons**: Lucide React
- **Type Safety**: TypeScript with strict types

## Browser Compatibility

- Modern browsers with ES6+ support
- Responsive design for desktop and tablet
- Touch-friendly controls for tablet admins

## Performance Considerations

- Images lazy-loaded with Next.js Image
- Grid view shows thumbnails/optimized versions
- Full-screen dialog loads full-size on demand
- Toggle state managed in client component (no re-fetch)
- Original URLs only loaded when admin toggles view

## Future Enhancements

- Audit logging when admins view originals
- False positive reporting
- Bulk re-processing interface
- Manual detection override
- Additional PII detection (faces, documents)

## Security Notes

1. **originalUrl** field never exposed in public APIs
2. Server-side role verification on all admin routes
3. Client-side checks for defense-in-depth
4. Clear UI indicators for admin-only content
5. Audit trail for accountability

## Related Documentation

- Main docs: `/docs/ADMIN_LICENSE_PLATE_VIEWER.md`
- Database schema: `/prisma/schema.prisma` (lines 213-243)
- Type definitions: `/src/types/admin.ts`
- Project guidelines: `/CLAUDE.md`
