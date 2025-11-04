# PERF – Moduł Konto (Headless Woo)

## Obszary optymalizacji
- API proxy `/api/woocommerce`: spójne Cache-Control, _fields, retry/backoff, dedup
- UI: skeletony/empty states, lazy-loading cięższych elementów
- Obrazy: Next/Image z odpowiednimi rozmiarami i formatami (avif/webp)

## Cache i nagłówki
- Publiczne dane (kategorie/atrybuty): `public, max-age=300, s-maxage=600, swr=900`
- Dane per-user (zamówienia, invoices): `private, max-age=120`
- Sklep (king-shop): `public, max-age=60, s-maxage=180, swr=300`

## Payload
- `_fields` w zapytaniach WooCommerce gdzie to możliwe
- PDF: limit czasu generowania i rozmiaru; preferencja otwarcia w nowej karcie (bez długiego trzymania base64)

## Metryki
- Sentry metrics dla cache hit/miss i czasów odpowiedzi
- Lighthouse mobile ≥95 (po wdrożeniu)

