# Security Headers Configuration

This document describes the comprehensive security headers implementation for the Finds auction platform.

## Implementation Summary

Security headers have been added to protect against common web vulnerabilities including XSS, clickjacking, MIME-type sniffing, and more.

### Files Modified

1. `/Users/brad/Code2/finds/next.config.mjs` - Added CSP and cross-origin headers
2. `/Users/brad/Code2/finds/src/app/[locale]/layout.tsx` - Added viewport configuration

## Content Security Policy (CSP)

### Environment-Aware Configuration

The CSP is dynamically generated based on `NODE_ENV`:

- **Development**: Relaxed policy allowing `unsafe-eval` and `unsafe-inline` for hot reload
- **Production**: Strict policy with minimal inline script allowances

### CSP Directives

```javascript
// Production CSP
default-src 'self'
script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.pusher.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.cloudflare.com https://*.stripe.com
font-src 'self' data:
connect-src 'self' https://api.stripe.com https://*.pusher.com wss://*.pusher.com https://api.resend.com
frame-src 'self' https://js.stripe.com https://hooks.stripe.com
object-src 'none'
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
upgrade-insecure-requests
```

### Third-Party Services Allowed

1. **Stripe** (`https://js.stripe.com`, `https://api.stripe.com`, `https://hooks.stripe.com`)
   - Payment processing
   - 3D Secure authentication frames
   - Stripe Elements integration

2. **Pusher** (`https://*.pusher.com`, `wss://*.pusher.com`)
   - Real-time WebSocket connections for auction updates
   - Live bidding notifications

3. **Cloudflare R2** (`https://*.r2.cloudflarestorage.com`, `https://*.cloudflare.com`)
   - Auction vehicle images
   - User-uploaded content

4. **Resend** (`https://api.resend.com`)
   - Transactional email API

## Complete Security Headers

### Global Headers (All Routes)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-DNS-Prefetch-Control` | `on` | Enable DNS prefetching for performance |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforce HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Allow framing only from same origin |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter in older browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer information |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Restrict browser features |
| `Content-Security-Policy` | See CSP section above | Prevent XSS and injection attacks |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Restrict cross-origin resource loading |

### API Routes (`/api/*`)

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `no-store, max-age=0` | Prevent caching of API responses |

### Static Assets (`/_next/static/*`)

| Header | Value | Purpose |
|--------|-------|---------|
| `Cache-Control` | `public, max-age=31536000, immutable` | Aggressive caching for 1 year |

## Viewport Configuration

Added to `/src/app/[locale]/layout.tsx`:

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}
```

### Benefits

- **Responsive design**: Proper scaling on mobile devices
- **User control**: Allows zoom up to 5x for accessibility
- **Safari integration**: `viewportFit: 'cover'` for notch devices
- **Theme integration**: Matches browser chrome to app theme

## Testing Checklist

After deployment, verify the following functionality:

### Critical Features

- [ ] Stripe payment forms load and function correctly
- [ ] Stripe 3D Secure authentication works in iframe
- [ ] Pusher real-time updates connect via WebSocket
- [ ] Auction images load from Cloudflare R2
- [ ] Custom fonts load properly
- [ ] Email sending via Resend API works

### Development Mode

- [ ] Hot reload works without CSP violations
- [ ] WebSocket connections to localhost work
- [ ] No console errors related to CSP

### Production Mode

- [ ] All inline scripts are from trusted sources
- [ ] No `unsafe-eval` warnings in browser console
- [ ] HTTPS upgrade works correctly
- [ ] Cross-origin resources load only from allowed domains

## Browser Developer Tools Verification

### Check Headers in Production

```bash
curl -I https://finds.ro
```

Expected headers should include all security headers listed above.

### CSP Violation Reports

Monitor browser console for CSP violations:
1. Open DevTools → Console
2. Look for messages like: "Refused to load... because it violates the following Content Security Policy directive"
3. Add legitimate sources to CSP if needed

### Security Score

Test your deployment at:
- [Mozilla Observatory](https://observatory.mozilla.org)
- [Security Headers](https://securityheaders.com)
- [SSL Labs](https://www.ssllabs.com/ssltest/)

Expected scores:
- Mozilla Observatory: A+ (with HSTS preload)
- Security Headers: A
- SSL Labs: A or A+ (depends on server configuration)

## Troubleshooting

### Issue: Stripe payment form doesn't load

**Cause**: CSP blocking Stripe scripts or frames

**Solution**: Verify these CSP directives are present:
```
script-src ... https://js.stripe.com
frame-src ... https://js.stripe.com https://hooks.stripe.com
connect-src ... https://api.stripe.com
```

### Issue: Images from R2 not loading

**Cause**: CSP blocking Cloudflare R2 URLs

**Solution**: Verify this CSP directive:
```
img-src ... https://*.r2.cloudflarestorage.com https://*.cloudflare.com
```

### Issue: Pusher real-time updates not working

**Cause**: CSP blocking WebSocket connections

**Solution**: Verify these CSP directives:
```
script-src ... https://*.pusher.com
connect-src ... https://*.pusher.com wss://*.pusher.com
```

### Issue: Hot reload broken in development

**Cause**: CSP too strict for development

**Solution**: The `getCSP()` function automatically relaxes CSP in development. Ensure `NODE_ENV=development` is set.

### Issue: Fonts not loading

**Cause**: CSP blocking font sources

**Solution**: Verify this CSP directive:
```
font-src 'self' data:
```

## Future Enhancements

### CSP Reporting

Add CSP violation reporting to monitor security issues:

```javascript
'report-uri': ['https://your-csp-reporting-endpoint.com/report'],
'report-to': ['csp-endpoint'],
```

### Subresource Integrity (SRI)

Add integrity checks for external scripts:

```html
<script
  src="https://js.stripe.com/v3/"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

### Nonce-based CSP

Replace `'unsafe-inline'` with nonce-based approach for inline scripts:

```javascript
// Generate nonce per request
const nonce = crypto.randomBytes(16).toString('base64')

// CSP
script-src 'self' 'nonce-${nonce}'

// HTML
<script nonce="${nonce}">...</script>
```

## Compliance

These security headers help meet requirements for:

- **OWASP Top 10**: Protection against injection attacks, XSS, clickjacking
- **PCI DSS**: Secure communication (HSTS), XSS prevention
- **GDPR**: Secure data transmission, privacy controls
- **SOC 2**: Security controls for data protection

## References

- [MDN - Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Stripe CSP Requirements](https://stripe.com/docs/security/guide#content-security-policy)
