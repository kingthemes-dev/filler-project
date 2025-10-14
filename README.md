# KING™ Headless Woo AI Autoinstaller - ENTERPRISE EDITION (ver. 2.0)

Jedyny autoinstalator WordPress Headless + AI, który w 1 godzinę stawia gotowy sklep, blog lub stronę firmową – z pełnym frontem Next.js, generacją AI contentu, SEO i integracjami.

**"Headless WooCommerce + AI Front = Shopify Experience w ekosystemie WordPress."**

## 📋 Master Brief

Zobacz pełny brief: [KING_Headless_Enterprise.md](./KING_Headless_Enterprise.md)

## 🏗️ Struktura Monorepo

```
/apps/
├── wp-plugin/          # WordPress Plugin: King Installer (PHP + React wp.element)
├── builder/            # Node/Fastify + Redis Queue (endpoints: /jobs, /build, /status)
├── front/              # Next.js 14 App Router + Shadcn UI + ISR
├── web/               # Obecna aplikacja web (zachowana)
└── mobile/            # Obecna aplikacja mobile (zachowana)

/packages/
├── ai/                # AI JSON generators (tokens, content, catalog, seo, images, newsletter)
└── shared-types/      # Zod schemas + TS types dla wszystkich JSONs

/shared/               # Obecne shared packages (zachowane)
```

## 🚀 Szybki start

### Instalacja zależności
```bash
pnpm install
```

### Uruchomienie aplikacji
```bash
# WordPress Plugin
pnpm --filter wp-plugin dev

# Builder API
pnpm --filter builder dev

# Front Next.js
pnpm --filter front dev

# Obecna aplikacja web
pnpm --filter web dev

# Obecna aplikacja mobile
pnpm --filter mobile dev
```

### Testy E2E
```bash
# Testy Playwright dla wizard→build→preview
pnpm test:e2e
```

## 🔧 Konfiguracja

Skopiuj szablony środowiskowe:
```bash
cp .env.example .env
cp apps/wp-plugin/.env.example apps/wp-plugin/.env
cp apps/builder/.env.example apps/builder/.env
cp apps/front/.env.example apps/front/.env
```

## 📊 Performance & SEO

- JS ≤ 180kB
- Lighthouse mobile ≥ 95
- LCP < 2s mobile
- CLS < 0.01
- ISR Everywhere

## 🛡️ Bezpieczeństwo

- JWT, ECDSA
- GDPR compliance
- Rate limiting
- Maskowanie sekretów w logach

## 📈 Integracje

- **Brevo**: Newsletter, webhooks, kupony
- **Stripe**: Płatności
- **GA4**: Analytics
- **Algolia**: Wyszukiwanie
- **reCAPTCHA**: Bezpieczeństwo

## 📝 Licencja

Enterprise Edition - pełna dokumentacja w [KING_Headless_Enterprise.md](./KING_Headless_Enterprise.md)