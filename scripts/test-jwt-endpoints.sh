#!/bin/bash
# Test JWT endpoints
# This script tests the JWT authentication endpoints

BASE_URL="https://qvwltjhdjw.cfolks.pl"
JWT_BASE="${BASE_URL}/wp-json/king-jwt/v1"

echo "🧪 Testing JWT Authentication Endpoints"
echo "========================================"
echo ""

# Test 1: Check if /logout endpoint exists
echo "1. Testing /logout endpoint registration..."
response=$(curl -s -X POST "${JWT_BASE}/logout" \
  -H "Content-Type: application/json" \
  -d '{"token": "test"}' \
  -w "\nHTTP_CODE:%{http_code}")

http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE:/d')

if [ "$http_code" = "400" ] || [ "$http_code" = "401" ]; then
    echo "✅ /logout endpoint exists (expected error for invalid token)"
    echo "   Response: $body"
else
    echo "⚠️  Unexpected response: HTTP $http_code"
    echo "   Response: $body"
fi

echo ""

# Test 2: Check if endpoints are accessible
echo "2. Testing endpoint accessibility..."
endpoints=("login" "validate" "refresh" "logout")

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -X POST "${JWT_BASE}/${endpoint}" \
      -H "Content-Type: application/json" \
      -d '{}' \
      -w "\nHTTP_CODE:%{http_code}" \
      -o /dev/null)
    
    http_code=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
    
    if [ "$http_code" != "000" ]; then
        echo "✅ ${endpoint} endpoint accessible (HTTP $http_code)"
    else
        echo "❌ ${endpoint} endpoint not accessible"
    fi
done

echo ""
echo "✅ JWT endpoints test complete"

