# API Documentation

## Overview

This document describes the API endpoints and data structures used in the FILLER Headless WooCommerce application.

## 🚀 **PERFORMANCE STATUS**
- **Lighthouse Performance**: 98-99/100 ⚡
- **Lighthouse Accessibility**: 100/100 ♿
- **Lighthouse Best Practices**: 100/100 ✅
- **Lighthouse SEO**: 100/100 🔍

## 🎯 **TOP-OF-THE-TOP FEATURES**
- **AI Chat Assistant** - inteligentny czatbot z kontekstem kosmetycznym
- **Skincare Personalization** - quiz typu skóry, builder rutyny
- **Dynamic Recommendations** - AI-powered rekomendacje produktów
- **Advanced Payments** - Buy Now Pay Later, ratalne, Apple/Google Pay
- **Abandoned Cart Recovery** - zaawansowany system odzyskiwania
- **Loyalty Program** - punkty, poziomy VIP, referral program
- **Social Commerce** - Instagram Shopping, TikTok Shop, UGC
- **3D Visualization** - wirtualna wizualizacja produktów
- **PWA** - Progressive Web App z offline support
- **Advanced Reviews** - photo/video reviews, verified purchases
- **Advanced Analytics** - heatmaps, A/B testing, predictive analytics

## Base URLs

- **Development**: `http://localhost:3001`
- **Production**: `https://filler.pl`

## Authentication

### JWT Token

Most API endpoints require authentication via JWT token stored in localStorage.

```typescript
// Token is automatically included in requests
const token = localStorage.getItem('auth-token');
```

### Headers

```http
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

## API Endpoints

### 🤖 AI Chat Assistant

#### POST /api/ai/chat
Send message to AI chat assistant.

**Request Body:**
```json
{
  "message": "Jaka jest najlepsza rutyna dla skóry tłustej?",
  "context": {
    "skinType": "oily",
    "concerns": ["acne", "pores"],
    "previousProducts": [123, 456]
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Dla skóry tłustej polecam...",
  "recommendations": [
    {
      "productId": 789,
      "reason": "Zawiera kwas salicylowy..."
    }
  ]
}
```

### 🧬 Skincare Personalization

#### POST /api/personalization/quiz
Submit skincare quiz results.

**Request Body:**
```json
{
  "skinType": "combination",
  "concerns": ["acne", "aging", "darkSpots"],
  "sensitivity": "moderate",
  "lifestyle": "busy",
  "budget": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "routine": {
    "morning": [
      {
        "step": "cleanser",
        "productId": 123,
        "instructions": "Delikatnie masuj przez 30 sekund"
      }
    ],
    "evening": [...]
  },
  "recommendations": [...]
}
```

### 🎨 Dynamic Recommendations

#### GET /api/recommendations/{userId}
Get personalized product recommendations.

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "frequentlyBoughtTogether": [...],
    "similarProducts": [...],
    "trending": [...],
    "personalized": [...]
  }
}
```

### 💳 Advanced Payments

#### POST /api/payments/klarna
Create Klarna payment session.

**Request Body:**
```json
{
  "orderId": 12345,
  "amount": 299.99,
  "currency": "PLN"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "klarna_session_123",
  "redirectUrl": "https://checkout.klarna.com/..."
}
```

### 🛍️ Abandoned Cart Recovery

#### POST /api/cart/abandoned
Track abandoned cart.

**Request Body:**
```json
{
  "userId": 123,
  "cartItems": [...],
  "abandonedAt": "2025-09-30T10:30:00Z"
}
```

#### GET /api/cart/abandoned/{userId}
Get abandoned cart recovery data.

### 🎁 Loyalty Program

#### GET /api/loyalty/points/{userId}
Get user loyalty points and status.

**Response:**
```json
{
  "success": true,
  "points": 1250,
  "tier": "gold",
  "nextTier": {
    "name": "platinum",
    "pointsNeeded": 250
  },
  "rewards": [...]
}
```

#### POST /api/loyalty/redeem
Redeem loyalty points.

### 📸 Social Commerce

#### GET /api/social/instagram/products
Get Instagram-ready product data.

#### POST /api/social/ugc/submit
Submit user-generated content.

### 🎥 3D Visualization

#### GET /api/products/{id}/3d
Get 3D model data for product.

**Response:**
```json
{
  "success": true,
  "modelUrl": "https://cdn.filler.pl/models/product_123.glb",
  "textures": [...],
  "animations": [...]
}
```

### 📱 PWA

#### GET /api/pwa/manifest
Get PWA manifest data.

#### POST /api/pwa/subscribe
Subscribe to push notifications.

### ⭐ Advanced Reviews

#### POST /api/reviews
Submit product review with media.

**Request Body:**
```json
{
  "productId": 123,
  "rating": 5,
  "title": "Świetny produkt!",
  "content": "Polecam każdemu...",
  "images": ["base64_image_1", "base64_image_2"],
  "video": "base64_video"
}
```

### 📊 Advanced Analytics

#### POST /api/analytics/track
Track user behavior event.

**Request Body:**
```json
{
  "event": "product_view",
  "properties": {
    "productId": 123,
    "category": "skincare",
    "value": 99.99
  }
}
```

#### GET /api/analytics/heatmap/{page}
Get heatmap data for page.

### Authentication

#### POST /api/auth/login
Login user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "billing": {
      "company": "Example Corp",
      "nip": "1234567890",
      "phone": "+48123456789",
      "address": "Example Street 123",
      "city": "Warsaw",
      "postcode": "00-001",
      "country": "PL"
    }
  },
  "token": "jwt-token-here"
}
```

#### POST /api/auth/register
Register new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+48123456789",
  "marketingConsent": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "User registered successfully"
}
```

### Products

#### GET /api/woocommerce?endpoint=products
Get list of products.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `per_page` (number): Items per page (default: 12)
- `search` (string): Search term
- `category` (number): Category ID
- `min_price` (number): Minimum price
- `max_price` (number): Maximum price
- `orderby` (string): Sort field (price, date, popularity)
- `order` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "name": "Product Name",
      "slug": "product-name",
      "description": "Product description",
      "short_description": "Short description",
      "price": "99.00",
      "regular_price": "99.00",
      "sale_price": "",
      "stock_status": "instock",
      "stock_quantity": 10,
      "images": [
        {
          "id": 1,
          "src": "https://example.com/image.jpg",
          "alt": "Product image"
        }
      ],
      "categories": [
        {
          "id": 1,
          "name": "Category Name",
          "slug": "category-name"
        }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 12
}
```

#### GET /api/woocommerce?endpoint=products/{id}
Get single product details.

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 1,
    "name": "Product Name",
    "description": "Full product description",
    "price": "99.00",
    "variations": [
      {
        "id": 1,
        "attributes": {
          "pa_capacity": "50ml"
        },
        "price": "99.00"
      }
    ]
  }
}
```

### Orders

#### GET /api/woocommerce?endpoint=orders&customer={id}
Get user orders.

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "number": "001",
      "status": "processing",
      "date_created": "2024-01-01T00:00:00",
      "total": "99.00",
      "currency": "PLN",
      "payment_method": "cod",
      "payment_method_title": "Za pobraniem",
      "line_items": [
        {
          "id": 1,
          "name": "Product Name",
          "quantity": 1,
          "price": "99.00",
          "total": "99.00"
        }
      ]
    }
  ]
}
```

#### POST /api/woocommerce?endpoint=orders
Create new order.

**Request Body:**
```json
{
  "payment_method": "cod",
  "billing": {
    "first_name": "John",
    "last_name": "Doe",
    "company": "Example Corp",
    "address_1": "Example Street 123",
    "city": "Warsaw",
    "postcode": "00-001",
    "country": "PL",
    "email": "user@example.com",
    "phone": "+48123456789",
    "nip": "1234567890"
  },
  "shipping": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "Example Street 123",
    "city": "Warsaw",
    "postcode": "00-001",
    "country": "PL"
  },
  "line_items": [
    {
      "product_id": 1,
      "quantity": 1
    }
  ],
  "customer_id": 1,
  "meta_data": [
    {
      "key": "_invoice_request",
      "value": "yes"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "number": "001",
    "status": "pending",
    "total": "99.00",
    "currency": "PLN"
  }
}
```

### Profile Management

#### PUT /api/woocommerce?endpoint=customer/update-profile
Update user profile.

**Request Body:**
```json
{
  "customer_id": 1,
  "profile_data": {
    "firstName": "John",
    "lastName": "Doe",
    "billing": {
      "company": "Example Corp",
      "nip": "1234567890",
      "phone": "+48123456789",
      "address": "Example Street 123",
      "city": "Warsaw",
      "postcode": "00-001",
      "country": "PL",
      "invoiceRequest": true
    },
    "shipping": {
      "address": "Example Street 123",
      "city": "Warsaw",
      "postcode": "00-001",
      "country": "PL"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profil został zaktualizowany pomyślnie",
  "customer": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "billing": {
      "company": "Example Corp",
      "nip": "1234567890",
      "phone": "+48123456789",
      "address": "Example Street 123",
      "city": "Warsaw",
      "postcode": "00-001",
      "country": "PL"
    }
  }
}
```

### Invoices

#### GET /api/woocommerce?endpoint=customers/invoices&customer_id={id}
Get customer invoices.

**Response:**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "1",
      "number": "FV/001/2024",
      "date": "2024-01-01",
      "total": 9900,
      "currency": "PLN",
      "status": "completed",
      "download_url": "https://example.com/invoice.pdf"
    }
  ]
}
```

### Newsletter

#### POST /api/newsletter/subscribe
Subscribe to newsletter.

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "source": "website",
  "consent": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Zapisano do newslettera! Kod rabatowy 10% został wysłany na email.",
  "discountCode": "NEWSJOH1234"
}
```

### Email

#### POST /api/send-email
Send order confirmation email.

**Request Body:**
```json
{
  "type": "order_confirmation",
  "order_id": 1,
  "customer_email": "user@example.com",
  "customer_name": "John Doe",
  "order_number": "001",
  "total": "99.00",
  "items": [
    {
      "name": "Product Name",
      "quantity": 1,
      "price": "99.00"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `API_ERROR`: External API error
- `NETWORK_ERROR`: Network connection error
- `UNKNOWN_ERROR`: Unexpected error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Default**: 100 requests per 15 minutes per IP
- **Authentication**: 10 requests per minute per IP
- **Order creation**: 5 requests per minute per user

## Data Validation

### Required Fields

Most endpoints require specific fields. Missing required fields return `VALIDATION_ERROR`.

### Field Validation

- **Email**: Must be valid email format
- **Phone**: Must be valid Polish phone number
- **NIP**: Must be valid 10-digit NIP with checksum
- **Postcode**: Must be valid Polish postcode (XX-XXX)
- **Password**: Minimum 8 characters with uppercase, lowercase, and number

### Sanitization

All input data is sanitized to prevent XSS and injection attacks.

## Pagination

List endpoints support pagination:

- `page`: Page number (starts from 1)
- `per_page`: Items per page (max 100)
- Response includes `total` and `page` fields

## Caching

API responses are cached for performance:

- **Products**: 10 minutes
- **Categories**: 30 minutes
- **User data**: 15 minutes
- **Orders**: 5 minutes

Cache can be bypassed with `?no-cache=1` parameter.

## Webhooks

The system supports webhooks for real-time updates:

- **Order status changes**: `POST /api/webhooks/order-status`
- **Stock updates**: `POST /api/webhooks/stock-update`
- **New products**: `POST /api/webhooks/new-product`

## SDK Examples

### JavaScript/TypeScript

```typescript
import { WooCommerceAPI } from '@/utils/api-helpers';

const api = new WooCommerceAPI();

// Get products
const products = await api.getProducts({
  page: 1,
  per_page: 12,
  category: 1
});

// Create order
const order = await api.createOrder({
  payment_method: 'cod',
  billing: { /* billing data */ },
  line_items: [{ product_id: 1, quantity: 1 }]
});
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get products
curl "http://localhost:3001/api/woocommerce?endpoint=products&page=1&per_page=12"

# Create order
curl -X POST "http://localhost:3001/api/woocommerce?endpoint=orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt-token" \
  -d '{"payment_method":"cod","line_items":[{"product_id":1,"quantity":1}]}'
```

## Support

For API support and questions:

- **Email**: support@example.com
- **Documentation**: https://docs.example.com
- **Status Page**: https://status.example.com
