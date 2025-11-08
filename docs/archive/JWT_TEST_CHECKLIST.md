# JWT Authentication Test Checklist

**Data**: 2025-01-XX  
**Status**: ✅ READY FOR TESTING

---

## 🧪 Testy do wykonania po wdrożeniu `king-jwt-authentication.php`

### 1. Test endpointu `/login` ✅

**Endpoint**: `POST /wp-json/king-jwt/v1/login`

**Request**:
```json
{
  "email": "test@example.com",
  "password": "haslo123"
}
```

**Oczekiwana odpowiedź** (200 OK):
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 123,
    "email": "test@example.com",
    "firstName": "Jan",
    "lastName": "Kowalski",
    "role": "customer",
    "billing": { ... },
    "shipping": { ... }
  }
}
```

**Test**:
```bash
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"haslo123"}'
```

---

### 2. Test endpointu `/validate` ✅

**Endpoint**: `POST /wp-json/king-jwt/v1/validate`

**Request**:
```json
{
  "token": "YOUR_JWT_TOKEN"
}
```

**Oczekiwana odpowiedź** (200 OK):
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": 123,
    "email": "test@example.com",
    "name": "Jan Kowalski"
  },
  "user_id": 123,
  "expires_at": 1234567890
}
```

**Test**:
```bash
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/validate" \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_JWT_TOKEN"}'
```

---

### 3. Test endpointu `/refresh` z Rate Limiting ✅

**Endpoint**: `POST /wp-json/king-jwt/v1/refresh`

**Request**:
```json
{
  "token": "YOUR_JWT_TOKEN"
}
```

**Oczekiwana odpowiedź** (200 OK):
```json
{
  "success": true,
  "token": "NEW_JWT_TOKEN"
}
```

**Test rate limiting** (max 5/min):
```bash
# Wykonaj 10 requestów z rzędu - po 5 powinno zwrócić 429
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST "https://your-site.com/wp-json/king-jwt/v1/refresh" \
    -H "Content-Type: application/json" \
    -d '{"token":"YOUR_JWT_TOKEN"}' \
    -w "\nStatus: %{http_code}\n\n"
  sleep 1
done
```

**Oczekiwany wynik**:
- Requesty 1-5: `200 OK` z nowym tokenem
- Requesty 6-10: `429 Too Many Requests` z komunikatem: "Zbyt wiele żądań odświeżania tokenu. Spróbuj ponownie za chwilę."

---

### 4. Test Token Rotation ✅

**Test**: Stary token nie może być użyty ponownie po refresh

**Kroki**:
1. Zaloguj się i otrzymaj token `TOKEN_1`
2. Odśwież token i otrzymaj `TOKEN_2`
3. Spróbuj użyć `TOKEN_1` ponownie do refresh
4. Oczekiwany wynik: `401 Unauthorized` z komunikatem: "Token został już użyty do odświeżania"

**Test**:
```bash
# 1. Login
LOGIN_RESPONSE=$(curl -X POST "https://your-site.com/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"haslo123"}')

TOKEN_1=$(echo $LOGIN_RESPONSE | jq -r '.token')

# 2. Refresh token
REFRESH_RESPONSE=$(curl -X POST "https://your-site.com/wp-json/king-jwt/v1/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN_1\"}")

TOKEN_2=$(echo $REFRESH_RESPONSE | jq -r '.token')

# 3. Spróbuj użyć starego tokenu ponownie (powinno zwrócić błąd)
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN_1\"}"
# Oczekiwany wynik: 401 "Token został już użyty do odświeżania"
```

---

### 5. Test Scope Verification ✅

**Test**: Token zawiera scopes (read:profile, read:orders, write:profile)

**Kroki**:
1. Zaloguj się i otrzymaj token
2. Dekoduj token (JWT) i sprawdź payload.scopes

**Test**:
```bash
# Login i otrzymaj token
TOKEN=$(curl -X POST "https://your-site.com/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"haslo123"}' \
  | jq -r '.token')

# Dekoduj payload (bezpiecznie - bez weryfikacji)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.scopes'
# Oczekiwany wynik: ["read:profile", "read:orders", "write:profile"]
```

---

### 6. Test Frontend Integration ✅

**Test**: Sprawdź czy frontend poprawnie korzysta z endpointów

**Kroki**:
1. Otwórz stronę logowania w przeglądarce
2. Zaloguj się
3. Sprawdź w konsoli czy token został zapisany
4. Sprawdź czy refresh token działa automatycznie

**Oczekiwane zachowanie**:
- ✅ Logowanie działa
- ✅ Token jest zapisany w localStorage/sessionStorage
- ✅ Refresh token działa automatycznie przed wygaśnięciem
- ✅ Po refresh stary token jest invalidowany

---

### 7. Test Error Handling ✅

**Testy błędów**:

#### 7.1. Nieprawidłowe credentials
```bash
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@example.com","password":"wrong"}'
# Oczekiwany wynik: 401 "Nieprawidłowy email lub hasło"
```

#### 7.2. Brakujące pole
```bash
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# Oczekiwany wynik: 400 "password jest wymagane"
```

#### 7.3. Nieprawidłowy token
```bash
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/validate" \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid_token"}'
# Oczekiwany wynik: 401 "Nieprawidłowy token"
```

#### 7.4. Wygasły token
```bash
# Użyj starego wygasłego tokenu
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/validate" \
  -H "Content-Type: application/json" \
  -d '{"token":"EXPIRED_TOKEN"}'
# Oczekiwany wynik: 401 "Token expired"
```

---

## ✅ Checklist wdrożenia

### Przed testami
- [ ] Wdrożono `king-jwt-authentication.php` na serwer
- [ ] Sprawdzono logi błędów (brak błędów PHP)
- [ ] Sprawdzono uprawnienia plików (644)

### Podczas testów
- [ ] Test 1: Login endpoint działa ✅
- [ ] Test 2: Validate endpoint działa ✅
- [ ] Test 3: Refresh endpoint działa ✅
- [ ] Test 4: Rate limiting działa (max 5/min) ✅
- [ ] Test 5: Token rotation działa ✅
- [ ] Test 6: Scope verification działa ✅
- [ ] Test 7: Frontend integration działa ✅
- [ ] Test 8: Error handling działa ✅

### Po testach
- [ ] Wszystkie testy przeszły pomyślnie
- [ ] Brak błędów w logach
- [ ] Frontend poprawnie korzysta z JWT
- [ ] Rate limiting chroni przed atakami

---

## 🔧 Rozwiązywanie problemów

### Problem: "Token został już użyty do odświeżania"
**Rozwiązanie**: To jest zamierzone zachowanie (token rotation). Użytkownik musi zalogować się ponownie.

### Problem: "Zbyt wiele żądań odświeżania tokenu"
**Rozwiązanie**: Rate limiting działa poprawnie. Poczekaj 1 minutę i spróbuj ponownie.

### Problem: Błędy PHP po wdrożeniu
**Rozwiązanie**: 
1. Sprawdź logi błędów
2. Sprawdź wersję PHP (min 7.4)
3. Przywróć backup jeśli potrzeba

---

**Data utworzenia**: 2025-01-XX  
**Status**: ✅ READY FOR TESTING

