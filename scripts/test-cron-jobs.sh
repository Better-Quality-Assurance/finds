#!/bin/bash

# Test script for cron jobs
# Usage: ./scripts/test-cron-jobs.sh [job-name]
# Jobs: activate-auctions, end-auctions, release-deposits, all

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}Error: CRON_SECRET is not set in .env.local${NC}"
  exit 1
fi

# Base URL (default to localhost)
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Function to test a cron job
test_cron_job() {
  local job_name=$1
  echo -e "${YELLOW}Testing ${job_name}...${NC}"

  response=$(curl -s -w "\n%{http_code}" -X GET \
    "${BASE_URL}/api/cron/${job_name}" \
    -H "Authorization: Bearer ${CRON_SECRET}")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ ${job_name} succeeded (HTTP ${http_code})${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  else
    echo -e "${RED}✗ ${job_name} failed (HTTP ${http_code})${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi
  echo ""
}

# Function to test unauthorized access
test_unauthorized() {
  local job_name=$1
  echo -e "${YELLOW}Testing unauthorized access to ${job_name}...${NC}"

  response=$(curl -s -w "\n%{http_code}" -X GET \
    "${BASE_URL}/api/cron/${job_name}" \
    -H "Authorization: Bearer wrong-secret")

  http_code=$(echo "$response" | tail -n1)

  if [ "$http_code" = "401" ]; then
    echo -e "${GREEN}✓ Unauthorized access blocked correctly${NC}"
  else
    echo -e "${RED}✗ Security issue: Expected 401, got ${http_code}${NC}"
  fi
  echo ""
}

# Parse arguments
JOB="${1:-all}"

echo "============================================"
echo "Finds Auction Platform - Cron Job Tester"
echo "============================================"
echo "Base URL: $BASE_URL"
echo ""

case "$JOB" in
  activate-auctions)
    test_cron_job "activate-auctions"
    ;;
  end-auctions)
    test_cron_job "end-auctions"
    ;;
  release-deposits)
    test_cron_job "release-deposits"
    ;;
  security)
    echo -e "${YELLOW}Testing security...${NC}"
    test_unauthorized "activate-auctions"
    test_unauthorized "end-auctions"
    test_unauthorized "release-deposits"
    ;;
  all)
    test_cron_job "activate-auctions"
    test_cron_job "end-auctions"
    test_cron_job "release-deposits"
    echo -e "${YELLOW}Testing security...${NC}"
    test_unauthorized "activate-auctions"
    ;;
  *)
    echo -e "${RED}Unknown job: $JOB${NC}"
    echo "Usage: $0 [job-name]"
    echo "Jobs: activate-auctions, end-auctions, release-deposits, security, all"
    exit 1
    ;;
esac

echo "============================================"
echo -e "${GREEN}Testing complete!${NC}"
echo "============================================"
