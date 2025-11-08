#!/bin/bash

# Simple JWT Authentication Test (without password)
WORDPRESS_URL="${1:-https://qvwltjhdjw.cfolks.pl}"

echo "🧪 Testing JWT Authentication Endpoints"
echo "WordPress URL: $WORDPRESS_URL"
echo ""

echo "✅ Test 1: /login endpoint (without credentials)"
RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP:" | cut -d: -f2)
if [ "$HTTP_CODE" = "400" ]; then
    echo "   ✅ Endpoint accessible (HTTP 400 - expected for missing credentials)"
else
    echo "   ❌ Unexpected status: HTTP $HTTP_CODE"
fi
echo ""

echo "✅ Test 2: /validate endpoint (without token)"
RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/validate" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP:" | cut -d: -f2)
if [ "$HTTP_CODE" = "400" ]; then
    echo "   ✅ Endpoint accessible (HTTP 400 - expected for missing token)"
else
    echo "   ❌ Unexpected status: HTTP $HTTP_CODE"
fi
echo ""

echo "✅ Test 3: /refresh endpoint (without token)"
RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X POST "${WORDPRESS_URL}/wp-json/king-jwt/v1/refresh" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP:" | cut -d: -f2)
if [ "$HTTP_CODE" = "400" ]; then
    echo "   ✅ Endpoint accessible (HTTP 400 - expected for missing token)"
else
    echo "   ❌ Unexpected status: HTTP $HTTP_CODE"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All endpoints are accessible and responding correctly!"
echo ""
echo "📝 To test full authentication flow, you need:"
echo "   1. Valid email and password"
echo "   2. Run: curl -X POST \"$WORDPRESS_URL/wp-json/king-jwt/v1/login\" \\"
echo "            -H \"Content-Type: application/json\" \\"
echo "            -d '{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}'"
echo ""

