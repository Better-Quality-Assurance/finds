# CI/CD Quick Reference

## Commands

### Local Development
```bash
# Run all checks locally before pushing
npm run lint              # ESLint check
npm run typecheck         # TypeScript validation
npm test                  # Run tests
npm run build             # Production build

# Fix issues
npm run lint -- --fix     # Auto-fix lint errors
```

### Verification
```bash
# Verify CI/CD setup
bash scripts/verify-ci-setup.sh

# Check package.json scripts
npm run
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/my-feature

# Push and create PR
git push origin feature/my-feature

# After merge, delete branch
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Releases
```bash
# Create release tag
git tag v1.0.0
git push origin v1.0.0

# View tags
git tag -l

# Delete tag (if needed)
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
```

### Dependabot
```bash
# Rebase Dependabot PR (comment on PR)
@dependabot rebase

# Close Dependabot PR
@dependabot close

# Ignore version
@dependabot ignore this major version
@dependabot ignore this dependency
```

## GitHub Actions Status

### View Workflows
- Dashboard: `https://github.com/<owner>/<repo>/actions`
- Workflow runs: Click on workflow name
- Logs: Click on specific job

### Re-run Failed Workflow
1. Go to failed workflow run
2. Click "Re-run jobs" dropdown
3. Select "Re-run failed jobs" or "Re-run all jobs"

## Environment Variables

### Required for Production

**Database:**
```bash
DATABASE_URL=postgresql://...
```

**Auth:**
```bash
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...
```

**AWS S3:**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=...
```

**Stripe:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Pusher:**
```bash
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...
```

**Resend:**
```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@...
```

## Vercel Deployment

### Manual Deploy
```bash
# Preview
vercel

# Production
vercel --prod

# Force redeploy
vercel --prod --force
```

### Rollback
```bash
# Via CLI
vercel rollback

# Or via dashboard
# Deployments → Previous deployment → Promote to Production
```

## Branch Protection Rules

**Settings → Branches → Add rule** for `main`:

- [x] Require pull request reviews (1+)
- [x] Require status checks:
  - Lint
  - Type Check
  - Build
  - Test
  - Prisma Validate
- [x] Require branches up to date
- [x] Require conversation resolution

## Troubleshooting

### CI Failing

**Lint errors:**
```bash
npm run lint -- --fix
```

**Type errors:**
```bash
npm run typecheck
# Fix reported errors
```

**Build errors:**
```bash
npm run db:generate
npm run build
```

**Test failures:**
```bash
npm test
# or
npm run test:ui
```

### Security Scan Issues

**False positive secrets:**
1. Review pattern in `.github/workflows/security.yml`
2. Add exclusion if legitimate
3. Document in PR

**Dependency vulnerabilities:**
```bash
npm audit
npm audit fix
# or
npm audit fix --force  # for breaking changes
```

### Vercel Issues

**Build timeout:**
- Increase timeout in Vercel settings
- Optimize build process

**Environment variables:**
- Check Vercel dashboard
- Ensure all required vars set
- Redeploy: `vercel --prod --force`

## Status Check Reference

### Required Checks
✓ Lint - ESLint code quality
✓ Type Check - TypeScript validation
✓ Build - Next.js production build
✓ Test - Vitest test suite
✓ Prisma Validate - Schema validation
✓ NPM Audit - High/critical vulnerabilities
✓ Secret Scanning - No hardcoded secrets

### Time Estimates
- Lint: ~30-45s
- Type Check: ~45-60s
- Build: ~2-3 min
- Test: ~1-2 min
- Security: ~30-45s
- **Total: ~4-6 min**

## File Locations

```
.github/
├── workflows/
│   ├── ci.yml              # Main CI pipeline
│   ├── security.yml        # Security scanning
│   ├── preview.yml         # PR previews
│   └── release.yml         # Release automation
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
├── PULL_REQUEST_TEMPLATE.md
├── dependabot.yml          # Dependency updates
└── README.md               # GitHub docs

docs/
├── DEPLOYMENT.md           # Deployment guide
├── CI_CD.md               # CI/CD documentation
├── CI_CD_FLOW.md          # Visual diagrams
└── CI_CD_QUICK_REFERENCE.md  # This file

scripts/
└── verify-ci-setup.sh     # Setup verification
```

## Workflow Triggers

**CI Workflow:**
- Push to main/develop
- PR to main/develop

**Security Workflow:**
- Push to main/develop
- PR to main/develop
- Weekly (Mon 00:00 UTC)

**Preview Workflow:**
- PR opened/synchronized/reopened

**Release Workflow:**
- Tag push (v*.*.*)

**Dependabot:**
- Weekly (Mon 09:00 UTC)

## Best Practices

### Before Pushing
- [x] Run lint locally
- [x] Run typecheck locally
- [x] Run tests locally
- [x] Review changes
- [x] Remove console.logs

### Before Creating PR
- [x] Branch up to date
- [x] Fill out PR template
- [x] Self-review code
- [x] Add screenshots (if UI)

### Before Merging
- [x] All CI checks pass
- [x] Code reviewed
- [x] Conversations resolved
- [x] No merge conflicts

### After Merging
- [x] Delete feature branch
- [x] Monitor deployment
- [x] Verify in production

## Support

**Documentation:**
- [CI/CD Guide](./CI_CD.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [CI/CD Flow](./CI_CD_FLOW.md)

**External Resources:**
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

**Contact:**
- Development team
- GitHub Issues
- Project documentation

---

**Last Updated:** 2025-12-25
**Version:** 1.0.0
