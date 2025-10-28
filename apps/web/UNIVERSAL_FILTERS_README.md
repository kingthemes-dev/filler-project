# 🚀 UNIVERSAL FILTER SYSTEM - SENIOR LEVEL

## **INSTANT LOADING FILTERS FOR ANY E-COMMERCE PROJECT**

Ten system zapewnia **natychmiastowe ładowanie filtrów** bez API calls przy każdym odświeżeniu, działając z **KAŻDYM** e-commerce API (WooCommerce, Shopify, custom API).

## ✨ **FEATURES**

- ✅ **INSTANT LOADING** - Zero loading time, wszystko prefetchowane
- ✅ **UNIVERSAL** - Działa z WooCommerce, Shopify, custom API
- ✅ **AUTO-DISCOVERY** - Automatycznie wykrywa strukturę API
- ✅ **SENIOR-LEVEL** - Skalowalne, konfigurowalne, maintainable
- ✅ **CACHE OPTIMIZED** - Inteligentny cache z fallback
- ✅ **ERROR HANDLING** - Graceful degradation
- ✅ **TYPESCRIPT** - Full type safety

## 🎯 **USAGE**

### **1. WooCommerce (Current Project)**
```typescript
import { prefetchWooCommerceFilters } from '@/lib/universal-prefetch';

// W sklep/page.tsx
await prefetchWooCommerceFilters(queryClient, {
  api: { baseUrl: 'https://your-store.com' }
});
```

### **2. Shopify**
```typescript
import { prefetchShopifyFilters } from '@/lib/universal-prefetch';

await prefetchShopifyFilters(queryClient, {
  api: { 
    baseUrl: 'https://your-shop.myshopify.com',
    headers: { 'X-Shopify-Access-Token': 'token' }
  }
});
```

### **3. Custom API**
```typescript
import { prefetchCustomFilters } from '@/lib/universal-prefetch';

await prefetchCustomFilters(queryClient, {
  api: {
    baseUrl: 'https://api.yourstore.com',
    endpoints: {
      categories: '/v1/categories',
      attributes: '/v1/attributes',
      products: '/v1/products'
    }
  }
});
```

### **4. Auto-Detection**
```typescript
import { prefetchAutoDetectedFilters } from '@/lib/universal-prefetch';

// Automatycznie wykrywa typ API i prefetchuje
await prefetchAutoDetectedFilters(queryClient, 'https://api.yourstore.com');
```

## 🔧 **COMPONENTS**

### **UniversalShopFilters**
```typescript
<UniversalShopFilters
  // ... standard props
  preset="woocommerce" // or "shopify" or "custom"
  filterConfig={{
    api: { baseUrl: 'https://your-api.com' },
    categories: { autoDiscover: true },
    attributes: { autoDiscover: true }
  }}
/>
```

### **UniversalCategoryFilters**
```typescript
<UniversalCategoryFilters
  onCategoryChange={handleCategoryChange}
  selectedCategories={selectedCategories}
  totalProducts={totalProducts}
  preset="woocommerce"
  config={filterConfig}
/>
```

### **UniversalAttributeFilters**
```typescript
<UniversalAttributeFilters
  onFilterChange={handleFilterChange}
  selectedFilters={filters}
  totalProducts={totalProducts}
  preset="woocommerce"
  config={filterConfig}
/>
```

## ⚙️ **CONFIGURATION**

### **FilterConfig Interface**
```typescript
interface FilterConfig {
  api: {
    baseUrl: string;
    endpoints: {
      categories: string;
      attributes: string;
      products: string;
    };
    headers?: Record<string, string>;
  };
  categories: {
    autoDiscover: boolean;
    customMapping?: Record<string, CategoryMapping>;
    excludeSlugs?: string[];
    includeSlugs?: string[];
  };
  attributes: {
    autoDiscover: boolean;
    excludeSlugs?: string[];
    includeSlugs?: string[];
    customNames?: Record<string, string>;
  };
  cache: {
    staleTime: number;
    gcTime: number;
  };
  ui: {
    showCounts: boolean;
    maxItemsPerFilter: number;
    expandByDefault: boolean;
  };
}
```

### **Preset Configurations**
```typescript
// WooCommerce
const woocommerceConfig = getFilterConfig('woocommerce', {
  api: { baseUrl: 'https://your-store.com' }
});

// Shopify
const shopifyConfig = getFilterConfig('shopify', {
  api: { baseUrl: 'https://your-shop.myshopify.com' }
});

// Custom
const customConfig = getFilterConfig('custom', {
  api: { baseUrl: 'https://api.yourstore.com' }
});
```

## 🚀 **PERFORMANCE**

### **Prefetching Strategy**
1. **Build Time** - Wszystkie dane prefetchowane
2. **Hydration** - Dane już w pamięci
3. **Runtime** - Zero API calls, instant loading

### **Cache Strategy**
- **React Query Cache** - 10 minut stale time
- **Service Cache** - Dodatkowy cache w pamięci
- **Fallback Cache** - Używa cache nawet jeśli stale

### **Error Handling**
- **Graceful Degradation** - Fallback do cached data
- **Retry Logic** - Automatyczne ponowne próby
- **Timeout Protection** - Zabezpieczenie przed hanging requests

## 📁 **FILE STRUCTURE**

```
src/
├── config/
│   └── filter-config.ts          # Universal configuration
├── services/
│   └── universal-filter-service.ts # Universal service
├── components/ui/
│   ├── universal-shop-filters.tsx    # Main filter component
│   ├── universal-category-filters.tsx # Category filters
│   └── universal-attribute-filters.tsx # Attribute filters
├── lib/
│   └── universal-prefetch.ts     # Prefetching utilities
└── examples/
    └── universal-filter-examples.ts # Usage examples
```

## 🎯 **MIGRATION FROM CURRENT SYSTEM**

### **Step 1: Update sklep/page.tsx**
```typescript
// OLD
await qc.prefetchQuery({ queryKey: ['shop','categories'], ... });

// NEW
await prefetchWooCommerceFilters(qc, { api: { baseUrl: baseUrl } });
```

### **Step 2: Update Components**
```typescript
// OLD
<ShopFilters categories={categories} ... />

// NEW
<UniversalShopFilters 
  categories={categories} 
  preset="woocommerce"
  filterConfig={filterConfig}
  ...
/>
```

### **Step 3: Update Services**
```typescript
// OLD
const { dynamicCategoriesService } = await import('@/services/dynamic-categories');

// NEW
const { universalFilterService } = await import('@/services/universal-filter-service');
```

## 🔥 **SENIOR-LEVEL FEATURES**

### **1. Auto-Discovery**
- Automatycznie wykrywa strukturę API
- Mapuje różne formaty danych
- Obsługuje różne endpointy

### **2. Universal Configuration**
- Jeden config dla wszystkich platform
- Preset configurations
- Environment-based configs

### **3. Error Resilience**
- Multiple fallback strategies
- Graceful degradation
- Comprehensive error handling

### **4. Performance Optimization**
- Intelligent caching
- Parallel prefetching
- Memory optimization

### **5. Developer Experience**
- Full TypeScript support
- Comprehensive examples
- Easy migration path

## 🎉 **RESULT**

**INSTANT FILTERS FOR ANY PROJECT!**

- ✅ Pierwsza wizyta = instant filtry
- ✅ Każda kolejna = instant filtry  
- ✅ Zero kurwa loadingu!
- ✅ Działa z każdym API
- ✅ Senior-level architecture

**JEBANY SENIOR LEVEL!** 🔥🚀
