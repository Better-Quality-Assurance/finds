#!/bin/bash

# Security Headers Verification Script
# Tests security headers in production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URL
URL="${1:-https://finds.ro}"

echo "======================================"
echo "Security Headers Verification"
echo "======================================"
echo "Testing URL: $URL"
echo ""

# Function to check if header exists and matches expected value
check_header() {
    local header_name="$1"
    local expected_pattern="$2"
    local description="$3"

    echo -n "Checking $header_name... "

    # Get header value
    header_value=$(curl -s -I "$URL" | grep -i "^$header_name:" | cut -d' ' -f2- | tr -d '\r\n')

    if [ -z "$header_value" ]; then
        echo -e "${RED}MISSING${NC}"
        echo "  Expected: $description"
        return 1
    fi

    if [[ "$header_value" =~ $expected_pattern ]]; then
        echo -e "${GREEN}PASS${NC}"
        echo "  Value: $header_value"
        return 0
    else
        echo -e "${YELLOW}WARNING${NC}"
        echo "  Expected pattern: $expected_pattern"
        echo "  Actual value: $header_value"
        return 1
    fi
}

# Track results
PASSED=0
FAILED=0

echo "=== Core Security Headers ==="
echo ""

if check_header "Strict-Transport-Security" "max-age=63072000" "HSTS with 2-year max-age"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

if check_header "X-Content-Type-Options" "nosniff" "Prevent MIME-type sniffing"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

if check_header "X-Frame-Options" "SAMEORIGIN" "Prevent clickjacking"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

if check_header "X-XSS-Protection" "1; mode=block" "XSS filter enabled"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

if check_header "Referrer-Policy" "strict-origin-when-cross-origin" "Control referrer information"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

if check_header "Permissions-Policy" "camera" "Restrict browser features"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

echo "=== Content Security Policy ==="
echo ""

if check_header "Content-Security-Policy" "default-src" "CSP directive"; then
    ((PASSED++))

    # Check specific CSP directives
    csp_value=$(curl -s -I "$URL" | grep -i "^Content-Security-Policy:" | cut -d' ' -f2- | tr -d '\r\n')

    echo "  Checking CSP directives:"

    if [[ "$csp_value" =~ "script-src" ]]; then
        echo -e "    script-src: ${GREEN}PRESENT${NC}"
    else
        echo -e "    script-src: ${RED}MISSING${NC}"
    fi

    if [[ "$csp_value" =~ "https://js.stripe.com" ]]; then
        echo -e "    Stripe support: ${GREEN}PRESENT${NC}"
    else
        echo -e "    Stripe support: ${YELLOW}MISSING${NC}"
    fi

    if [[ "$csp_value" =~ "pusher.com" ]]; then
        echo -e "    Pusher support: ${GREEN}PRESENT${NC}"
    else
        echo -e "    Pusher support: ${YELLOW}MISSING${NC}"
    fi

    if [[ "$csp_value" =~ "r2.cloudflarestorage.com" ]]; then
        echo -e "    R2 storage support: ${GREEN}PRESENT${NC}"
    else
        echo -e "    R2 storage support: ${YELLOW}MISSING${NC}"
    fi

    if [[ "$csp_value" =~ "frame-ancestors" ]]; then
        echo -e "    frame-ancestors: ${GREEN}PRESENT${NC}"
    else
        echo -e "    frame-ancestors: ${RED}MISSING${NC}"
    fi

    if [[ "$csp_value" =~ "upgrade-insecure-requests" ]]; then
        echo -e "    upgrade-insecure-requests: ${GREEN}PRESENT${NC}"
    else
        echo -e "    upgrade-insecure-requests: ${YELLOW}MISSING${NC}"
    fi
else
    ((FAILED++))
fi
echo ""

echo "=== Cross-Origin Headers ==="
echo ""

if check_header "Cross-Origin-Opener-Policy" "same-origin" "Isolate browsing context"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

if check_header "Cross-Origin-Resource-Policy" "same-origin" "Restrict cross-origin resources"; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

echo "======================================"
echo "Results Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All security headers are properly configured!${NC}"
    exit 0
else
    echo -e "${YELLOW}Some headers are missing or misconfigured.${NC}"
    echo "Please review the output above and update next.config.mjs"
    exit 1
fi
