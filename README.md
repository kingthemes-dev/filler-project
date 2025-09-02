# 🛍️ King WooCommerce Store

Nowoczesny, headless sklep e-commerce oparty na Next.js 14, TypeScript, Tailwind CSS i WooCommerce Store API.

## ✨ Funkcje

- **🚀 Next.js 14** z App Router
- **⚡ TypeScript** - pełne typowanie
- **🎨 Tailwind CSS** - monochromatyczny design
- **🔧 shadcn/ui** - gotowe komponenty
- **🛒 WooCommerce Store API** - prawdziwe dane
- **📱 Mobile-first** - responsywny design
- **⚙️ Zero hardcoded** - wszystko z konfiguracji
- **🔐 Autoryzacja** - NextAuth.js
- **📊 Analytics** - Google Analytics + GTM
- **🔄 PWA** - Progressive Web App

## 🚀 Szybki start

### 1. Instalacja zależności

```bash
npm install
```

### 2. Konfiguracja środowiska

Skopiuj plik `.env.example` do `.env.local` i uzupełnij dane:

```bash
cp .env.example .env.local
```

**Wymagane zmienne:**
- `NEXT_PUBLIC_WC_API_URL` - URL WooCommerce REST API
- `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY` - Klucz konsumenta
- `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET` - Sekret konsumenta

### 3. Uruchomienie serwera deweloperskiego

```bash
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000) w przeglądarce.

## 🏗️ Struktura projektu

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Globalne style
│   ├── layout.tsx         # Główny layout
│   └── page.tsx           # Strona główna
├── components/             # Komponenty React
│   ├── ui/                # shadcn/ui komponenty
│   ├── king-product-card.tsx      # Karta produktu
│   ├── king-product-grid.tsx      # Siatka produktów
│   └── king-category-grid.tsx     # Siatka kategorii
├── config/                 # Konfiguracja
│   └── constants.ts       # Stałe aplikacji
├── services/               # Serwisy API
│   └── woocommerce.ts     # WooCommerce API
├── types/                  # Typy TypeScript
│   └── woocommerce.ts     # Typy WooCommerce
└── lib/                    # Biblioteki pomocnicze
    └── utils.ts           # Funkcje pomocnicze
```

## 🎨 Design System

### Kolory
- **Primary**: Czarny (#000000)
- **Secondary**: Szary (#666666)
- **Background**: Biały (#FFFFFF)
- **Muted**: Jasny szary (#F5F5F5)
- **Border**: Bardzo jasny szary (#E5E5E5)

### Typografia
- **Font**: Geist Sans (system font)
- **Hierarchy**: 6 poziomów nagłówków
- **Responsive**: Mobile-first approach

### Komponenty
- **Cards**: Produkty, kategorie, informacje
- **Buttons**: Primary, secondary, outline
- **Forms**: Input, select, textarea
- **Navigation**: Breadcrumbs, pagination
- **Feedback**: Loading, error, empty states

## 🔌 WooCommerce Integration

### Store API Endpoints

```typescript
// Produkty
GET /wp-json/wc/v3/products
GET /wp-json/wc/v3/products/{id}
GET /wp-json/wc/v3/products?category={id}

// Kategorie
GET /wp-json/wc/v3/products/categories
GET /wp-json/wc/v3/products/categories/{id}

// Zamówienia
GET /wp-json/wc/v3/orders
POST /wp-json/wc/v3/orders

// Klienci
GET /wp-json/wc/v3/customers
POST /wp-json/wc/v3/customers
```

### Autoryzacja

```typescript
// Basic Auth
const credentials = btoa(`${consumerKey}:${consumerSecret}`);
const headers = {
  'Authorization': `Basic ${credentials}`,
  'Content-Type': 'application/json',
};
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 375px (base)
- **Tablet**: 768px (md:)
- **Desktop**: 1024px (lg:)
- **Large**: 1280px (xl:)
- **2XL**: 1536px (2xl:)

### Grid System
```typescript
const gridColsClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6'
};
```

## 🧩 Komponenty

### KingProductCard
```typescript
<KingProductCard
  product={product}
  variant="featured" // default | compact | featured
  showActions={true}
/>
```

### KingProductGrid
```typescript
<KingProductGrid
  categoryId={1}
  featured={true}
  onSale={false}
  searchTerm=""
  variant="featured"
  gridCols={4}
  showFilters={true}
  showPagination={true}
/>
```

### KingCategoryGrid
```typescript
<KingCategoryGrid
  parentId={1}
  showEmpty={false}
  limit={8}
  variant="featured" // default | compact | featured
  gridCols={4}
/>
```

## 🔧 Konfiguracja

### Tailwind CSS
```typescript
// tailwind.config.ts
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
      },
    },
  },
  plugins: [],
};
```

### shadcn/ui
```typescript
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## 🚀 Deployment

### Vercel (zalecane)
```bash
npm run build
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Dokumentacja

### API Reference
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [Next.js 14](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### Tutorials
- [Headless WooCommerce](https://woocommerce.com/document/woocommerce-rest-api/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 🆘 Support

- **Email**: support@kingthemes.com
- **Documentation**: [docs.kingthemes.com](https://docs.kingthemes.com)
- **Issues**: [GitHub Issues](https://github.com/kingthemes/headless-woo/issues)

---

**Made with ❤️ by King Themes**
