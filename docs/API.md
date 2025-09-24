# API Documentation

## Overview

This document describes the API endpoints and data structures used in the Headless WooCommerce application.

## Base URLs

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com`

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
