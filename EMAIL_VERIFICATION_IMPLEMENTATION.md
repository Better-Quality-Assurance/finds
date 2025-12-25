# Email Verification Implementation

This document describes the complete email verification flow implemented for the Finds auction platform.

## Overview

The email verification system ensures that users verify their email addresses before they can participate in auctions. The implementation uses:

- **Resend** for sending verification emails
- **NextAuth.js** for authentication
- **Prisma** with PostgreSQL for data persistence
- **Next.js 14** with App Router
- **next-intl** for internationalization (English & Romanian)

## Architecture

### Flow Diagram

```
1. User registers → 2. Create user + token → 3. Send verification email
                                                           ↓
6. Redirect to login ← 5. Delete token ← 4. User clicks link
```

### Database Schema

The `VerificationToken` model (already exists in schema):
```prisma
model VerificationToken {
  identifier String   // User's email address
  token      String   // Cryptographically secure random token
  expires    DateTime // Token expiry (24 hours from creation)

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

The `User` model includes:
```prisma
emailVerified DateTime? @map("email_verified")
```

## Implementation Details

### 1. Email Service (`/src/lib/email.ts`)

**Features:**
- Resend client initialization with API key validation
- `sendVerificationEmail(email, token)` - Sends branded verification emails
- `sendPasswordResetEmail(email, token)` - For future password reset functionality
- Professional HTML email templates with fallback text versions
- 24-hour token expiry clearly communicated

**Environment Variables Required:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@finds.ro
NEXTAUTH_URL=http://localhost:3000
```

### 2. Verification API Endpoint (`/src/app/api/auth/verify/route.ts`)

**POST /api/auth/verify**
- Accepts `{ token: string }` in request body
- Validates token existence and expiry
- Updates user's `emailVerified` timestamp
- Deletes used token (one-time use)
- Returns success with user email or error message

**GET /api/auth/verify?token=xxx**
- Alternative endpoint for direct email link clicks
- Redirects to verify-email page with token

**Security Features:**
- Token validation before processing
- Automatic expired token cleanup
- One-time token usage
- Comprehensive error handling

### 3. Updated Registration Flow (`/src/app/api/auth/register/route.ts`)

**Enhanced Registration Process:**
1. Validate user input (name, email, password)
2. Check for existing user
3. Hash password with bcrypt (12 rounds)
4. Generate cryptographically secure token (32 bytes)
5. Create user and verification token in database transaction
6. Send verification email (non-blocking - registration succeeds even if email fails)
7. Return success message with instruction to check email

**Transaction Safety:**
User and token are created atomically to prevent partial state.

### 4. Verify Email Page (`/src/app/[locale]/(auth)/verify-email/page.tsx`)

**Client-Side React Component with States:**

1. **No Token State:** Shows "check your email" message
   - Instructions to check inbox
   - Tips for finding the email (spam folder, etc.)
   - Link back to login

2. **Verifying State:** Shows loading spinner
   - "Verifying Your Email" message
   - Spinner animation

3. **Success State:** Shows success checkmark
   - "Email Verified Successfully" message
   - Displays verified email address
   - Auto-redirects to login after 3 seconds
   - Manual "Continue to Login" button

4. **Error State:** Shows error icon
   - Error message from API
   - Instructions for recovery
   - Links to register again or return to login

**Features:**
- Automatic verification on page load when token is present
- Toast notifications for user feedback
- Auto-redirect on success
- Fully internationalized (English/Romanian)
- Responsive design matching existing auth pages

### 5. Enhanced Authentication (`/src/lib/auth.ts`)

**Updated Session to Include Email Verification:**
```typescript
interface Session {
  user: {
    id: string
    email: string
    emailVerified: Date | null
    // ... other fields
  }
}
```

**Important Design Decision:**
Users CAN log in even without verified emails. This allows them to:
- Access their account
- Resend verification emails
- Update account settings

However, the application can check `session.user.emailVerified` and restrict certain actions (like bidding) until verified.

### 6. Internationalization

**Added Translations (English & Romanian):**

English (`/messages/en.json`):
- `verifyEmail`: "Verify Your Email"
- `verifyEmailSent`: "We sent a verification link to your email."
- `checkEmailInstructions`: Instructions for checking email
- `verificationSuccess`: "Email Verified Successfully"
- `verificationFailed`: "Verification Failed"
- Plus 15+ supporting messages

Romanian (`/messages/ro.json`):
- Complete translations for all verification-related messages
- Maintains consistent tone with existing Romanian translations

## User Experience Flow

### Registration Flow
1. User fills out registration form at `/register`
2. Submits form → API creates account and sends email
3. User sees success message: "Account created. Please check your email to verify."
4. Email arrives with "Verify Email Address" button
5. User clicks button → Redirected to `/verify-email?token=xxx`
6. Page automatically verifies token → Shows success
7. Auto-redirect to `/login?verified=true` after 3 seconds
8. User logs in with verified account

### Email Template
Professional HTML email with:
- Finds branding
- Clear call-to-action button
- Fallback text link
- Expiry notice (24 hours)
- Security note for unintended recipients
- Plain text alternative for email clients

## Security Considerations

1. **Cryptographically Secure Tokens:**
   - 32-byte random tokens using Node.js `crypto.randomBytes()`
   - 256-bit entropy prevents brute force attacks

2. **Token Expiry:**
   - 24-hour validity window
   - Expired tokens automatically deleted

3. **One-Time Use:**
   - Tokens deleted immediately after use
   - Prevents replay attacks

4. **Transaction Safety:**
   - User and token created atomically
   - Prevents orphaned tokens or users

5. **Input Validation:**
   - Zod schema validation on registration
   - Token format validation on verification

6. **Rate Limiting Considerations:**
   - TODO: Implement rate limiting on verification endpoint
   - TODO: Implement rate limiting on resend verification email

## Testing Checklist

- [ ] Register new user → Verify email arrives
- [ ] Click verification link → Successfully verified
- [ ] Try to use token twice → Second attempt fails
- [ ] Wait 24 hours → Token expires and shows error
- [ ] Register with invalid email → Registration fails
- [ ] Email service fails → User still created (graceful degradation)
- [ ] Test both English and Romanian translations
- [ ] Verify session includes emailVerified field
- [ ] Test mobile responsive design

## Future Enhancements

1. **Resend Verification Email:**
   - Add endpoint to resend verification email
   - Add UI button on login page for unverified users

2. **Email Verification Required:**
   - Add middleware to restrict bidding without verification
   - Show banner on dashboard for unverified users

3. **Email Preferences:**
   - Allow users to update email and re-verify
   - Track verification attempts and prevent abuse

4. **Analytics:**
   - Track verification completion rate
   - Monitor email delivery success rate
   - Identify users stuck in verification

## File Locations

```
/src/lib/email.ts                              # Email service
/src/app/api/auth/verify/route.ts             # Verification API
/src/app/api/auth/register/route.ts           # Updated registration
/src/app/[locale]/(auth)/verify-email/page.tsx # Verification page
/src/lib/auth.ts                               # Updated auth config
/messages/en.json                              # English translations
/messages/ro.json                              # Romanian translations
```

## Environment Setup

Add to `.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@finds.ro
NEXTAUTH_URL=http://localhost:3000
```

Get a Resend API key from: https://resend.com/api-keys

## Production Deployment

1. **Resend Setup:**
   - Verify domain in Resend dashboard
   - Add DNS records (SPF, DKIM, DMARC)
   - Update `EMAIL_FROM` to verified domain

2. **Environment Variables:**
   - Set production RESEND_API_KEY
   - Set production NEXTAUTH_URL
   - Set production EMAIL_FROM

3. **Database Migration:**
   - VerificationToken table already exists
   - No migration needed

4. **Monitoring:**
   - Monitor Resend dashboard for delivery rates
   - Check server logs for verification errors
   - Track conversion from registration to verification

## Support

For issues or questions:
- Check Resend logs for email delivery failures
- Review server logs for API errors
- Verify environment variables are set correctly
- Test with a real email address (not temporary email services)
