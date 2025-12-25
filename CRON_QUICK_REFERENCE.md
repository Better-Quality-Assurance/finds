# Cron Jobs - Quick Reference Card

## Setup (One-time)

1. **Generate CRON_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

2. **Add to .env.local:**
   ```bash
   CRON_SECRET="your-generated-secret-here"
   ```

3. **Add to Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add `CRON_SECRET` with the same value
   - Redeploy

## Files Created

```
src/app/api/cron/
├── activate-auctions/route.ts   # Every minute
├── end-auctions/route.ts         # Every minute
└── release-deposits/route.ts     # Every hour

src/lib/pusher-cron.ts            # Pusher broadcast helpers
vercel.json                       # Cron schedule config
scripts/test-cron-jobs.sh         # Testing utility
```

## Testing Locally

```bash
# Start dev server
npm run dev

# In another terminal
./scripts/test-cron-jobs.sh all
```

## Manual Test Curl

```bash
export CRON_SECRET="your-secret"

curl http://localhost:3000/api/cron/activate-auctions \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitoring

- **Audit Logs:** `https://finds.ro/admin/audit`
- **Vercel Logs:** Dashboard → Project → Logs → Filter `/api/cron/`
- **Filter by Action:** `CRON_JOB_EXECUTED`, `AUCTION_STARTED`, `AUCTION_ENDED`, `DEPOSIT_RELEASED`

## Job Schedules

| Job | Schedule | Purpose |
|-----|----------|---------|
| activate-auctions | `* * * * *` | Activate SCHEDULED auctions |
| end-auctions | `* * * * *` | End ACTIVE auctions |
| release-deposits | `0 * * * *` | Release 30-day old deposits |

## Real-time Events

### Public Channel: `auction-{auctionId}`

- `AUCTION_STARTING` - When auction activates
- `AUCTION_ENDED` - When auction expires

### Private Channel: `private-user-{userId}-notifications`

- `auction-won` - Winner notification
- `watchlist-ended` - Watchlist notification

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check CRON_SECRET matches |
| Jobs not running | Verify vercel.json deployed |
| Auctions stuck | Check database times |
| No Pusher events | Verify Pusher credentials |

## Documentation

- **Full Setup:** `CRON_SETUP.md`
- **Implementation:** `CRON_IMPLEMENTATION_SUMMARY.md`
- **This Card:** `CRON_QUICK_REFERENCE.md`

---
Last Updated: 2025-12-25
