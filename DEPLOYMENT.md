# 🚀 DEPLOYMENT GUIDE - VERCEL

## 📋 Wymagane zmienne środowiskowe

### ⚠️ KRITYCZNE: Przed pierwszym deployem

Dodaj poniższe zmienne do Vercel Dashboard:

**Panel:** `Settings → Environment Variables`

### 🌐 Publiczne zmienne (NEXT_PUBLIC_*)

```env
NEXT_PUBLIC_WORDPRESS_URL=https://qvwltjhdjw.cfolks.pl
NEXT_PUBLIC_BASE_URL=https://www.filler.pl
NEXT_PUBLIC_WC_URL=https://qvwltjhdjw.cfolks.pl/wp-json/wc/v3
NEXT_PUBLIC_GA4_ID=G-8XT32JP3V7
NEXT_PUBLIC_GTM_ID=GTM-TJSTQLNM
```

### 🔐 Serwerowe zmienne (BEZ prefiksu NEXT_PUBLIC_)

```env
WC_CONSUMER_KEY=your_consumer_key
WC_CONSUMER_SECRET=your_consumer_secret
ADMIN_CACHE_TOKEN=your_token
```

## 📝 Kroki deployment

1. **Skonfiguruj zmienne środowiskowe** (Vercel Dashboard)
2. **Deploy automatyczny** (push do `main`)
3. **Sprawdź logi** w Vercel Dashboard

## ✅ Weryfikacja po deploy

- [ ] Strona ładuje się bez błędów 503
- [ ] API WooCommerce działa (test: `/sklep`)
- [ ] Analytics działa (sprawdź GA4)
- [ ] Brak błędów w konsoli

## 🔧 Troubleshooting

### Błąd: "Missing required environment variables"
→ Dodaj zmienne w Vercel Dashboard

### Błąd: "503 Service Unavailable"
→ Sprawdź czy `NEXT_PUBLIC_WORDPRESS_URL` jest poprawny

### Błąd: "Failed to load resource"
→ Sprawdź logi build w Vercel
