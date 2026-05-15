# Workflow 2: `POST /auth/login`

## Структура

```
Webhook (POST /auth/login)
    │
    ▼
Validate Input  ─── Code: проверява, че email + password не са празни
    │
    ▼
Valid input?  ─── IF
    │ true               │ false
    ▼                    ▼
Find User           Respond Invalid (401)
(SELECT по email)
    │
    ▼
Verify Password  ─── Code: PBKDF2 recompute + constant-time compare
    │
    ▼
Password OK?  ─── IF
    │ true               │ false
    ▼                    ▼
Insert Session     Respond Invalid (401)
    │
    ▼
Respond Success (200)
```

---

## Ключови различия от signup

1. **SELECT вместо INSERT** — намираме съществуващ user по email.
2. **PBKDF2 verify pattern** — четем `password_hash` от DB, parse-ваме формата `pbkdf2$iterations$salt$hash`, recomputе-ваме хеша със **същия** salt и iterations, после правим **constant-time compare** с `crypto.timingSafeEqual`. Това е важно за сигурност — не сравнявай хешове с `===`, защото timing може да издаде информация.
3. **Generic error** — върнем една и съща `invalid_credentials` грешка и за "user не съществува", и за "грешна парола". Това е по-сигурно — не leak-ваме на attacker дали даден email е регистриран.

---

## Стъпки

### 1. Import

В n8n: "..." → Import from File → `02-auth-login.json`.

### 2. Свържи Postgres credentials

И в двата Postgres nodes ("Find User", "Insert Session") избери `Supabase Postgres` credential-а.

### 3. Активирай workflow-а

Бутон Publish / toggle Active горе вдясно.

### 4. Копирай Production URL-а

Двойно кликни Webhook node → Production URL → copy. Ще е нещо като:
```
https://ТВОЯ-NGROK/webhook/auth/login
```

---

## Тестове

### Happy path (същият user от signup-а):

```powershell
$uri = "https://ТВОЯ-NGROK/webhook/auth/login"
$body = '{"email":"test@example.com","password":"supersecret123"}'

try {
  $r = Invoke-WebRequest -Uri $uri -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
  Write-Host "STATUS: $($r.StatusCode)" -ForegroundColor Green
  Write-Host "BODY: $($r.Content)"
} catch {
  Write-Host "ERROR STATUS: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host "BODY: $($_.ErrorDetails.Message)" }
}
```

**Очаквано:** Status 200 + `{ sessionToken, expiresAt, user: { id, email } }`. **Различен** session token от signup-а (нов е).

### Грешна парола:

```powershell
$body = '{"email":"test@example.com","password":"wrongpassword"}'
# (същата команда, само различен body)
```
**Очаквано:** Status 401 + `{ error: "invalid_credentials", ... }`.

### Несъществуващ user:

```powershell
$body = '{"email":"nobody@example.com","password":"whatever12345"}'
```
**Очаквано:** Status 401 + **същата** `invalid_credentials` грешка (не "user not found"!). Това е feature, не bug — защита срещу email enumeration.

### Празна парола:

```powershell
$body = '{"email":"test@example.com","password":""}'
```
**Очаквано:** Status 401 + `invalid_credentials`.

---

## Какво научаваш в този workflow

1. **Cross-node данни** — `$('Validate Input').item.json.password` чете paссword-а от валидиращия node, защото в "Verify Password" вече сме на изхода на "Find User" (където няма password).
2. **PBKDF2 verify pattern** — recompute с stored salt + constant-time compare. Универсален pattern за всеки PBKDF2/bcrypt/scrypt подобен setup.
3. **Generic error messages** — security best practice за auth endpoints.
4. **Параметризирани SELECT** — `WHERE email = $1` с `queryReplacement` (защита от SQL injection).

---

## Често срещани проблеми

- **"Module 'crypto' is disallowed"** → същата грешка като при signup. Ако вече си fix-нала `NODE_FUNCTION_ALLOW_BUILTIN=crypto` за signup-а, тук ще работи направо.
- **"undefined" в response-а** → cross-node reference не намира node-а. Провери имената на nodes-овете точно (имената са case-sensitive).
- **Винаги връща 401, дори с правилна парола** → провери че password_hash в DB започва с `pbkdf2$` (виж в Supabase). Ако някак е се деформирал, изтрий user-а и signup-ни наново.

---

## Когато си готова

Тествай happy path + поне един от error case-овете → ела при мен, минаваме на **`GET /auth/me`** (най-кратък — single SQL query с JOIN).
