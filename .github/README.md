# GitHub Actions CI/CD Configuration

This directory contains all GitHub Actions workflows and templates for the Finds auction platform.

## Quick Start

### For Developers

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and push**
   ```bash
   git push origin feature/my-feature
   ```

3. **Create Pull Request**
   - Use the PR template provided
   - CI checks run automatically
   - All checks must pass before merge

4. **Merge to main**
   - Production deployment happens automatically via Vercel

### For Reviewers

1. Check that all CI checks pass (green checkmarks)
2. Review the code changes
3. Test locally if needed
4. Approve and merge

## Workflows

### CI Workflow (`workflows/ci.yml`)

**Purpose:** Validate code quality, type safety, and build success

**Runs on:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs:**
- **Lint** - ESLint code quality checks
- **Type Check** - TypeScript type validation
- **Build** - Next.js production build
- **Test** - Unit and integration tests
- **Prisma Validate** - Database schema validation

**Typical Duration:** 3-5 minutes

### Security Workflow (`workflows/security.yml`)

**Purpose:** Scan for vulnerabilities and security issues

**Runs on:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Weekly schedule (Mondays at 00:00 UTC)

**Jobs:**
- **NPM Audit** - Check dependencies for vulnerabilities
- **Secret Scanning** - Find hardcoded secrets
- **Dependency Check** - Outdated packages report
- **Prisma Security** - Database schema security
- **Env Validation** - Environment variable checks

**Typical Duration:** 2-4 minutes

### Preview Deployment (`workflows/preview.yml`)

**Purpose:** Provide preview deployment information and analysis

**Runs on:**
- Pull request opened/updated

**Jobs:**
- **Preview Info** - Post preview URL and checklist
- **Lighthouse CI** - Performance audits (optional)
- **Bundle Size** - Analyze JavaScript bundle size

**Typical Duration:** 4-6 minutes

### Release Workflow (`workflows/release.yml`)

**Purpose:** Create GitHub releases from version tags

**Runs on:**
- Push of version tags (`v*.*.*`)

**Jobs:**
- **Create Release** - Run tests, build, generate changelog, create release

**Usage:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Typical Duration:** 5-7 minutes

## Templates

### Pull Request Template (`PULL_REQUEST_TEMPLATE.md`)

Comprehensive template for all pull requests including:
- Description and type of change
- Testing checklist
- Security considerations
- Deployment notes
- Reviewer guidance

### Issue Templates

#### Bug Report (`ISSUE_TEMPLATE/bug_report.md`)
Template for reporting bugs with:
- Reproduction steps
- Expected vs actual behavior
- Environment details
- Screenshots

#### Feature Request (`ISSUE_TEMPLATE/feature_request.md`)
Template for suggesting features with:
- Problem statement
- Proposed solution
- User impact analysis
- Technical considerations

## Dependabot Configuration

**File:** `dependabot.yml`

**Purpose:** Automated dependency updates

**Schedule:** Weekly on Mondays at 09:00 UTC

**What it does:**
- Creates PRs for outdated dependencies
- Groups related updates together
- Runs CI checks automatically
- Ignores major version updates for breaking packages

**Package Groups:**
- Production dependencies (minor/patch)
- Development dependencies (minor/patch)
- AWS SDK packages
- Radix UI packages
- TanStack packages

**Review Process:**
1. Dependabot creates PR
2. CI checks run automatically
3. Review changelog for changes
4. Merge if all checks pass

## Status Checks

### Required Checks (Must Pass)

Before a PR can be merged, these checks must pass:

- ✅ Lint
- ✅ Type Check
- ✅ Build
- ✅ Test
- ✅ Prisma Validate
- ✅ NPM Audit (high/critical only)
- ✅ Secret Scanning

### Optional Checks

These provide additional information but don't block merges:

- ℹ️ Bundle Size Analysis
- ℹ️ Lighthouse CI
- ℹ️ Dependency Check Report

## Environment Variables

### CI Environment Variables

These are automatically provided by GitHub Actions:

- `GITHUB_TOKEN` - Authentication token
- `GITHUB_REPOSITORY` - Repository name
- `GITHUB_REF` - Branch or tag reference
- `GITHUB_SHA` - Commit SHA

### Custom Environment Variables

Currently, no custom secrets are required. All deployment-specific variables are managed by Vercel.

## Troubleshooting

### CI Checks Failing

**Lint Errors:**
```bash
npm run lint -- --fix
```

**Type Errors:**
```bash
npm run typecheck
```

**Build Errors:**
```bash
npm run db:generate
npm run build
```

**Test Failures:**
```bash
npm test
```

### Security Scan False Positives

If legitimate code triggers security warnings:

1. Review the specific pattern match
2. Update the workflow to exclude it
3. Document the decision in the PR

### Dependabot Issues

**Rebase PR:**
```
@dependabot rebase
```

**Close PR:**
```
@dependabot close
```

**Ignore Dependency:**
```
@dependabot ignore this major version
@dependabot ignore this minor version
@dependabot ignore this dependency
```

## Best Practices

### Commits

- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Keep commits focused and atomic
- Write clear commit messages

### Pull Requests

- Fill out the PR template completely
- Keep PRs small and focused
- Request reviews from relevant team members
- Address feedback promptly

### Security

- Never commit secrets or API keys
- Update `.env.example` for new variables
- Review security scan results
- Keep dependencies updated

### Testing

- Write tests for new features
- Update tests for bug fixes
- Ensure all tests pass locally before pushing

## Monitoring

### View Workflow Runs

GitHub Actions Dashboard: `https://github.com/<owner>/<repo>/actions`

### Status Badges

Add to README.md:

```markdown
![CI](https://github.com/<owner>/<repo>/workflows/CI/badge.svg)
![Security](https://github.com/<owner>/<repo>/workflows/Security/badge.svg)
```

### Notifications

Configure in GitHub Settings:
1. Personal Settings > Notifications
2. Enable workflow failure notifications
3. Set up Slack/Discord integration (optional)

## Resources

- [CI/CD Documentation](../docs/CI_CD.md) - Detailed CI/CD guide
- [Deployment Guide](../docs/DEPLOYMENT.md) - Production deployment
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Dependabot Docs](https://docs.github.com/en/code-security/dependabot)

## Support

For CI/CD questions:
1. Check the [CI/CD Documentation](../docs/CI_CD.md)
2. Review workflow logs in GitHub Actions
3. Contact the development team

---

**Maintained By:** Development Team
**Last Updated:** 2025-12-25
