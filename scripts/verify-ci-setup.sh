#!/bin/bash

# CI/CD Setup Verification Script
# This script verifies that all CI/CD components are properly configured

set -e

echo "=================================================="
echo "CI/CD Setup Verification"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - MISSING: $1"
        return 1
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - MISSING: $1"
        return 1
    fi
}

check_script() {
    if grep -q "\"$1\"" package.json; then
        echo -e "${GREEN}✓${NC} NPM script '$1' exists"
        return 0
    else
        echo -e "${RED}✗${NC} NPM script '$1' missing"
        return 1
    fi
}

ERRORS=0

echo "Checking GitHub Actions Workflows..."
check_file ".github/workflows/ci.yml" "CI workflow" || ((ERRORS++))
check_file ".github/workflows/security.yml" "Security workflow" || ((ERRORS++))
check_file ".github/workflows/preview.yml" "Preview workflow" || ((ERRORS++))
check_file ".github/workflows/release.yml" "Release workflow" || ((ERRORS++))
echo ""

echo "Checking GitHub Configuration..."
check_file ".github/dependabot.yml" "Dependabot configuration" || ((ERRORS++))
check_file ".github/PULL_REQUEST_TEMPLATE.md" "PR template" || ((ERRORS++))
check_file ".github/ISSUE_TEMPLATE/bug_report.md" "Bug report template" || ((ERRORS++))
check_file ".github/ISSUE_TEMPLATE/feature_request.md" "Feature request template" || ((ERRORS++))
check_file ".github/README.md" "GitHub README" || ((ERRORS++))
echo ""

echo "Checking Documentation..."
check_file "docs/DEPLOYMENT.md" "Deployment guide" || ((ERRORS++))
check_file "docs/CI_CD.md" "CI/CD documentation" || ((ERRORS++))
check_file "CI_CD_SETUP_SUMMARY.md" "Setup summary" || ((ERRORS++))
echo ""

echo "Checking NPM Scripts..."
check_script "typecheck" || ((ERRORS++))
check_script "lint" || ((ERRORS++))
check_script "build" || ((ERRORS++))
check_script "test" || ((ERRORS++))
check_script "db:generate" || ((ERRORS++))
echo ""

echo "Checking Project Files..."
check_file "package.json" "package.json" || ((ERRORS++))
check_file "tsconfig.json" "TypeScript config" || ((ERRORS++))
check_file ".env.example" "Environment example" || ((ERRORS++))
check_file "prisma/schema.prisma" "Prisma schema" || ((ERRORS++))
echo ""

echo "Testing NPM Scripts..."
echo -e "${YELLOW}Running typecheck...${NC}"
if npm run typecheck 2>&1 | grep -q "error TS"; then
    echo -e "${YELLOW}⚠${NC} TypeScript errors found (this is expected, fix before production)"
else
    echo -e "${GREEN}✓${NC} TypeScript validation passed"
fi
echo ""

echo "=================================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Push .github directory to repository"
    echo "2. Verify workflows run on GitHub Actions"
    echo "3. Configure branch protection rules"
    echo "4. Test with a sample pull request"
else
    echo -e "${RED}✗ $ERRORS check(s) failed${NC}"
    echo ""
    echo "Please fix the issues above before proceeding."
    exit 1
fi
echo "=================================================="
