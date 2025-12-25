## Description

<!-- Provide a clear and concise description of what this PR does -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (code change that neither fixes a bug nor adds a feature)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Dependency update
- [ ] Configuration change

## Related Issues

<!-- Link to related issues or tickets -->

Fixes #(issue number)
Relates to #(issue number)

## Changes Made

<!-- List the main changes in bullet points -->

-
-
-

## Technical Details

<!-- Provide technical context, architectural decisions, or implementation details if relevant -->

### Database Changes
- [ ] Database migration required
- [ ] Prisma schema updated
- [ ] Seed data modified

### API Changes
- [ ] New API endpoints added
- [ ] Existing API endpoints modified
- [ ] Breaking API changes

### Environment Variables
- [ ] New environment variables required (documented in .env.example)
- [ ] Existing environment variables modified

## Testing

### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

### Test Scenarios
<!-- Describe the scenarios you tested -->

1.
2.
3.

### Manual Testing Steps
<!-- Provide step-by-step instructions for manual testing -->

1.
2.
3.

## Screenshots/Videos

<!-- If applicable, add screenshots or videos to demonstrate the changes -->

### Before
<!-- Screenshot or description of behavior before changes -->

### After
<!-- Screenshot or description of behavior after changes -->

## Deployment Considerations

- [ ] This PR requires database migrations
- [ ] This PR requires new environment variables
- [ ] This PR requires infrastructure changes
- [ ] This PR requires third-party service configuration
- [ ] This PR includes breaking changes that need coordination

### Deployment Steps
<!-- If special deployment steps are required, list them here -->

1.
2.
3.

## Checklist

<!-- Mark completed items with an 'x' -->

### Code Quality
- [ ] Code follows the project's coding standards
- [ ] Self-review of code completed
- [ ] Code is properly commented (complex logic only)
- [ ] No console.log or debug code left in
- [ ] No commented-out code left in

### Functionality
- [ ] Changes work as expected
- [ ] Edge cases considered and handled
- [ ] Error handling implemented
- [ ] Loading states implemented (if applicable)
- [ ] Accessibility considerations addressed

### Security
- [ ] No sensitive data exposed in code
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection verified (if applicable)
- [ ] Authentication/authorization checks in place

### Performance
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Images optimized (if applicable)
- [ ] Bundle size impact considered
- [ ] Caching implemented where appropriate

### Documentation
- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Code documentation added for complex logic
- [ ] CHANGELOG updated (if applicable)
- [ ] Migration guide provided (if breaking changes)

### Testing
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Existing tests updated for changed functionality
- [ ] Manual testing completed

### UI/UX (if applicable)
- [ ] Responsive design tested
- [ ] Dark mode tested
- [ ] Cross-browser compatibility verified
- [ ] Internationalization (i18n) working correctly
- [ ] Loading states and error messages user-friendly

## Dependencies

<!-- List any dependencies this PR has on other PRs, issues, or external factors -->

- Depends on PR #
- Requires infrastructure change:
- Blocked by:

## Rollback Plan

<!-- Describe how to rollback these changes if issues occur in production -->

## Additional Notes

<!-- Any additional information that reviewers should know -->

## Reviewer Notes

<!-- Optional: Specific areas you'd like reviewers to focus on -->

- Please pay special attention to:
- I'm unsure about:
- Alternative approaches considered:

---

**For Reviewers:**
- Ensure all checklist items are addressed
- Test the changes locally if possible
- Review database migrations carefully
- Check for security implications
- Verify environment variable documentation
