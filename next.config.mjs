import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * Generate Content-Security-Policy header value
 * More relaxed in development for hot reload, strict in production
 */
function getCSP() {
  const isDev = process.env.NODE_ENV === 'development'

  const policies = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      // Stripe payment processing
      'https://js.stripe.com',
      // Pusher real-time updates
      'https://*.pusher.com',
      // Development needs
      ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : ["'unsafe-inline'"]),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      // Cloudflare R2 storage for auction images
      'https://*.r2.cloudflarestorage.com',
      'https://*.cloudflare.com',
      // Stripe assets
      'https://*.stripe.com',
      // Placeholder images for mock data
      'https://placehold.co',
      'https://picsum.photos',
      'https://fastly.picsum.photos',
      'https://source.unsplash.com',
      'https://images.unsplash.com',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      // Stripe API
      'https://api.stripe.com',
      // Pusher WebSocket and HTTP
      'https://*.pusher.com',
      'wss://*.pusher.com',
      // Resend email API
      'https://api.resend.com',
      // Development hot reload
      ...(isDev ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : []),
    ],
    'frame-src': [
      "'self'",
      // Stripe payment forms and 3D Secure
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  }

  return Object.entries(policies)
    .map(([key, values]) => {
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .join('; ')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Content-Security-Policy',
            value: getCSP(),
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default withNextIntl(nextConfig)
