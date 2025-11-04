# SECURITY – Moduł Konto (Headless Woo)

## Założenia bieżące (etap light)
- Token w localStorage (decyzja 1-b tymczasowo)
- Brak Redis (decyzja 2-b), rate-limit oparty o in-memory/cache util
- Middleware aktywny: security, csrf, admin-auth

## Ryzyka i mitigacje
- XSS -> localStorage token: minimalizacja logów, Content Security Policy, unikanie `dangerouslySetInnerHTML`, walidacja wejścia
- Logi -> wycieki: włączać szczegółowe logi tylko przy `NEXT_PUBLIC_DEBUG=true`; maskować sekrety w URL
- API -> PII: nie logować payloadów z danymi wrażliwymi; sanityzacja danych PDF; 401/403/429 z bezpiecznymi komunikatami

## Polityki
- Nagłówki
  - Cache-Control: krótkie TTL dla danych dynamicznych, SWR gdzie sensowne
  - CSP: bez inline eval, ograniczone źródła
  - Cookies: w tym etapie brak HttpOnly (future); SameSite=Lax dla istniejących cookies
- Robots/SEO
  - Noindex na `/moje-konto`, `/moje-zamowienia`, `/moje-faktury`, `/lista-zyczen`

## Plan hardening (później)
- Migracja do HttpOnly cookies + refresh/rotation (JWT/PASETO)
- Rotacja kluczy, skrócone TTL tokenów, device binding (opcjonalnie)
- Redis: rate limit, cache API, circuit breaker state

