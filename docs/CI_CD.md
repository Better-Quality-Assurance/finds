# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Finds auction platform.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Troubleshooting](#troubleshooting)

## Overview

The CI/CD pipeline uses GitHub Actions for automated testing, security scanning, and deployment coordination with Vercel.

### Pipeline Architecture

```
Push/PR → GitHub Actions → Tests/Lint/TypeCheck → Vercel Deploy → Production
                ↓
         Security Scanning
                ↓
         Dependency Updates (Dependabot)
```

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Lint
- Runs ESLint to check code quality
- Enforces coding standards
- Fails on any linting errors

```bash
npm run lint
```

#### Type Check
- Runs TypeScript compiler in no-emit mode
- Validates type safety across the codebase
- Generates Prisma Client for type definitions

```bash
npm run typecheck
```

#### Build
- Builds Next.js application
- Validates production build configuration
- Tests environment variable handling
- Uploads build artifacts for inspection

```bash
npm run build
```

#### Test
- Runs unit and integration tests with Vitest
- Validates business logic
- Tests React components
- Future: Will include E2E tests

```bash
npm run test:run
```

#### Prisma Validate
- Validates Prisma schema syntax
- Checks for schema formatting issues
- Ensures database schema integrity

```bash
npx prisma validate
npx prisma format --check
```

**Status Checks:**
All jobs must pass before a PR can be merged.

### 2. Security Workflow (`.github/workflows/security.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Mondays at 00:00 UTC)

**Jobs:**

#### NPM Audit
- Scans dependencies for known vulnerabilities
- Checks production dependencies with strict thresholds
- Fails on high/critical vulnerabilities

```bash
npm audit --production --audit-level=high
```

#### Secret Scanning
- Scans code for hardcoded secrets
- Checks for API keys, passwords, tokens
- Validates AWS credentials aren't committed
- Ensures private keys aren't in repository
- Verifies .env files aren't committed

**Patterns Checked:**
- `password.*=.*["'].*["']`
- `api[_-]?key.*=.*["'].*["']`
- `secret.*=.*["'].*["']`
- `token.*=.*["'].*["']`
- AWS access keys (AKIA format)
- Private key blocks
- Stripe live keys

#### Dependency Security Check
- Lists outdated packages
- Generates detailed vulnerability report
- Uploads audit report as artifact (30-day retention)

#### Prisma Security
- Validates schema security
- Checks password field types
- Verifies proper indexing for security

#### Environment Validation
- Ensures `.env.example` exists
- Validates placeholder values (not real secrets)

### 3. Preview Deployment Workflow (`.github/workflows/preview.yml`)

**Triggers:**
- Pull request opened, synchronized, or reopened

**Jobs:**

#### Preview Info
- Posts comment on PR with preview URL
- Provides testing checklist
- Includes deployment commands

#### Lighthouse CI
- Runs performance audits (optional)
- Checks Core Web Vitals
- Validates accessibility

#### Bundle Size Analysis
- Analyzes Next.js bundle size
- Warns on significant increases
- Tracks JavaScript payload

### 4. Release Workflow (`.github/workflows/release.yml`)

**Triggers:**
- Push of version tags (`v*.*.*`)

**Jobs:**

#### Create Release
- Runs full test suite
- Builds production bundle
- Generates changelog from commits
- Creates GitHub release
- Tags prerelease for alpha/beta versions

**Usage:**
```bash
# Create a new release
git tag v1.0.0
git push origin v1.0.0
```

## Environment Setup

### Required Secrets

Configure in **GitHub Settings > Secrets and Variables > Actions**:

```bash
# Not required for current setup
# Future: Add secrets for deployment automation
```

### Required Variables

Configure in **GitHub Settings > Secrets and Variables > Actions > Variables**:

```bash
# Not required for current setup
# All env vars are handled by Vercel
```

## Deployment Process

### Automatic Deployment (Recommended)

1. **Pull Request Created**
   - CI workflow runs automatically
   - All checks must pass
   - Preview deployment via Vercel (automatic)

2. **PR Merged to Main**
   - CI workflow runs on main branch
   - Vercel automatically deploys to production
   - Production URL updated

3. **Rollback if Needed**
   - Use Vercel dashboard to promote previous deployment
   - Or use Vercel CLI: `vercel rollback`

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
vercel --target production
```

## Dependabot Configuration

### Automatic Dependency Updates

**Schedule:** Weekly on Mondays at 09:00 UTC

**Configuration:**
- NPM packages: Groups minor/patch updates
- GitHub Actions: Separate updates
- Security patches: Immediate PRs

**Grouping Strategy:**

1. **Production Dependencies**
   - Minor and patch updates grouped
   - Weekly updates

2. **Development Dependencies**
   - Minor and patch updates grouped
   - Weekly updates

3. **Specific Package Groups:**
   - AWS SDK packages (`@aws-sdk/*`)
   - Radix UI packages (`@radix-ui/*`)
   - TanStack packages (`@tanstack/*`)

**Ignored Major Updates:**
- Next.js
- React/React DOM
- NextAuth
- Prisma Client

These require manual review due to potential breaking changes.

### Reviewing Dependabot PRs

1. **Automated Checks**
   - CI workflow runs automatically
   - Security scan included
   - Build validation performed

2. **Manual Review**
   - Check changelog for breaking changes
   - Review test results
   - Test locally if significant updates

3. **Merging**
   - Approve and merge if all checks pass
   - Update related documentation if needed

## Monitoring and Alerts

### Build Status Monitoring

**GitHub Actions Dashboard:**
- View at: `https://github.com/<owner>/<repo>/actions`
- Filter by workflow, branch, or status
- Download logs for debugging

**Status Badges:**
Add to README.md:
```markdown
![CI](https://github.com/<owner>/<repo>/workflows/CI/badge.svg)
![Security](https://github.com/<owner>/<repo>/workflows/Security/badge.svg)
```

### Vercel Deployment Monitoring

**Vercel Dashboard:**
- View deployments: `https://vercel.com/<team>/<project>`
- Check build logs
- Monitor performance metrics
- Review function execution

**Alerts:**
Configure in Vercel dashboard:
- Failed deployments
- High error rates
- Performance degradation

### Notification Setup

**GitHub Notifications:**
1. Go to repository **Settings > Notifications**
2. Enable workflow failure notifications
3. Configure email or Slack integration

**Vercel Notifications:**
1. Go to **Project Settings > Notifications**
2. Enable deployment notifications
3. Configure Slack/Discord webhooks

## Pull Request Workflow

### Standard Flow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push and Create PR**
   ```bash
   git push origin feature/my-feature
   # Create PR on GitHub
   ```

4. **CI Checks Run Automatically**
   - Lint check
   - Type check
   - Build validation
   - Tests
   - Security scan

5. **Review and Approve**
   - Request reviews from team
   - Address feedback
   - Ensure all checks pass

6. **Merge to Main**
   - Use "Squash and merge" or "Rebase and merge"
   - Delete branch after merge
   - Vercel deploys automatically

### PR Checklist

Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`):

- [ ] All CI checks passing
- [ ] Code reviewed by at least one person
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Environment variables documented (if new)
- [ ] Database migrations tested (if applicable)

## Troubleshooting

### Common CI Failures

#### Lint Errors

```bash
# Run locally to see errors
npm run lint

# Auto-fix where possible
npm run lint -- --fix
```

#### Type Errors

```bash
# Run locally
npm run typecheck

# Check specific file
npx tsc --noEmit <file.ts>
```

#### Build Failures

```bash
# Common causes:
# 1. Missing environment variables
# 2. Prisma client not generated
# 3. TypeScript errors

# Generate Prisma client
npm run db:generate

# Build locally
npm run build
```

#### Test Failures

```bash
# Run tests locally
npm test

# Run specific test
npm test -- <test-file>

# Run with UI
npm run test:ui
```

### Security Scan False Positives

If security scan flags false positives:

1. **Review the pattern match**
2. **Update `.github/workflows/security.yml`** to exclude specific patterns
3. **Document the decision** in PR comments

### Dependabot PR Issues

**Failing Tests:**
1. Review changelog for breaking changes
2. Update code to accommodate changes
3. Push updates to Dependabot branch

**Merge Conflicts:**
```bash
# Rebase Dependabot PR
@dependabot rebase
```

**Close Unnecessary PRs:**
```bash
# Comment on PR
@dependabot close
```

### Vercel Deployment Failures

**Check Build Logs:**
1. Go to Vercel deployment page
2. Click on failed deployment
3. Review build logs
4. Check environment variables

**Common Issues:**
- Missing environment variables
- Database connection failures
- Build timeout (increase in Vercel settings)
- Out of memory (upgrade plan or optimize build)

**Manual Redeploy:**
```bash
vercel --prod --force
```

## Best Practices

### Commits

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Keep commits atomic and focused
- Write descriptive commit messages

### Branches

- Use descriptive branch names: `feature/`, `fix/`, `chore/`
- Keep branches up to date with main
- Delete branches after merge

### Pull Requests

- Keep PRs focused and small
- Fill out PR template completely
- Request reviews from relevant team members
- Address review feedback promptly

### Environment Variables

- Never commit secrets to git
- Always update `.env.example`
- Document all new variables
- Use strong values in production

### Testing

- Write tests for new features
- Update tests for bug fixes
- Aim for >80% code coverage
- Test edge cases

### Security

- Review Dependabot PRs weekly
- Address security vulnerabilities promptly
- Keep dependencies up to date
- Use security headers in production

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

## Support

For CI/CD issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Check Vercel deployment logs
4. Contact the development team

---

**Last Updated:** 2025-12-25
**Maintained By:** Development Team
