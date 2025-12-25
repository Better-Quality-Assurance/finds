# Finds - Classic Car Auction Platform

## Project Overview

Finds is an EU-based online auction platform for classic cars, retro vehicles, barn finds, and project vehicles. Romania-first, scalable to EU. English-first legal and product language.

**Domain:** finds.ro

## Core Business Rules

- **Buyer fee:** 5% of hammer price
- **No seller commission** in v1
- **All items require pre-approval** before listing
- **Transparency mandatory** (condition, defects, non-running status)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router), TypeScript |
| UI | shadcn/ui + Radix UI, Tailwind CSS |
| Forms | React Hook Form + Zod |
| Database | PostgreSQL via Railway |
| ORM | Prisma |
| Auth | Auth.js (NextAuth.js v5) |
| Real-time | Pusher |
| Storage | Cloudflare R2 |
| Payments | Stripe |
| Email | Resend |
| i18n | next-intl (English + Romanian) |

## Common Commands

```bash
# Development
npm run dev           # Start dev server (port 3000)

# Database
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:migrate    # Create migration
npm run db:studio     # Open Prisma Studio

# Build
npm run build         # Production build
npm run lint          # Run ESLint
```

## Project Structure

```
src/
├── app/
│   ├── [locale]/           # i18n routing (en, ro)
│   │   ├── (auth)/         # Auth pages (login, register)
│   │   ├── auctions/       # Auction pages
│   │   ├── sell/           # Seller submission
│   │   ├── account/        # User account
│   │   ├── admin/          # Admin dashboard
│   │   └── legal/          # Legal pages
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Header, Footer
│   ├── auction/            # Auction components
│   ├── listing/            # Listing components
│   └── legal/              # Cookie consent, etc.
├── lib/                    # Core libraries
│   ├── auth.ts             # Auth.js config
│   ├── db.ts               # Prisma client
│   ├── pusher.ts           # Pusher client
│   ├── stripe.ts           # Stripe client
│   └── utils.ts            # Utilities
├── services/               # Business logic (SOLID SRP)
├── domain/                 # Business rules
├── i18n/                   # Internationalization
└── types/                  # TypeScript types

prisma/
├── schema.prisma           # Database schema
└── migrations/             # Database migrations

messages/
├── en.json                 # English translations
└── ro.json                 # Romanian translations
```

## SOLID Architecture

- **SRP:** Each service handles one domain (AuctionService, BidService, etc.)
- **OCP:** Country registry for EU expansion
- **LSP:** Interchangeable payment processors
- **ISP:** Role-specific interfaces (Reader/Writer/Moderator/Admin)
- **DIP:** Abstract interfaces for notifications, storage, payments

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL          # Railway PostgreSQL connection string
NEXTAUTH_SECRET       # Auth.js secret (generate with openssl rand -base64 32)
NEXTAUTH_URL          # http://localhost:3000 for dev
RESEND_API_KEY        # Resend email API key
STRIPE_SECRET_KEY     # Stripe secret key
PUSHER_*              # Pusher credentials
R2_*                  # Cloudflare R2 credentials
```

## Key Features

1. **Curated Listings** - Manual approval before listing
2. **Real-time Bidding** - Pusher-powered live updates
3. **Anti-sniping** - 2-min extension when bid in last 2 min
4. **Bid Deposits** - Card hold before bidding (EUR 500 min)
5. **5% Buyer Fee** - No hidden costs
6. **GDPR Compliant** - Full EU privacy compliance
7. **Bilingual** - English and Romanian

## Coding Standards

- Use `@/` path alias for `./src/` imports
- 2-space indentation
- PascalCase for components and types
- camelCase for variables and functions
- Run `npm run lint` before committing
