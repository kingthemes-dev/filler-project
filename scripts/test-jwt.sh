#!/bin/bash

# JWT Authentication Test Script
# Usage: ./scripts/test-jwt.sh [WORDPRESS_URL] [EMAIL] [PASSWORD]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get parameters
WORDPRESS_URL="${1:-https://qvwltjhdjw.cfolks.pl}"
EMAIL="${2:-hello@kingbrand.pl}"
PASSWORD="${3}"

echo -e "${BLUE}🧪 Testing JWT Authentication${NC}"
echo -e "${BLUE}WordPress URL: ${WORDPRESS_URL}${NC}"
echo ""

# Check if password is provided
if [ -z "$PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Password not provided. Testing without authentication...${NC}"
    echo -e "${YELLOW}Usage: ./scripts/test-jwt.sh [WORDPRESS_URL] [EMAIL] [PASSWORD]${NC}"
    echo ""
    TEST_AUTH=false
else
    TEST_AUTH=true
fi

# Test 1: Check if endpoints are accessible
echo -e "${BLUE}Test 1: Checking endpoint accessibility...${NC}"
echo ""

# Test login endpoint (should return 400 without credentials or 401 with wrong credentials)
echo -e "${YELLOW}→ Testing /login endpoint (without credentials)...${NC}"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 || echo "HTTP_CODE:000")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ Login endpoint is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Login endpoint returned unexpected status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test validate endpoint (should return 400 without token)
echo -e "${YELLOW}→ Testing /validate endpoint (without token)...${NC}"
VALIDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/validate" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 || echo "HTTP_CODE:000")

HTTP_CODE=$(echo "$VALIDATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
BODY=$(echo "$VALIDATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✅ Validate endpoint is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Validate endpoint returned unexpected status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test refresh endpoint (should return 400 without token)
echo -e "${YELLOW}→ Testing /refresh endpoint (without token)...${NC}"
REFRESH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/refresh" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 || echo "HTTP_CODE:000")

HTTP_CODE=$(echo "$REFRESH_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
BODY=$(echo "$REFRESH_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✅ Refresh endpoint is accessible (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}❌ Refresh endpoint returned unexpected status: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi
echo ""

# Test 2: Login (if password provided)
if [ "$TEST_AUTH" = true ]; then
    echo -e "${BLUE}Test 2: Testing login with credentials...${NC}"
    echo ""
    
    echo -e "${YELLOW}→ Logging in as ${EMAIL}...${NC}"
    LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" 2>&1 || echo "HTTP_CODE:000")
    
    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
    BODY=$(echo "$LOGIN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Login successful (HTTP 200)${NC}"
        
        # Extract token
        TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
        
        if [ -n "$TOKEN" ]; then
            echo -e "${GREEN}✅ Token received: ${TOKEN:0:50}...${NC}"
            
            # Test 3: Validate token
            echo ""
            echo -e "${BLUE}Test 3: Testing token validation...${NC}"
            echo -e "${YELLOW}→ Validating token...${NC}"
            
            VALIDATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/validate" \
              -H "Content-Type: application/json" \
              -d "{\"token\":\"${TOKEN}\"}" 2>&1 || echo "HTTP_CODE:000")
            
            HTTP_CODE=$(echo "$VALIDATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
            VALIDATE_BODY=$(echo "$VALIDATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
            
            if [ "$HTTP_CODE" = "200" ]; then
                echo -e "${GREEN}✅ Token validation successful (HTTP 200)${NC}"
                echo "Response: $VALIDATE_BODY" | head -c 200
                echo ""
            else
                echo -e "${RED}❌ Token validation failed (HTTP $HTTP_CODE)${NC}"
                echo "Response: $VALIDATE_BODY"
            fi
            
            # Test 4: Refresh token (first time)
            echo ""
            echo -e "${BLUE}Test 4: Testing token refresh...${NC}"
            echo -e "${YELLOW}→ Refreshing token (1/6)...${NC}"
            
            REFRESH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/refresh" \
              -H "Content-Type: application/json" \
              -d "{\"token\":\"${TOKEN}\"}" 2>&1 || echo "HTTP_CODE:000")
            
            HTTP_CODE=$(echo "$REFRESH_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
            REFRESH_BODY=$(echo "$REFRESH_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
            
            if [ "$HTTP_CODE" = "200" ]; then
                echo -e "${GREEN}✅ Token refresh successful (HTTP 200)${NC}"
                
                # Extract new token
                NEW_TOKEN=$(echo "$REFRESH_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")
                
                if [ -n "$NEW_TOKEN" ]; then
                    echo -e "${GREEN}✅ New token received: ${NEW_TOKEN:0:50}...${NC}"
                    
                    # Test 5: Try to use old token again (should fail - token rotation)
                    echo ""
                    echo -e "${BLUE}Test 5: Testing token rotation (old token should be invalid)...${NC}"
                    echo -e "${YELLOW}→ Trying to refresh with old token (should fail)...${NC}"
                    
                    OLD_TOKEN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/refresh" \
                      -H "Content-Type: application/json" \
                      -d "{\"token\":\"${TOKEN}\"}" 2>&1 || echo "HTTP_CODE:000")
                    
                    OLD_HTTP_CODE=$(echo "$OLD_TOKEN_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
                    OLD_BODY=$(echo "$OLD_TOKEN_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
                    
                    if [ "$OLD_HTTP_CODE" = "401" ]; then
                        echo -e "${GREEN}✅ Token rotation works! Old token rejected (HTTP 401)${NC}"
                        echo "Response: $OLD_BODY" | head -c 200
                        echo ""
                    else
                        echo -e "${RED}❌ Token rotation test failed (HTTP $OLD_HTTP_CODE)${NC}"
                        echo "Response: $OLD_BODY"
                    fi
                    
                    # Test 6: Rate limiting (try 6 refreshes)
                    echo ""
                    echo -e "${BLUE}Test 6: Testing rate limiting (6 refresh requests, should limit at 5)...${NC}"
                    
                    for i in {1..6}; do
                        echo -e "${YELLOW}→ Refresh request $i/6...${NC}"
                        RATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/refresh" \
                          -H "Content-Type: application/json" \
                          -d "{\"token\":\"${NEW_TOKEN}\"}" 2>&1 || echo "HTTP_CODE:000")
                        
                        RATE_HTTP_CODE=$(echo "$RATE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2 || echo "000")
                        RATE_BODY=$(echo "$RATE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
                        
                        if [ "$RATE_HTTP_CODE" = "200" ]; then
                            echo -e "${GREEN}  ✅ Request $i: Success (HTTP 200)${NC}"
                            # Update token for next request
                            NEW_TOKEN=$(echo "$RATE_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "$NEW_TOKEN")
                        elif [ "$RATE_HTTP_CODE" = "429" ]; then
                            echo -e "${YELLOW}  ⚠️  Request $i: Rate limited (HTTP 429) - Expected!${NC}"
                            echo "  Response: $RATE_BODY" | head -c 150
                            echo ""
                            
                            if [ "$i" -ge 6 ]; then
                                echo -e "${GREEN}✅ Rate limiting works correctly!${NC}"
                            fi
                            break
                        else
                            echo -e "${RED}  ❌ Request $i: Unexpected status (HTTP $RATE_HTTP_CODE)${NC}"
                            echo "  Response: $RATE_BODY"
                        fi
                        
                        sleep 0.5
                    done
                else
                    echo -e "${RED}❌ No new token in refresh response${NC}"
                fi
            else
                echo -e "${RED}❌ Token refresh failed (HTTP $HTTP_CODE)${NC}"
                echo "Response: $REFRESH_BODY"
            fi
        else
            echo -e "${RED}❌ No token in login response${NC}"
        fi
    else
        echo -e "${RED}❌ Login failed (HTTP $HTTP_CODE)${NC}"
        echo "Response: $BODY"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping authentication tests (no password provided)${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Testing completed!${NC}"
echo ""

