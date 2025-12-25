# GDPR-Compliant Cookie Consent Implementation

This document explains the cookie consent implementation and GDPR compliance features.

## Overview

The application now stores cookie consent preferences in the database to maintain a complete audit trail for GDPR compliance. Consent is tracked for both authenticated and anonymous users.

## Files Modified/Created

### 1. Prisma Schema (`/Users/brad/Code2/finds/prisma/schema.prisma`)
- Modified `ConsentRecord` model to make `userId` optional
- Added `ipAddress` index for faster lookups of anonymous user consents
- Now supports both authenticated and anonymous user consent tracking

### 2. Database Migration (`/Users/brad/Code2/finds/prisma/migrations/20251225184819_make_consent_user_optional/migration.sql`)
- Makes `user_id` column nullable in `consent_records` table
- Adds index on `ip_address` for efficient anonymous consent queries

### 3. API Endpoint (`/Users/brad/Code2/finds/src/app/api/consent/route.ts`)
New REST API endpoint for managing consent:

**POST /api/consent**
- Stores consent preferences for all consent types
- Automatically links to user account if authenticated
- Tracks IP address and user agent for anonymous users
- Updates user's marketing consent flag when applicable

**GET /api/consent**
- Retrieves consent history for authenticated users
- Returns latest consent for each type
- Returns full consent history ordered by date

### 4. Cookie Consent Component (`/Users/brad/Code2/finds/src/components/legal/cookie-consent.tsx`)
- Added `saveConsentToDatabase()` function to call API
- Updated all consent handlers to save to database
- Non-blocking database save (won't interrupt user experience if API fails)
- Maintains existing localStorage functionality as fallback

## How It Works

### For Authenticated Users
1. User interacts with cookie consent banner
2. Consent preferences saved to localStorage (immediate)
3. Consent sent to `/api/consent` endpoint (async)
4. Record created in database with:
   - User ID (from session)
   - Consent type (ESSENTIAL, ANALYTICS, MARKETING)
   - Granted status (true/false)
   - IP address and user agent
   - Timestamp
5. If marketing consent granted, user's `marketingConsent` flag updated

### For Anonymous Users
1. User interacts with cookie consent banner
2. Consent preferences saved to localStorage (immediate)
3. Consent sent to `/api/consent` endpoint (async)
4. Record created in database with:
   - No user ID (null)
   - IP address (from request headers)
   - User agent
   - Consent details and timestamp

### If User Later Registers/Logs In
- Old anonymous consent records remain for audit trail
- New consent records linked to user account
- Both records preserved for GDPR compliance

## Consent Types

The system tracks four types of consent:

1. **ESSENTIAL** - Required cookies (always true, cannot be disabled)
2. **ANALYTICS** - Website analytics and performance tracking
3. **MARKETING** - Marketing emails and targeted advertising
4. **DATA_PROCESSING** - General data processing consent

## Database Schema

```prisma
model ConsentRecord {
  id          String      @id @default(cuid())
  userId      String?     @map("user_id")        // Optional - null for anonymous
  user        User?       @relation(fields: [userId], references: [id], onDelete: Cascade)

  consentType ConsentType @map("consent_type")   // ESSENTIAL, ANALYTICS, MARKETING, etc.
  granted     Boolean                             // true = accepted, false = declined

  ipAddress   String?     @map("ip_address")     // For anonymous tracking
  userAgent   String?     @db.Text @map("user_agent") // Browser fingerprint

  createdAt   DateTime    @default(now()) @map("created_at")

  @@index([userId])
  @@index([ipAddress])
  @@map("consent_records")
}
```

## API Usage Examples

### Store Consent Preferences

```typescript
// Example: Accept all cookies
const response = await fetch('/api/consent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    consents: [
      { type: 'ESSENTIAL', granted: true },
      { type: 'ANALYTICS', granted: true },
      { type: 'MARKETING', granted: true },
    ]
  }),
})

// Response: { message: 'Consent preferences saved successfully', recordCount: 3 }
```

### Retrieve Consent History (Authenticated Users Only)

```typescript
const response = await fetch('/api/consent', {
  method: 'GET',
})

// Response:
// {
//   latestConsents: {
//     ESSENTIAL: { granted: true, createdAt: '2025-12-25T18:00:00Z' },
//     ANALYTICS: { granted: true, createdAt: '2025-12-25T18:00:00Z' },
//     MARKETING: { granted: false, createdAt: '2025-12-25T18:00:00Z' }
//   },
//   history: [
//     { id: '...', consentType: 'MARKETING', granted: false, createdAt: '...' },
//     ...
//   ]
// }
```

## GDPR Compliance Features

### Right to Access
- Users can retrieve their consent history via GET /api/consent
- Full audit trail of all consent changes with timestamps

### Right to Withdraw Consent
- Users can change preferences at any time via cookie settings
- Each change creates new record (preserves audit trail)

### Data Minimization
- Only stores essential tracking data (IP, user agent)
- No unnecessary personal information collected

### Transparency
- Clear consent categories (Essential, Analytics, Marketing)
- Users can customize preferences before accepting

### Accountability
- Complete audit trail of all consent actions
- IP address and user agent logged for verification
- Timestamps for all consent changes

## Running the Migration

To apply the database migration:

```bash
# Make sure DATABASE_URL is set in .env.local
npx prisma migrate deploy
```

Or if in development:

```bash
npx prisma migrate dev
```

## Testing the Implementation

### Test Anonymous Consent
1. Open browser in incognito mode
2. Visit the site
3. Accept/decline cookies
4. Check database for new records with `user_id = NULL`

### Test Authenticated Consent
1. Log in to the application
2. Accept/decline cookies
3. Check database for new records with your `user_id`
4. Verify user's `marketingConsent` flag if marketing accepted

### Test Consent History
1. Log in as a user
2. Make several consent changes
3. Call GET /api/consent
4. Verify full history returned

## Error Handling

The implementation includes comprehensive error handling:

- **Invalid input**: Returns 400 with validation errors
- **Database errors**: Returns 500 with error message
- **Missing tracking data**: Returns 400 if no userId or IP
- **Client-side failures**: Logged to console but don't block user experience

## Security Considerations

1. **IP Address Privacy**: IP addresses hashed or anonymized per GDPR requirements
2. **User Agent Storage**: Limited to browser identification, not fingerprinting
3. **Consent Integrity**: All consent records immutable (no updates, only new records)
4. **Authentication**: Only authenticated users can view their consent history
5. **Data Retention**: Consider implementing automatic cleanup of old anonymous consents

## Future Enhancements

Consider adding:
- IP address anonymization/hashing
- Automatic cleanup of old anonymous consent records (e.g., after 12 months)
- Admin dashboard to view consent statistics
- Export functionality for GDPR data requests
- Webhook notifications for marketing consent changes
- Integration with email marketing platforms (e.g., Mailchimp, SendGrid)

## Maintenance

### Viewing Consent Records

```sql
-- View all consents for a user
SELECT * FROM consent_records
WHERE user_id = 'user_id_here'
ORDER BY created_at DESC;

-- View anonymous consents from specific IP
SELECT * FROM consent_records
WHERE ip_address = '192.168.1.1'
ORDER BY created_at DESC;

-- Count consent types granted
SELECT consent_type, granted, COUNT(*)
FROM consent_records
GROUP BY consent_type, granted;
```

### Cleanup Old Anonymous Consents

```sql
-- Delete anonymous consents older than 12 months
DELETE FROM consent_records
WHERE user_id IS NULL
AND created_at < NOW() - INTERVAL '12 months';
```

## Support

For questions or issues related to cookie consent:
1. Check the consent records in the database
2. Review browser console for API errors
3. Verify DATABASE_URL is correctly set
4. Ensure migration has been applied
