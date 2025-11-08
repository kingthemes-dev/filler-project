#!/bin/bash

# Test script dla King Email System
# Usage: ./scripts/test-email-system.sh [email]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get WordPress URL from env or use default
WORDPRESS_URL="${WORDPRESS_URL:-https://qvwltjhdjw.cfolks.pl}"
TEST_EMAIL="${1:-test@example.com}"

echo -e "${YELLOW}🧪 Testing King Email System${NC}"
echo "WordPress URL: $WORDPRESS_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}❌ JWT_TOKEN not set. Please set it:${NC}"
    echo "  export JWT_TOKEN=your_jwt_token"
    echo ""
    echo -e "${YELLOW}⚠️  Testing without authentication (may fail)${NC}"
    AUTH_HEADER=""
else
    AUTH_HEADER="-H \"Authorization: Bearer $JWT_TOKEN\""
fi

echo -e "${YELLOW}1. Checking HPOS status...${NC}"
HPOS_STATUS=$(curl -s -X GET "$WORDPRESS_URL/wp-json/king-email/v1/hpos-status" \
    -H "Content-Type: application/json" \
    $AUTH_HEADER)

if echo "$HPOS_STATUS" | grep -q '"hpos_enabled":true'; then
    echo -e "${GREEN}✅ HPOS is enabled${NC}"
else
    echo -e "${RED}❌ HPOS is not enabled${NC}"
    echo "$HPOS_STATUS"
fi

echo ""
echo -e "${YELLOW}2. Getting email logs...${NC}"
LOGS=$(curl -s -X GET "$WORDPRESS_URL/wp-json/king-email/v1/logs" \
    -H "Content-Type: application/json" \
    $AUTH_HEADER)

if echo "$LOGS" | grep -q "error"; then
    echo -e "${RED}❌ Error getting logs${NC}"
    echo "$LOGS"
else
    LOG_COUNT=$(echo "$LOGS" | grep -o '"sent_at"' | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ Found $LOG_COUNT email logs${NC}"
fi

echo ""
echo -e "${YELLOW}3. Sending test email...${NC}"
TEST_RESULT=$(curl -s -X POST "$WORDPRESS_URL/wp-json/king-email/v1/send-test" \
    -H "Content-Type: application/json" \
    $AUTH_HEADER \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"template\": \"order_confirmation\"
    }")

if echo "$TEST_RESULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Test email sent successfully${NC}"
    echo "$TEST_RESULT" | jq '.' 2>/dev/null || echo "$TEST_RESULT"
else
    echo -e "${RED}❌ Failed to send test email${NC}"
    echo "$TEST_RESULT"
fi

echo ""
echo -e "${YELLOW}📋 Summary:${NC}"
echo "- Check your email at: $TEST_EMAIL"
echo "- Verify branding: FILLER"
echo "- Verify links point to frontend (filler.pl)"
echo "- Verify from name: 'FILLER - Profesjonalne produkty do pielęgnacji'"

