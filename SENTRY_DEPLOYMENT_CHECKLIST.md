# Sentry Deployment Checklist

Complete these steps to activate Sentry monitoring in production.

## Pre-Deployment

### 1. Create Sentry Account & Project

- [ ] Sign up at [sentry.io](https://sentry.io)
- [ ] Create a new project
  - Platform: **Next.js**
  - Alert frequency: **On every new issue**
- [ ] Copy the DSN from Settings > Projects > [Your Project] > Client Keys

### 2. Configure Environment Variables

**Local Development (.env.local):**
```bash
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
```

**Production (Vercel/Hosting):**

Add these environment variables to your hosting platform:

```bash
# Required for error tracking
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"

# Required for source map uploads (build-time only)
SENTRY_AUTH_TOKEN="your-auth-token"
SENTRY_ORG="your-org-slug"
SENTRY_PROJECT="your-project-slug"
```

**Getting the Auth Token:**
1. Go to Sentry Settings > Account > API > Auth Tokens
2. Create token with scopes:
   - `project:releases`
   - `project:write`
   - `org:read`
3. Copy token immediately (shown only once)

### 3. Verify Configuration

- [ ] Check `.env.example` has placeholder values
- [ ] Verify `.gitignore` excludes `.sentryclirc` and `.sentry/`
- [ ] Confirm `next.config.mjs` has Sentry wrapper
- [ ] Check `package.json` has `@sentry/nextjs` dependency

### 4. Test Locally

```bash
# Build the project
npm run build

# Check for Sentry messages in build output
# Should see: "Sentry Next.js Plugin initialized"
```

**Expected warnings (OK to ignore):**
- Deprecation warnings about config files (we use instrumentation file)

**Not OK:**
- Build failures
- Missing environment variables errors

## Deployment Steps

### 5. Deploy to Staging/Production

- [ ] Add environment variables to hosting platform
- [ ] Deploy application
- [ ] Check deployment logs for Sentry plugin output
- [ ] Verify source maps uploaded (check Sentry Releases)

### 6. Verify Sentry is Working

**Test Error Capture:**

1. Trigger a test error:
```typescript
// Add temporarily to any API route
throw new Error('Test Sentry integration - DELETE ME')
```

2. Make request to that endpoint
3. Check Sentry dashboard (sentry.io)
4. Should see error within 1-2 minutes
5. Remove test error

**Check Source Maps:**
- Error should show readable file names (not minified)
- Stack trace should show actual line numbers
- Code context should be visible

**Check User Context:**
- Log in as a user
- Trigger an error
- Error should include user email and ID

### 7. Configure Alerts

**Payment Errors:**
```
Alert Rule: "Payment Errors"
Condition: Event.level equals error AND Event.tags[payment_type] is set
Action: Send to #payments-alerts Slack
Frequency: All events
```

**Cron Job Failures:**
```
Alert Rule: "Cron Job Failures"
Condition: Event.tags[cron_job] is set
Action: Email to admin@finds.ro
Frequency: All events
```

**Fraud Alerts:**
```
Alert Rule: "Fraud Detection"
Condition: Event.tags[fraud_type] is set
Action: Email to security@finds.ro
Frequency: All events
Priority: High
```

**API Error Spike:**
```
Alert Rule: "API Error Spike"
Condition: Event count > 50 in 5 minutes
Action: Slack #dev-alerts
Frequency: Once per issue
```

### 8. Create Dashboards

**Recommended Dashboards:**

1. **Payment Health**
   - Filter: `payment_type:*`
   - Widgets: Error count, Error rate, Unique errors

2. **Auction Operations**
   - Filter: `resource_type:auction`
   - Widgets: Error trend, Top errors, Affected users

3. **System Health**
   - Filters: All errors
   - Widgets: Error rate, Response time, Apdex score

4. **Cron Jobs**
   - Filter: `cron_job:*`
   - Widgets: Job failures, Success rate, Duration

### 9. Configure Releases

**Auto-tracking with Vercel:**

Sentry automatically tracks releases using `VERCEL_GIT_COMMIT_SHA`.

**Manual release tracking:**
```bash
# During deployment
sentry-cli releases new "$GIT_COMMIT_SHA"
sentry-cli releases set-commits "$GIT_COMMIT_SHA" --auto
sentry-cli releases finalize "$GIT_COMMIT_SHA"
```

### 10. Set Performance Budgets

**Recommended thresholds:**
- API routes: < 500ms (p95)
- Page loads: < 2s (p95)
- Database queries: < 100ms (p95)

Configure in Sentry:
- Go to Performance > Settings
- Set transaction thresholds
- Enable performance alerts

## Post-Deployment

### 11. Monitor Initial Errors

**First 24 hours:**
- [ ] Review all errors
- [ ] Triage and assign issues
- [ ] Identify noise (false positives)
- [ ] Update `ignoreErrors` in config if needed

**First week:**
- [ ] Tune alert thresholds
- [ ] Create issue filters
- [ ] Document common errors
- [ ] Train team on Sentry workflow

### 12. Optimize Settings

**If too many events:**

Update sample rates in `src/instrumentation.ts`:

```typescript
// Reduce to 1% for high-traffic sites
tracesSampleRate: 0.01,
```

Update in `sentry.client.config.ts`:
```typescript
replaysSessionSampleRate: 0.05, // Reduce from 10%
```

**If quota exceeded:**
- Set project quota in Sentry settings
- Increase `ignoreErrors` list
- Filter out expected errors (404s, etc.)

### 13. Document Runbooks

Create team documentation:
- [ ] How to triage Sentry errors
- [ ] When to create GitHub issues from Sentry
- [ ] Escalation process for critical errors
- [ ] Weekly error review schedule

### 14. Integrate with Workflow

**Slack Integration:**
1. Sentry Settings > Integrations > Slack
2. Connect workspace
3. Configure channel routing

**GitHub Integration:**
1. Sentry Settings > Integrations > GitHub
2. Connect repository
3. Enable auto-create issues for new errors

**Jira/Linear (optional):**
- Connect issue tracker
- Auto-create tickets for critical errors

## Troubleshooting

### Errors not appearing in Sentry

**Check:**
- [ ] `NEXT_PUBLIC_SENTRY_DSN` environment variable is set
- [ ] DSN is correct (check Sentry project settings)
- [ ] `enabled: process.env.NODE_ENV !== 'development'` allows production errors
- [ ] No firewall/ad-blocker blocking `*.sentry.io`
- [ ] Browser console for Sentry errors

**Test:**
```typescript
// Add to page or API route
import * as Sentry from '@sentry/nextjs'
Sentry.captureMessage('Testing Sentry')
```

### Source maps not showing

**Check:**
- [ ] `SENTRY_AUTH_TOKEN` is set during build
- [ ] Token has correct permissions
- [ ] Build logs show "Uploading source maps"
- [ ] Release is created in Sentry

**Fix:**
```bash
# Check Sentry CLI can connect
npx sentry-cli info

# Manually upload source maps
npx sentry-cli sourcemaps upload --release $RELEASE .next
```

### Performance data not appearing

**Check:**
- [ ] `tracesSampleRate` > 0
- [ ] Performance monitoring enabled in project settings
- [ ] Quota not exceeded

### Too many alerts

**Fix:**
- Increase alert frequency (e.g., "At most once per issue per day")
- Add more specific conditions
- Use alert grouping
- Mute low-priority issues

## Maintenance

### Weekly
- [ ] Review new errors
- [ ] Resolve or ignore duplicates
- [ ] Update error documentation

### Monthly
- [ ] Review alert effectiveness
- [ ] Check quota usage
- [ ] Update ignored errors list
- [ ] Review performance budgets

### Quarterly
- [ ] Team Sentry training
- [ ] Review integration effectiveness
- [ ] Evaluate upgrade to higher tier if needed
- [ ] Update runbooks

## Success Metrics

Track these KPIs:

- **Error Detection Time**: Time from error to alert
- **Resolution Time**: Time from alert to fix deployed
- **Error Rate**: Errors per 1000 requests
- **User Impact**: % of users affected by errors
- **Regression Rate**: % of fixed errors that recur

**Target:**
- Detection: < 5 minutes
- Resolution: < 24 hours for critical, < 1 week for others
- Error Rate: < 0.1%
- User Impact: < 5%
- Regression: < 10%

## Resources

- **Sentry Docs**: https://docs.sentry.io
- **Next.js Integration**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Setup Guide**: `SENTRY_SETUP.md`
- **Quick Reference**: `SENTRY_QUICK_REFERENCE.md`
- **Integration Summary**: `SENTRY_INTEGRATION_SUMMARY.md`

## Sign-off

- [ ] Environment variables configured
- [ ] Test errors captured successfully
- [ ] Source maps working
- [ ] Alerts configured
- [ ] Team trained
- [ ] Documentation complete
- [ ] Monitoring active

**Deployed by:** _______________
**Date:** _______________
**Sentry Project:** _______________
**Sign-off:** _______________
