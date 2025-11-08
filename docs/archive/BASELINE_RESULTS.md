# Baseline Performance Results

**Data**: 2025-11-06  
**Środowisko**: Local development (localhost:3000)  
**Narzędzia**: autocannon v7.15.0, k6 v1.3.0

---

## Autocannon Results

### Konfiguracja
- Duration: 5s (quick test) / 10s (full test)
- Connections: 3-5
- Pipelining: 1
- Base URL: http://localhost:3000

### Wyniki Warm Tests

| Endpoint | p95 (ms) | p99 (ms) | RPS | Status | Uwagi |
|----------|----------|----------|-----|--------|-------|
| `/api/home-feed` | 1097 ❌ | 1097 ❌ | 10.8 | FAIL | Za wolno (expected p95<300ms) |
| `/api/woocommerce?endpoint=products&per_page=24&page=1` | 372 ✅ | 379 ✅ | 11.4 | PASS | OK |
| `/api/woocommerce?endpoint=products/123` | 391 ✅ | 392 ✅ | 15.6 | PASS | OK |
| `/api/woocommerce?endpoint=orders&customer=1&per_page=20` | 263 ✅ | 264 ✅ | 7.5 | PASS | OK |

**Summary:**
- Avg p95: 530.75ms
- Avg p99: 533.00ms
- Avg RPS: 11.33
- Pass rate: 3/4 (75%)

### Problemy zidentyfikowane

1. **`/api/home-feed`** - p95=1097ms (3.6x wolniejszy niż expected 300ms)
   - Przyczyna: Prawdopodobnie wiele requestów do WordPress API (paginacja)
   - Działanie: Optymalizacja batch queries, caching

---

## k6 Results

### Konfiguracja
- Duration: 10s
- VUs: 5
- Endpoints: Random selection z listy

### Wyniki

| Metryka | Wartość | Threshold | Status |
|---------|---------|-----------|--------|
| p95 latency | 903ms | < 600ms | ❌ FAIL |
| p99 latency | 919ms | < 1000ms | ✅ PASS |
| Error rate | 42.10% | < 1% | ❌ FAIL |
| RPS | ~3.06/s | - | - |
| Checks passed | 88.57% (124/140) | 100% | ⚠️ WARNING |

### Problemy zidentyfikowane

1. **Error rate 42.10%** - Krytyczny problem
   - Przyczyna: Prawdopodobnie rate limiting (429 responses)
   - Działanie: Sprawdzić rate limiting config, zwiększyć limity dla testów

2. **p95 latency 903ms** - Za wolno
   - Przyczyna: Może być związane z error rate (retry logic)
   - Działanie: Naprawić error rate, potem ponownie zmierzyć

3. **Checks failed 11.42%** - Niektóre requesty nie przechodzą walidacji
   - Przyczyna: Rate limiting, błędy 429
   - Działanie: Naprawić rate limiting

---

## Rekomendacje

### Priorytet P0 (Krytyczne)

1. ✅ **Naprawić rate limiting dla testów performance** - DONE
   - ✅ Dodano exemption dla localhost w dev mode
   - ✅ Dodano exemption dla performance test user agents (autocannon, k6)
   - ✅ Dodano header `X-Performance-Test: true` w skryptach testowych

2. 🔄 **Zoptymalizować `/api/home-feed`** - IN PROGRESS
   - ✅ Zmieniono sekwencyjne requesty na równoległe (Promise.all)
   - ✅ Ograniczono liczbę requestów (1-2 strony zamiast 5)
   - ⏳ Wymaga testów po restarcie serwera
   - ⏳ Możliwe dalsze optymalizacje: batch endpoint, lepsze cache

### Priorytet P1 (Wysokie)

3. **Analiza error rate w k6**
   - Sprawdzić które endpointy zwracają błędy
   - Dodać retry logic gdzie potrzebne
   - Poprawić error handling

4. **Monitoring i alerting**
   - Dodać metryki p95/p99 do Sentry
   - Ustawić alerty dla przekroczeń threshold

---

## Następne kroki

1. ✅ Baseline tests completed
2. ⏳ Naprawić rate limiting
3. ⏳ Zoptymalizować `/api/home-feed`
4. ⏳ Ponownie uruchomić testy po optymalizacjach
5. ⏳ Ustawić CI/CD thresholds

---

## Pliki wyników

- `apps/web/performance-results-autocannon.json` - Pełne wyniki autocannon
- `performance-results-k6.json` - Pełne wyniki k6

---

## Uwagi

- Testy były uruchomione na lokalnym środowisku development
- Wyniki mogą się różnić w produkcji (cache, CDN, etc.)
- Rate limiting może wpływać na wyniki - wymaga naprawy przed kolejnymi testami

