# Audyt integracji Brevo + Newsletter

**Data audytu**: 2024  
**Status**: ✅ Kompletny  
**Data implementacji poprawek**: 2024  
**Status implementacji**: ✅ Zakończona

## Podsumowanie

Integracja Brevo (Sendinblue) z systemem newslettera jest w większości poprawnie zaimplementowana. Podstawowe funkcje działają, ale zidentyfikowano kilka obszarów wymagających uzupełnienia dla pełnej funkcjonalności i zgodności ze schematami.

## ✅ Zaimplementowane funkcje

### 1. Konfiguracja środowiskowa
- ✅ Zmienne `SENDINBLUE_API_KEY` i `SENDINBLUE_LIST_ID` poprawnie zdefiniowane w:
  - `apps/web/src/config/env.ts`
  - `packages/shared/constants/env.ts`
- ✅ Feature flag `features.newsletter` ustawiony na `!!env.SENDINBLUE_API_KEY`
- ✅ Zmienne są opcjonalne (nie blokują działania aplikacji)

### 2. Integracja API Brevo
- ✅ Klasa `SendinBlueAPI` w `apps/web/src/utils/api-helpers.ts` z metodami:
  - `checkContactExists(email)` - sprawdzanie czy kontakt istnieje (GET /v3/contacts/{email})
  - `addContact(data)` - dodawanie kontaktu do listy (POST /v3/contacts)
- ✅ Poprawne użycie endpointów Brevo API v3
- ✅ Mapowanie atrybutów:
  - `FIRSTNAME`, `LASTNAME` - dane kontaktowe
  - `SOURCE` - źródło subskrypcji (homepage, registration, etc.)
  - `CONSENT` - zgoda marketingowa (yes/no)
  - `DISCOUNT_CODE` - kod rabatowy
  - `DISCOUNT_VALUE` - wartość rabatu (10%)
- ✅ Obsługa błędów z logowaniem

### 3. Endpoint subskrypcji
- ✅ `POST /api/newsletter/subscribe` w `apps/web/src/app/api/newsletter/subscribe/route.ts`
- ✅ Security: rate limiting (10 req/5min), CSRF protection, security headers
- ✅ Walidacja: Zod schema `newsletterSubscribeSchema`
- ✅ Idempotencja: sprawdzanie duplikatów przed dodaniem
- ✅ Generowanie kodów rabatowych WooCommerce
- ✅ Integracja z WordPress MU plugin do wysyłki emaili

### 4. Formularz UI
- ✅ Komponent `NewsletterForm` w `apps/web/src/components/ui/newsletter-form.tsx`
- ✅ Walidacja emaila i zgody
- ✅ reCAPTCHA verification (opcjonalna)
- ✅ Obsługa błędów z komunikatami po polsku
- ✅ Obsługa statusu 409 (Conflict) dla duplikatów

### 5. Integracja z innymi funkcjami
- ✅ Automatyczna subskrypcja przy rejestracji z zgodą marketingową (`auth-store.ts`)
- ✅ Integracja z checkout (`checkout/page.tsx`)
- ✅ Wysyłka emaili powitalnych z kodem rabatowym

## ✅ Zaimplementowane funkcje (po audycie)

### 1. Webhook handler dla Brevo
**Status**: ✅ Zaimplementowane

**Implementacja**: 
- Utworzono endpoint `POST /api/webhooks/brevo` w `apps/web/src/app/api/webhooks/brevo/route.ts`
- Obsługuje wszystkie eventy z Brevo: subscribe, unsubscribe, update, complaint, bounce
- Walidacja payloadu przez `BrevoWebhookSchema`
- Obsługa pojedynczych eventów i tablic eventów
- Weryfikacja podpisu webhooka (opcjonalna, przygotowana do konfiguracji)
- Logowanie wszystkich eventów
- GET endpoint dla health check

**Użycie**:
- Skonfiguruj webhook w panelu Brevo na URL: `https://your-domain.com/api/webhooks/brevo`
- Endpoint automatycznie przetwarza eventy i loguje je
- TODO: Dodać synchronizację z lokalną bazą danych (jeśli potrzebna)

### 2. Double Opt-In
**Status**: Schemat zawiera pole, ale nie jest używane

**Problem**:
- `NewsletterSubscriptionSchema` zawiera pole `doubleOptIn: z.boolean()`
- `NewsletterSchema.settings` zawiera `doubleOptIn: z.boolean()`
- Implementacja nie obsługuje double opt-in flow

**Rekomendacja**:
- Dodać opcjonalną konfigurację double opt-in w zmiennych środowiskowych
- Zaimplementować flow:
  1. Wysyłka emaila weryfikacyjnego po subskrypcji
  2. Endpoint do potwierdzenia subskrypcji (`/api/newsletter/confirm?token=...`)
  3. Aktualizacja statusu w Brevo po potwierdzeniu

### 3. Metody zarządzania kontaktami
**Status**: ✅ Zaimplementowane

**Implementacja**:
- Dodano metodę `updateContact(email, attributes)` - aktualizacja atrybutów kontaktu w Brevo
- Dodano metodę `removeContact(email)` - całkowite usunięcie kontaktu z Brevo
- Dodano metodę `unsubscribeContact(email)` - wypisanie z listy newslettera (zachowuje kontakt)
- Wszystkie metody mają pełną obsługę błędów i logowanie
- Metody używają poprawnego API Brevo v3

### 4. Użycie pełnych schematów
**Status**: Schematy są zdefiniowane, ale nie używane

**Problem**:
- `NewsletterSchema` i `NewsletterSubscriptionSchema` są zdefiniowane w `packages/shared-types/src/schemas/newsletter.ts`
- Endpoint używa prostszego `newsletterSubscribeSchema` z `apps/web/src/lib/schemas/newsletter.ts`
- Brak użycia pełnych schematów w implementacji

**Rekomendacja**:
- Rozważyć użycie pełnych schematów lub uproszczenie schematów w `shared-types`
- Zapewnić spójność między schematami walidacji a typami

## ⚠️ Potencjalne problemy

### 1. Duplikacja kodu
**Status**: ✅ Naprawione

**Zmiany**:
- Endpoint `/api/newsletter/subscribe` został zrefaktoryzowany
- Teraz używa metody `addContact()` z klasy `SendinBlueAPI` zamiast bezpośredniego `fetch`
- Usunięto duplikację kodu
- Ułatwione utrzymanie i spójność

### 2. Obsługa błędów
**Status**: ✅ Ulepszone

**Zmiany**:
- Metoda `checkContactExists()` teraz zwraca obiekt z flagą `error` i `errorMessage`
- Rozróżnienie między "kontakt nie istnieje" (404) a "błąd API" (inne statusy)
- Lepsze logowanie błędów z kontekstem
- TODO: Rozważyć dodanie retry logic z exponential backoff dla błędów sieciowych

### 3. Brak walidacji listId
- `SENDINBLUE_LIST_ID` jest parsowane jako `parseInt()`, ale nie ma walidacji czy lista istnieje w Brevo

**Rekomendacja**: Dodać walidację przy starcie aplikacji lub w health check

## 📋 Zgodność ze schematami

### NewsletterSchema
- ❌ `settings.webhookUrl` - nie używane
- ❌ `settings.doubleOptIn` - nie implementowane
- ❌ `settings.retryPolicy` - nie używane
- ❌ `templates.*` - nie używane (szablony są hardcoded w kodzie)
- ❌ `coupon.*` - częściowo (generowanie kuponów działa, ale konfiguracja jest hardcoded)
- ❌ `gdpr.*` - częściowo (zgoda jest obsługiwana, ale brak pełnej konfiguracji GDPR)
- ❌ `forms.*` - nie używane (formularz jest hardcoded)
- ❌ `campaigns.*` - nie używane
- ❌ `analytics.*` - nie używane
- ❌ `webhooks.*` - nie używane

### NewsletterSubscriptionSchema
- ✅ `email` - używane
- ✅ `firstName`, `lastName` - używane (jako `name` w prostszym schemacie)
- ❌ `listId` - nie używane (pobierane z env)
- ✅ `attributes` - częściowo (tylko podstawowe atrybuty)
- ❌ `doubleOptIn` - nie używane
- ❌ `consent` - częściowo (tylko `marketing`, brak `privacy`, `timestamp`, `ip`, `userAgent`)
- ❌ `language` - nie używane (hardcoded jako 'pl')
- ✅ `source` - używane

### BrevoWebhookSchema
- ❌ Całkowicie nie używany - brak endpointu webhook

## 📚 Dokumentacja

### Obecna dokumentacja
- ✅ `docs/KING_Headless_Enterprise.md` - podstawowa dokumentacja newslettera
- ✅ `docs/API.md` - endpoint `/api/newsletter/subscribe` jest udokumentowany
- ✅ `docs/SECURITY_OVERVIEW.md` - informacje o zmiennych środowiskowych

### Brakujące informacje
- ❌ Dokumentacja webhooków Brevo
- ❌ Dokumentacja double opt-in (jeśli zostanie zaimplementowane)
- ❌ Dokumentacja metod zarządzania kontaktami
- ❌ Przykłady użycia API Brevo

## 🎯 Rekomendacje priorytetowe

### Wysoki priorytet
1. **Dodać webhook handler** - umożliwi synchronizację statusu z Brevo
2. **Refaktoryzacja duplikacji kodu** - użycie metody `addContact()` w endpoincie
3. **Ulepszyć obsługę błędów** - rozróżnienie między "nie istnieje" a "błąd API"

### Średni priorytet
4. **Dodać metody update/remove** - pełne zarządzanie kontaktami
5. **Rozważyć double opt-in** - dla zgodności z RODO (jeśli wymagane)
6. **Walidacja listId** - sprawdzanie czy lista istnieje w Brevo

### Niski priorytet
7. **Uprościć schematy** - usunąć nieużywane pola lub zaimplementować je
8. **Dodać monitoring** - metryki integracji z Brevo
9. **Rozszerzyć dokumentację** - szczegóły implementacji i przykłady

## ✅ Wnioski

Integracja Brevo działa poprawnie dla podstawowych przypadków użycia (subskrypcja, generowanie kodów rabatowych, wysyłka emaili). Główne obszary do poprawy to:

1. **Webhook handler** - kluczowy dla synchronizacji statusu
2. **Zarządzanie kontaktami** - metody update/remove dla pełnej funkcjonalności
3. **Spójność schematów** - uproszczenie lub pełna implementacja

System jest gotowy do produkcji dla podstawowych funkcji, ale rekomendowane jest uzupełnienie brakujących funkcji dla pełnej funkcjonalności.

