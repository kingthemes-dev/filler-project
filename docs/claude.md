# Headless WooCommerce E-commerce Platform

## 🎯 **PROJECT RULES & GUIDELINES**

**⚠️ IMPORTANT:** This project follows strict development rules defined in `.cursor/rules/king.mdc` - **ALWAYS READ AND FOLLOW THESE RULES!**

**🚨 CRITICAL GIT WORKFLOW RULE:**
```bash
# MANDATORY: Po każdej udanej implementacji funkcji/feature
1. git add .
2. git commit -m "✨ [Feature Name] - Brief description"
3. git push origin main

# NIGDY nie rób wielu zmian bez commit!
# ZAWSZE commit po każdej funkcji/komponencie/bugu!
```

## 🏗️ Architecture Overview

**Expert Level (9.6/10)** headless WooCommerce e-commerce platform built with Next.js 15, designed for beauty/cosmetics industry with Polish market focus.

### 📁 Project Structure

```
headless-woo/
├── apps/
│   ├── web/                    # Next.js 15 web application
│   └── mobile/                 # React Native mobile app
├── packages/
│   ├── shared/                 # Shared utilities & types
│   ├── shared-types/           # TypeScript schemas
│   └── ai/                     # AI generators
├── wp-content/
│   └── mu-plugins/             # WordPress custom plugins
└── docs/                       # Documentation
```

## 🛠️ Technology Stack

### Core Framework
- **Next.js 15** with App Router
- **TypeScript** (strict mode)
- **React 19** with Server Components
- **Tailwind CSS 4** + **shadcn/ui**

### State Management
- **Zustand** - Client state management
- **TanStack Query** - Server state & caching
- **React Context** - Auth & theme providers

### Performance & Caching
- **Redis** with connection pooling
- **ISR** (Incremental Static Regeneration)
- **Edge Functions** for global performance
- **Request Deduplication**
- **Circuit Breaker** patterns

### Analytics & Monitoring
- **Sentry** - Error tracking & monitoring
- **Custom Analytics** - Edge-based tracking
- **Google Analytics** - User behavior tracking

### Infrastructure
- **Docker** + **Docker Compose**
- **Nginx** reverse proxy
- **Health Check** endpoints
- **Security Middleware** with rate limiting

### Testing
- **Jest** - Unit & component tests
- **Playwright** - E2E testing
- **Testing Library** - React testing utilities

## 🎨 Design System

### Visual Identity
- **Monochromatic** design (black/white only)
- **Mobile-first** approach (375px → desktop)
- **Beauty industry** aesthetic
- **Polish market** (PLN currency, Polish language)

### Component Architecture
```typescript
// King-prefixed components (custom)
- KingProductCard
- KingProductGrid
- KingProductTabs
- KingHeroRounded

// UI Components (shadcn/ui based)
- Button, Card, Input, Select
- Modal, Drawer, Toast
- Badge, Label, Textarea
```

### Styling Conventions
- **Tailwind CSS** utility classes
- **CSS Variables** for theming
- **Framer Motion** for animations (lazy loaded)
- **Responsive breakpoints**: sm → md → lg → xl

## 🔌 API Architecture

### WooCommerce Integration
```typescript
// Primary API endpoints
/api/woocommerce          # Main WooCommerce proxy
/api/home-feed           # Homepage product feeds
/api/health             # System health checks

// Edge Functions
/api/edge/analytics     # Real-time analytics
/api/edge/geolocation   # User location detection
```

### Data Flow
1. **WordPress** → **King Shop API** → **Next.js API Routes**
2. **Redis Cache** → **Circuit Breaker** → **Response**
3. **ISR** for static pages, **SSR** for dynamic content

### Caching Strategy
```typescript
// Cache keys pattern (functions)
const cacheKeys = {
  products: (page: number, perPage: number, filters?: any) => 
    `products:${page}:${perPage}:${JSON.stringify(filters || {})}`,
  categories: () => 'categories:all',
  search: (query: string, filters?: any) => 
    `search:${query}:${JSON.stringify(filters || {})}`,
  homeFeed: () => 'home:feed',
  user: (id: string) => `user:${id}`,
  cart: (userId: string) => `cart:${userId}`
};

// ISR revalidation
export const revalidate = 300; // 5 minutes (homepage, sklep)
export const revalidate = 600; // 10 minutes (produkt/[slug])
```

## 🧩 Component Schema

### Core Components
```typescript
// Product Components
<ProductCard 
  product={Product}
  variant="default" | "compact" | "featured"
  showQuickView={boolean}
/>

<ProductGrid
  products={Product[]}
  loading={boolean}
  pagination={PaginationConfig}
/>

// Layout Components
<Header 
  isShopOpen={boolean}
  onShopToggle={function}
/>

<ShopExplorePanel
  open={boolean}
  onClose={function}
/>

// Auth Components
<AuthModalManager />
<LoginModal />
<RegisterModal />
<ForgotPasswordModal />
```

### State Management
```typescript
// Zustand Stores
interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
  itemCount: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

interface FavoritesState {
  items: Product[];
  addFavorite: (product: Product) => void;
  removeFavorite: (id: number) => void;
  syncWithServer: () => Promise<void>;
  isOpen: boolean;
  toggleFavorites: () => void;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
}
```

## 🔧 Development Patterns

### Code Conventions
```typescript
// File naming
- kebab-case for files: product-card.tsx
- PascalCase for components: ProductCard
- camelCase for functions: fetchProducts

// Import order
1. React & Next.js
2. Third-party libraries
3. Internal components
4. Types & utilities
5. Styles
```

### Git Workflow - CRITICAL RULE
```bash
# MANDATORY: Po każdej udanej implementacji funkcji/feature
1. git add .
2. git commit -m "✨ [Feature Name] - Brief description"
3. git push origin main

# NIGDY nie rób wielu zmian bez commit!
# ZAWSZE commit po każdej funkcji/komponencie/bugu!
# To zapewnia śledzenie zmian i możliwość rollback!
```

### Development Workflow
```typescript
// 1. Implement feature
// 2. Test locally
// 3. Git commit (MANDATORY!)
// 4. Push to remote
// 5. Deploy to Vercel

// Example commit messages:
"✨ Add product search functionality"
"🔧 Fix cart calculation bug"
"🎨 Update mobile responsive design"
"⚡ Optimize API response caching"
```

### Error Handling
```typescript
// Circuit Breaker pattern
const result = await circuitBreakers.wordpress.execute(
  () => fetchWordPressData()
);

// Error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component />
</ErrorBoundary>
```

### Performance Optimizations
```typescript
// Request deduplication
const data = await requestDeduplicator.deduplicate(
  'products:page:1',
  () => fetchProducts(1)
);

// Lazy loading
const LazyComponent = dynamic(
  () => import('./HeavyComponent'),
  { loading: () => <Skeleton /> }
);
```

## 🚀 Deployment & Infrastructure

### Docker Configuration
```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
FROM node:18-alpine AS runner

# Production optimizations
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
```

### Environment Variables
```bash
# Required
NEXT_PUBLIC_WC_URL=https://domain.com/wp-json/wc/v3
WC_CONSUMER_KEY=ck_...
WC_CONSUMER_SECRET=cs_...

# Optional
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://...
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Health Monitoring
```typescript
// Health check endpoint
GET /api/health
{
  "status": "ok",
  "redis": { "connected": true },
  "wordpressApi": { "state": "CLOSED" },
  "uptime": 12345
}
```

## 📱 Mobile-First Features

### Responsive Design
- **375px** base width (mobile)
- **Touch-friendly** buttons (min 44px)
- **Swipe gestures** for product carousels
- **Mobile-optimized** modals & forms

### Performance Targets
- **LCP** < 2.5s
- **FID** < 100ms
- **CLS** < 0.1
- **Bundle size** < 200KB (First Load JS)

## 🧪 Testing Strategy

### Test Coverage
```typescript
// Unit Tests (Jest)
- Component rendering
- Utility functions
- State management
- API helpers

// E2E Tests (Playwright)
- User journeys
- Checkout flow
- Search functionality
- Mobile interactions
```

### Quality Gates
- **TypeScript** strict mode
- **ESLint** + **Prettier**
- **Test coverage** > 80%
- **Lighthouse** score > 90

## 🔐 Security & Compliance

### Security Headers
```typescript
// Middleware security
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Rate limiting (100 req/min)
```

### Data Protection
- **GDPR** compliant
- **Cookie consent** management
- **Secure API** endpoints
- **Input validation** & sanitization

## 📊 Monitoring & Analytics

### Error Tracking
- **Sentry** integration
- **Custom error** boundaries
- **Performance** monitoring
- **User feedback** collection

### Business Metrics
- **Conversion** tracking
- **Product** performance
- **User behavior** analytics
- **A/B testing** framework

---

**Expert Level: 9.6/10** - Production-ready headless e-commerce platform with enterprise-grade architecture, performance optimizations, and comprehensive monitoring.
