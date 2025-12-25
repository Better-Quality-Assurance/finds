# Deployment Guide

This guide covers deploying the Finds auction platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Vercel Deployment](#vercel-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Rollback Procedure](#rollback-procedure)

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Production Database** - PostgreSQL 14+ (recommended: Neon, Supabase, or Railway)
3. **AWS Account** - For S3 image storage
4. **Stripe Account** - For payment processing
5. **Pusher Account** - For real-time bidding
6. **Resend Account** - For transactional emails
7. **Domain Name** - (Optional but recommended)

## Environment Variables

### Required Environment Variables

Create these environment variables in your Vercel project settings or `.env.production` file:

#### Database

```bash
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# For connection pooling (recommended for production)
DATABASE_URL_UNPOOLED="postgresql://user:password@host:5432/database?schema=public"
```

#### Authentication (NextAuth)

```bash
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-production-secret-min-32-chars"

# Your production URL
NEXTAUTH_URL="https://your-domain.com"
```

#### AWS S3 (Image Storage)

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET_NAME="finds-production-images"
```

#### Stripe (Payments)

```bash
# Live keys from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."

# Webhook secret from Stripe dashboard
STRIPE_WEBHOOK_SECRET="whsec_..."
```

#### Pusher (Real-time Bidding)

```bash
# From https://dashboard.pusher.com
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="us2"  # or your cluster

# Public variables (exposed to client)
NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"
```

#### Resend (Email)

```bash
# From https://resend.com/api-keys
RESEND_API_KEY="re_..."

# Email addresses
EMAIL_FROM="noreply@your-domain.com"
EMAIL_SUPPORT="support@your-domain.com"
```

#### Application Configuration

```bash
# Your production domain
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

### Optional Environment Variables

```bash
# Logging and monitoring
SENTRY_DSN="https://...@sentry.io/..."

# Rate limiting
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="900000"  # 15 minutes

# Feature flags
ENABLE_USER_REGISTRATION="true"
ENABLE_AUCTION_CREATION="true"
```

## Database Setup

### 1. Create Production Database

#### Using Neon (Recommended)

```bash
# Create project at https://console.neon.tech
# Copy connection string to DATABASE_URL
```

#### Using Supabase

```bash
# Create project at https://app.supabase.com
# Navigate to Settings > Database
# Copy "Connection string" (transaction pooling)
```

#### Using Railway

```bash
# Create project at https://railway.app
# Add PostgreSQL service
# Copy DATABASE_URL from variables
```

### 2. Run Database Migrations

```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Push schema to database (initial setup)
npm run db:push

# Or use migrations for production
npx prisma migrate deploy
```

### 3. Seed Initial Data (Optional)

```bash
# Run seed script for initial categories, settings, etc.
npm run db:seed
```

### 4. Verify Database

```bash
# Connect to Prisma Studio to verify
npm run db:studio
```

## Vercel Deployment

### Method 1: Deploy via Git (Recommended)

1. **Push to GitHub**

```bash
git add .
git commit -m "chore: prepare for production deployment"
git push origin main
```

2. **Import to Vercel**

- Go to [vercel.com/new](https://vercel.com/new)
- Import your GitHub repository
- Configure project settings:
  - Framework Preset: **Next.js**
  - Root Directory: `./`
  - Build Command: `npm run build`
  - Output Directory: `.next`

3. **Add Environment Variables**

- Go to **Project Settings** > **Environment Variables**
- Add all required variables from the section above
- Select **Production** environment
- Click **Save**

4. **Deploy**

- Click **Deploy**
- Wait for build to complete (typically 2-3 minutes)
- Vercel will automatically run `npm run build`

### Method 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts to configure project
```

### Build Configuration

Create `vercel.json` (already exists in project):

```json
{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check deployment status
vercel inspect <deployment-url>

# Test production URL
curl https://your-domain.com/api/health
```

### 2. Configure Custom Domain

1. Go to **Project Settings** > **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` environment variable

### 3. Set Up Webhooks

#### Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

#### Vercel Deploy Hooks (Optional)

```bash
# Create deploy hook for automated deployments
# Project Settings > Git > Deploy Hooks
```

### 4. Configure Cron Jobs

The platform uses Vercel Cron for scheduled tasks:

1. **Auction End Processing** - `*/5 * * * *` (every 5 minutes)
2. **Payment Processing** - `*/10 * * * *` (every 10 minutes)
3. **Payout Processing** - `0 */6 * * *` (every 6 hours)

Cron jobs are automatically configured via `vercel.json`.

### 5. Set Up Monitoring

#### Vercel Analytics

```bash
# Enable in Vercel dashboard
# Project Settings > Analytics > Enable
```

#### Error Tracking (Optional: Sentry)

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs

# Add SENTRY_DSN to environment variables
```

## Database Migration Process

### Production Migration Workflow

1. **Create Migration Locally**

```bash
# Make schema changes in prisma/schema.prisma
npx prisma migrate dev --name descriptive_name
```

2. **Test Migration**

```bash
# Test on staging database first
DATABASE_URL="staging-db-url" npx prisma migrate deploy
```

3. **Deploy to Production**

```bash
# Via Vercel CLI or dashboard
# Migration runs automatically on build
```

4. **Manual Migration (if needed)**

```bash
# Connect to production database
DATABASE_URL="production-url" npx prisma migrate deploy
```

### Rollback Migration

```bash
# Identify migration to rollback
npx prisma migrate status

# Manually revert in database
# Then update migration files
```

## Monitoring

### Key Metrics to Monitor

1. **Application Health**
   - Response times
   - Error rates
   - API endpoint performance

2. **Database**
   - Connection pool usage
   - Query performance
   - Storage usage

3. **Real-time Features**
   - Pusher connection count
   - Bid latency
   - WebSocket errors

4. **Payments**
   - Stripe webhook delivery
   - Payment success rate
   - Failed transactions

### Vercel Analytics Dashboard

Access at: `https://vercel.com/<team>/<project>/analytics`

### Database Monitoring

```bash
# Check connection pool
SELECT count(*) FROM pg_stat_activity;

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Rollback Procedure

### Immediate Rollback

1. **Via Vercel Dashboard**
   - Go to **Deployments**
   - Find previous working deployment
   - Click **⋯** > **Promote to Production**

2. **Via Vercel CLI**

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback

```bash
# If migration needs reverting
# 1. Identify the migration
npx prisma migrate status

# 2. Manually revert database changes
# 3. Remove migration file
# 4. Create new migration
npx prisma migrate dev --name revert_previous_change
```

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Check build logs
vercel logs <deployment-url>

# Common fixes:
# 1. Ensure DATABASE_URL is set
# 2. Run prisma generate
# 3. Check TypeScript errors
```

#### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Check connection string format
# Ensure IP whitelist includes Vercel IPs
```

#### Environment Variables Not Loading

```bash
# Redeploy to pick up new variables
vercel --prod --force

# Or trigger deployment via Git push
```

### Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Stripe Docs**: https://stripe.com/docs

## Security Checklist

- [ ] All environment variables set correctly
- [ ] Database has SSL enabled
- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] Stripe webhook secret configured
- [ ] S3 bucket has proper CORS and permissions
- [ ] Custom domain has HTTPS enabled
- [ ] Security headers configured in next.config.mjs
- [ ] Rate limiting enabled on API routes
- [ ] Database backups configured
- [ ] Error tracking/monitoring set up

## Performance Optimization

### Recommended Settings

1. **Enable Edge Caching**
   - Configure in `next.config.mjs`
   - Use `Cache-Control` headers

2. **Database Connection Pooling**
   - Use connection pooler (PgBouncer)
   - Set appropriate pool size

3. **Image Optimization**
   - Use Next.js Image component
   - Configure S3 CloudFront CDN

4. **API Route Optimization**
   - Implement caching where appropriate
   - Use database indexes
   - Enable compression

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check payment processing
- Review auction end times

**Weekly:**
- Review database performance
- Check dependency updates
- Analyze user feedback

**Monthly:**
- Database backup verification
- Security audit
- Performance optimization review
- Cost analysis

### Backup Strategy

```bash
# Database backups (automated via provider)
# Neon: Automatic backups enabled
# Supabase: Automatic daily backups

# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# S3 bucket versioning
# Enable in AWS Console > S3 > Bucket > Versioning
```

---

**Deployment Checklist:**

1. [ ] All environment variables configured
2. [ ] Database migrated and seeded
3. [ ] Stripe webhooks configured
4. [ ] Custom domain configured
5. [ ] SSL certificate active
6. [ ] Cron jobs verified
7. [ ] Error tracking enabled
8. [ ] Backups configured
9. [ ] Security headers active
10. [ ] Performance monitoring active
11. [ ] Team notified
12. [ ] Documentation updated

**Questions or issues?** Contact the development team or refer to project documentation.
