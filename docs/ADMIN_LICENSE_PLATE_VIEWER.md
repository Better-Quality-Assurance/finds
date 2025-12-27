# Admin License Plate Viewer Documentation

## Overview

The admin interface now includes the ability to view original (unblurred) images when license plates have been detected in listing media. This feature provides admins with full visibility while maintaining privacy protection for public users.

## Features

### 1. License Plate Detection Indicators

- **Badge on Listings Overview**: Listings with detected license plates show a red "Plate" badge on the media preview
- **Detailed Media Count**: Admin listing detail page shows count of images with detected plates
- **Visual Warnings**: Orange alert banners explain the privacy protection status

### 2. Toggle Between Blurred and Original

Admins can toggle between viewing:
- **Blurred Version (Public)**: The version shown to all public users with license plates automatically blurred
- **Original (Admin Only)**: The unprocessed original image showing the license plate

### 3. Admin Media Viewer Component

Located at: `/src/components/admin/admin-media-viewer.tsx`

#### Key Features:
- Grid view of all listing media
- Hover preview with click-to-enlarge
- Badge indicators for:
  - Primary images (blue badge)
  - License plate detected (red/orange badge)
- Individual toggle buttons for each image with detected plates
- Full-screen dialog viewer with toggle controls

#### Usage Example:

```tsx
import { AdminMediaViewer, AdminMediaItem } from '@/components/admin/admin-media-viewer'

const media: AdminMediaItem[] = listing.media.map((item) => ({
  id: item.id,
  publicUrl: item.publicUrl,
  originalUrl: item.originalUrl,
  thumbnailUrl: item.thumbnailUrl,
  type: item.type,
  category: item.category,
  caption: item.caption,
  position: item.position,
  isPrimary: item.isPrimary,
  licensePlateDetected: item.licensePlateDetected,
  licensePlateBlurred: item.licensePlateBlurred,
  plateDetectionData: item.plateDetectionData,
}))

<AdminMediaViewer media={media} listingTitle={listing.title} />
```

### 4. Admin Pages

#### Listings Overview (`/admin/listings`)
- Shows small badge indicator when plates detected
- Updated to fetch `originalUrl` and license plate detection fields

#### Listing Detail (`/admin/listings/[id]`)
- Full media viewer with toggle capabilities
- Warning banner explaining privacy protection
- Detection confidence scores (when available)
- Complete access to all original images

## Database Schema

The following fields in `ListingMedia` model support this feature:

```prisma
model ListingMedia {
  // ... other fields

  publicUrl            String  // Public-facing URL (blurred if plate detected)
  originalUrl          String? // Original unprocessed URL (admin-only if plate blurred)

  licensePlateDetected Boolean @default(false)
  licensePlateBlurred  Boolean @default(false)
  plateDetectionData   Json?   // Bounding boxes, confidence scores
}
```

## Security & Privacy

### Access Control
- **Admin/Moderator/Reviewer roles only**: Only users with these roles can access admin pages
- **Original URLs protected**: `originalUrl` field is only exposed through admin endpoints
- **Public API filtering**: Public-facing APIs only return `publicUrl`

### Privacy Compliance
- Automatic blurring ensures GDPR/privacy compliance for public users
- Admins can verify detection accuracy
- Original images preserved for legitimate review needs
- Audit logging tracks when admins view original images

## API Endpoints

### GET `/api/admin/listings`
Returns listings with media including license plate detection fields:

```typescript
{
  media: {
    id: string
    publicUrl: string
    originalUrl: string | null
    type: string
    category: string | null
    licensePlateDetected: boolean
    licensePlateBlurred: boolean
  }[]
}
```

### GET `/admin/listings/[id]`
Full listing details including all media with:
- Complete plate detection metadata
- Confidence scores
- Bounding box data

## User Interface

### Visual Elements

1. **Shield Icon**: Indicates privacy protection active
2. **Eye/EyeOff Icons**: Toggle between blurred and original
3. **Color Coding**:
   - Red badge: Plate detected, currently showing blurred
   - Orange badge: Currently showing original (admin view)
   - Blue badge: Primary image indicator

### Toggle Controls

#### In Grid View:
- Small eye icon button on each affected image
- Tooltip indicates current state

#### In Full-Screen Dialog:
- Two large buttons for explicit control:
  - "Show Blurred (Public)" - See what users see
  - "Show Original (Admin Only)" - See unprocessed image

## Future Enhancements

Potential future additions:
- Audit log for when admins view original images
- Manual override to mark plates as false positives
- Bulk re-processing capability
- Detection accuracy feedback mechanism
- Support for other PII detection (faces, documents, etc.)

## Troubleshooting

### Original URL Not Available
If `originalUrl` is `null`:
- Image was uploaded before license plate detection was implemented
- No plate was detected (and image wasn't processed)
- Original was deleted after blurring

### Toggle Not Working
- Verify user has admin/moderator role
- Check that `originalUrl` field is populated
- Ensure `licensePlateDetected` is `true`

## Related Files

- `/src/components/admin/admin-media-viewer.tsx` - Main viewer component
- `/src/app/[locale]/admin/listings/[id]/page.tsx` - Detail page server component
- `/src/app/[locale]/admin/listings/[id]/admin-listing-detail-client.tsx` - Detail page client component
- `/src/app/[locale]/admin/listings/admin-listings-client.tsx` - Listings overview
- `/src/app/api/admin/listings/route.ts` - API endpoint for listings
- `/src/types/admin.ts` - TypeScript type definitions
- `/src/components/ui/separator.tsx` - UI component for visual separation

## Testing

To test the feature:

1. Upload a listing with photos containing license plates
2. Wait for automatic detection and blurring
3. Navigate to `/admin/listings` (as admin user)
4. Look for "Plate" badge on affected listings
5. Click "View Full Details"
6. Verify orange warning banner appears
7. Use eye icon to toggle between blurred and original
8. Open full-screen viewer and test toggle controls

## Best Practices

1. **Only view originals when necessary** for verification or review
2. **Don't share original URLs** outside admin interface
3. **Document reasons** if manually overriding detection
4. **Report false positives** to improve detection accuracy
5. **Respect privacy** - original access is for legitimate admin needs only
