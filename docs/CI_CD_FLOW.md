# CI/CD Flow Diagram

This document provides a visual representation of the CI/CD pipeline for the Finds auction platform.

## Complete Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐
│  Developer  │
│   Creates   │
│   Branch    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Code     │
│   Changes   │
│  & Commit   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Push     │
│  to GitHub  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         GITHUB ACTIONS                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│    Lint    │  │   Type     │  │   Build    │  │   Test     │
│   Check    │  │   Check    │  │  Validate  │  │   Suite    │
│  ESLint    │  │ TypeScript │  │  Next.js   │  │  Vitest    │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │               │
      └───────────────┴───────────────┴───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   All Checks     │
                    │   Passed?        │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                   Yes                No
                    │                  │
                    ▼                  ▼
          ┌──────────────┐   ┌──────────────┐
          │  Security    │   │   Notify     │
          │   Scan       │   │  Developer   │
          │   Passed?    │   │  Fix Issues  │
          └──────┬───────┘   └──────────────┘
                 │
                Yes
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PULL REQUEST STAGE                                  │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────┐
         │   Create Pull    │
         │    Request       │
         │  (PR Template)   │
         └────────┬─────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │   PR Preview Workflow       │
    │   - Post preview info       │
    │   - Bundle size analysis    │
    │   - Lighthouse CI (opt)     │
    └─────────────┬───────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Vercel Preview  │
         │   Deployment     │
         │  (Automatic)     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Code Review     │
         │  by Team         │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │   All Approved?  │
         └────────┬─────────┘
                  │
                 Yes
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION DEPLOYMENT                               │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────┐
         │  Merge to Main   │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  CI Runs Again   │
         │  (Final Check)   │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Vercel Deploy   │
         │   Production     │
         │   (Automatic)    │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │  Production Live │
         │  Monitoring      │
         └──────────────────┘
```

## Workflow Details

### 1. CI Workflow (Continuous Integration)

```
Push/PR Event
      │
      ▼
┌─────────────────────────────────────────┐
│           CI Workflow                   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Lint                      │   │
│  │  - Checkout code                │   │
│  │  - Setup Node.js 20             │   │
│  │  - npm ci                       │   │
│  │  - npm run lint                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Type Check                │   │
│  │  - Checkout code                │   │
│  │  - Setup Node.js 20             │   │
│  │  - npm ci                       │   │
│  │  - npm run db:generate          │   │
│  │  - npm run typecheck            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Build                     │   │
│  │  - Checkout code                │   │
│  │  - Setup Node.js 20             │   │
│  │  - npm ci                       │   │
│  │  - npm run db:generate          │   │
│  │  - npm run build                │   │
│  │  - Upload build artifacts       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Test                      │   │
│  │  - Checkout code                │   │
│  │  - Setup Node.js 20             │   │
│  │  - npm ci                       │   │
│  │  - npm test                     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Prisma Validate           │   │
│  │  - Checkout code                │   │
│  │  - Setup Node.js 20             │   │
│  │  - npm ci                       │   │
│  │  - npx prisma validate          │   │
│  │  - npx prisma format --check    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 2. Security Workflow

```
Push/PR/Schedule Event
      │
      ▼
┌─────────────────────────────────────────┐
│        Security Workflow                │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: NPM Audit                 │   │
│  │  - npm audit (moderate level)   │   │
│  │  - npm audit --production       │   │
│  │    (high level, fails on high)  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Secret Scan               │   │
│  │  - Scan for passwords           │   │
│  │  - Scan for API keys            │   │
│  │  - Scan for tokens              │   │
│  │  - Check for .env files         │   │
│  │  - Check for AWS credentials    │   │
│  │  - Check for private keys       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Dependency Check          │   │
│  │  - npm outdated                 │   │
│  │  - Generate audit report        │   │
│  │  - Upload report artifact       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Job: Prisma Security           │   │
│  │  - Validate schema              │   │
│  │  - Check password fields        │   │
│  │  - Verify indexes               │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 3. Dependabot Workflow

```
Weekly Schedule (Mon 09:00 UTC)
      │
      ▼
┌─────────────────────────────────────────┐
│         Dependabot Process              │
├─────────────────────────────────────────┤
│                                         │
│  1. Scan package.json                   │
│  2. Check for updates                   │
│  3. Group related packages              │
│  4. Create Pull Requests                │
│                                         │
│     ┌─────────────────────────┐         │
│     │  Production Dependencies│         │
│     │  (minor/patch grouped)  │         │
│     └──────────┬──────────────┘         │
│                │                        │
│     ┌──────────▼──────────────┐         │
│     │  Dev Dependencies       │         │
│     │  (minor/patch grouped)  │         │
│     └──────────┬──────────────┘         │
│                │                        │
│     ┌──────────▼──────────────┐         │
│     │  Package Groups         │         │
│     │  - AWS SDK              │         │
│     │  - Radix UI             │         │
│     │  - TanStack             │         │
│     └──────────┬──────────────┘         │
│                │                        │
│                ▼                        │
│     ┌──────────────────────┐            │
│     │  Create PR           │            │
│     │  - Run CI checks     │            │
│     │  - Await review      │            │
│     └──────────────────────┘            │
│                                         │
└─────────────────────────────────────────┘
```

### 4. Release Workflow

```
Version Tag Push (v*.*.*)
      │
      ▼
┌─────────────────────────────────────────┐
│         Release Workflow                │
├─────────────────────────────────────────┤
│                                         │
│  1. Extract version from tag            │
│  2. Run full test suite                 │
│  3. Build production bundle             │
│  4. Generate changelog                  │
│     - Get commits since last tag        │
│     - Format commit messages            │
│  5. Create GitHub Release               │
│     - Include changelog                 │
│     - Add installation instructions     │
│     - Mark prerelease if alpha/beta     │
│  6. Notify team                         │
│                                         │
└─────────────────────────────────────────┘
```

## Status Checks Flow

```
Pull Request Created
      │
      ▼
┌─────────────────────────────────────────┐
│       Required Status Checks            │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Lint                                 │
│  ✓ Type Check                           │
│  ✓ Build                                │
│  ✓ Test                                 │
│  ✓ Prisma Validate                      │
│  ✓ NPM Audit (high/critical)            │
│  ✓ Secret Scanning                      │
│                                         │
└──────────────┬──────────────────────────┘
               │
               ▼
        All Checks Pass?
               │
      ┌────────┴────────┐
      │                 │
     Yes               No
      │                 │
      ▼                 ▼
  ┌────────┐      ┌──────────┐
  │ Enable │      │  Block   │
  │ Merge  │      │  Merge   │
  │ Button │      │  Button  │
  └────────┘      └──────────┘
```

## Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Deployment Pipeline                       │
└─────────────────────────────────────────────────────────────┘

Development
    │
    ├─── Create Feature Branch
    │         │
    │         ├─── Code Changes
    │         │
    │         ├─── Push to GitHub
    │         │         │
    │         │         ├─── CI Checks Run
    │         │         │
    │         │         └─── Create Pull Request
    │         │                   │
    │         │                   ├─── Preview Deploy (Vercel)
    │         │                   │
    │         │                   ├─── Code Review
    │         │                   │
    │         │                   └─── Merge to Main
    │         │
    │         └─── Delete Feature Branch
    │
    ├─── Main Branch
    │         │
    │         ├─── CI Checks Run (Final)
    │         │
    │         ├─── Production Deploy (Vercel)
    │         │         │
    │         │         ├─── Build & Deploy
    │         │         │
    │         │         ├─── Run Migrations (if needed)
    │         │         │
    │         │         └─── Go Live
    │         │
    │         └─── Monitor Production
    │
    └─── Production
              │
              ├─── Health Checks
              │
              ├─── Performance Monitoring
              │
              └─── Error Tracking
```

## Time Estimates

| Workflow Stage | Estimated Time |
|----------------|----------------|
| Lint Check | 30-45 seconds |
| Type Check | 45-60 seconds |
| Build | 2-3 minutes |
| Tests | 1-2 minutes |
| Security Scan | 30-45 seconds |
| Total CI Time | 4-6 minutes |
| Vercel Deploy | 2-4 minutes |
| **Total Pipeline** | **6-10 minutes** |

## Success Criteria

### Green Build

```
✓ Lint: All ESLint rules pass
✓ TypeScript: No type errors
✓ Build: Next.js builds successfully
✓ Tests: All tests pass (100%)
✓ Security: No high/critical vulnerabilities
✓ Secrets: No secrets detected in code
```

### Failed Build

```
✗ One or more checks failed
→ Developer receives notification
→ Fix issues locally
→ Push fixes
→ CI runs again automatically
```

## Environment Variables Flow

```
Development → .env.local (local only, not committed)
              │
Testing     → GitHub Actions uses test values
              │
Preview     → Vercel Preview Environment
              │
Production  → Vercel Production Environment
```

## Monitoring Points

```
┌─────────────────────────────────────────┐
│         Monitoring Stack                │
├─────────────────────────────────────────┤
│                                         │
│  GitHub Actions                         │
│  └─── Workflow Status                   │
│  └─── Build Logs                        │
│  └─── Artifacts                         │
│                                         │
│  Vercel Dashboard                       │
│  └─── Deployment Status                 │
│  └─── Performance Metrics               │
│  └─── Function Logs                     │
│  └─── Analytics                         │
│                                         │
│  Dependabot                             │
│  └─── Security Alerts                   │
│  └─── Update PRs                        │
│  └─── Dependency Graph                  │
│                                         │
└─────────────────────────────────────────┘
```

## Rollback Flow

```
Issue Detected in Production
      │
      ▼
┌─────────────────────┐
│  Immediate Actions  │
├─────────────────────┤
│                     │
│  1. Identify Issue  │
│  2. Assess Impact   │
│  3. Make Decision   │
│                     │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │  Rollback?   │
    └──────┬───────┘
           │
      ┌────┴────┐
      │         │
     Yes       No
      │         │
      │         └─── Deploy Hotfix
      │                   │
      │                   └─── CI/CD Pipeline
      │
      ▼
┌─────────────────────┐
│  Vercel Dashboard   │
│  - Find previous    │
│    deployment       │
│  - Click "Promote   │
│    to Production"   │
│  OR                 │
│  vercel rollback    │
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│  Verify Rollback    │
│  - Check health     │
│  - Monitor errors   │
│  - Notify team      │
└─────────────────────┘
```

## Best Practices Checklist

```
Before Pushing:
  ☐ Run lint locally
  ☐ Run type check locally
  ☐ Run tests locally
  ☐ Run build locally
  ☐ Check for console.logs
  ☐ Review changes

Before Creating PR:
  ☐ Branch up to date with main
  ☐ Fill out PR template
  ☐ Self-review code
  ☐ Add screenshots (if UI)
  ☐ Document breaking changes

Before Merging:
  ☐ All CI checks pass
  ☐ Code reviewed
  ☐ Conversations resolved
  ☐ No merge conflicts
  ☐ Documentation updated

After Merging:
  ☐ Delete feature branch
  ☐ Monitor deployment
  ☐ Verify in production
  ☐ Close related issues
```

---

**Reference:** This flow is based on the CI/CD setup documented in [CI_CD.md](./CI_CD.md)
