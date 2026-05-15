# Workflow 4: `POST /auth/logout`

Най-краткият workflow от auth серията. Структурата е същата като `/auth/me`, но вместо да SELECT-ваме user, **DELETE-ваме сесията**.

## Структура

```
Webhook (POST /auth/logout)
    │
    ▼
Extract Token  ─── Code: парсва Authorization: Bearer header
    │
    ▼
Token present?  ─── IF
    │ true                │ false
    ▼                     ▼
Delete Session       Respond Unauthorized (401)
(DELETE WHERE token = $1)
    │
    ▼
Respond Success (200)
```

## Защо има само 1 IF (а не 2)

В `/auth/me` имахме две проверки: "token present?" + "session valid?". В logout-а ни е достатъчна само първата:

- Ако token-ът съществува в DB → DELETE го трие → 200 OK
- Ако НЕ съществува (вече е expired или бил deleted) → DELETE прави нищо → 200 OK

Това е feature, не bug. **Logout е винаги idempotent** — много пъти може да викнеш logout с един и същ token, отговорът ще е винаги "ok". Дори ако клиентът няма token изобщо, връщаме 401 (за UX feedback), но реално нищо лошо не би се случило.

> 💡 Idempotent = "много пъти изпълнено = един път изпълнено". Важно свойство за state-changing операции.

---

## Стъпки

1. Import `04-auth-logout.json`
2. Свържи Postgres credential-а на "Delete Session" node
3. Активирай (Publish)
4. Копирай Production URL

## Тестове

### Подготовка — вземи прясна сесия

```powershell
$loginUri = "https://vending-context-abdominal.ngrok-free.dev/webhook/auth/login"
$loginBody = '{"email":"test@example.com","password":"supersecret123"}'

$login = Invoke-RestMethod -Uri $loginUri -Method POST `
  -ContentType "application/json" `
  -Headers @{ "ngrok-skip-browser-warning" = "1" } `
  -Body $loginBody

$token = $login.sessionToken
Write-Host "Token: $token" -ForegroundColor Cyan
```

### Тест 1: Logout с валидна сесия

```powershell
$uri = "https://vending-context-abdominal.ngrok-free.dev/webhook/auth/logout"

$r = Invoke-WebRequest -Uri $uri -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "ngrok-skip-browser-warning" = "1"
  } `
  -UseBasicParsing
Write-Host "STATUS: $($r.StatusCode)" -ForegroundColor Green
Write-Host "BODY: $($r.Content)"
```

**Очаквано:** Status 200 + `{ "ok": true }`.

### Тест 2: Провери че сесията е изтрита

Веднага след logout-а пусни `/auth/me` със същия token:

```powershell
$meUri = "https://vending-context-abdominal.ngrok-free.dev/webhook/auth/me"

try {
  $r = Invoke-WebRequest -Uri $meUri -Method GET `
    -Headers @{
      "Authorization" = "Bearer $token"
      "ngrok-skip-browser-warning" = "1"
    } `
    -UseBasicParsing
  Write-Host "STATUS: $($r.StatusCode)" -ForegroundColor Green
  Write-Host "BODY: $($r.Content)"
} catch {
  Write-Host "ERROR STATUS: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host "BODY: $($_.ErrorDetails.Message)" }
}
```

**Очаквано:** Status 401 + `invalid_session`. Сесията е изтрита, /auth/me я отхвърля.

### Тест 3: Logout без token

```powershell
Invoke-WebRequest -Uri $uri -Method POST -Headers @{ "ngrok-skip-browser-warning" = "1" } -UseBasicParsing
```

**Очаквано:** 401.

### Тест 4: Idempotent — повтори logout-а

```powershell
# Същата команда от тест 1 — пусни я отново с вече изтрит token
$r = Invoke-WebRequest -Uri $uri -Method POST `
  -Headers @{
    "Authorization" = "Bearer $token"
    "ngrok-skip-browser-warning" = "1"
  } `
  -UseBasicParsing
Write-Host "STATUS: $($r.StatusCode)"
Write-Host "BODY: $($r.Content)"
```

**Очаквано:** Status 200 + `{ "ok": true }`. Token-ът вече го няма в DB, но DELETE не fail-ва — просто не трие нищо.

---

## Какво научаваш

1. **Reuse pattern** — Extract Token логиката е точно копие от `/auth/me`. Този pattern ще се повтаря.
2. **DELETE с WHERE** — параметризирано, безопасно за SQL injection.
3. **Idempotent design** — статуса 200 даже когато token-ът вече не съществува. Опростява клиентския код.

---

## Проверка в Supabase (по желание)

След logout, в Supabase Table Editor → `sessions` table → онзи ред с твоя token трябва да го няма. Други сесии (от други login-и) остават нетронати.

---

## Готова за следващия?

Сега минаваме на **AI частта — `POST /debrief`**. Този workflow е значително по-голям и интересен:

- Извиква LLM (OpenAI или подобен)
- Получава structured JSON output
- Валидира го преди да върне
- Има handling за "това не е meeting" случая

Имаш ли вече OpenAI API key? Ако не — създай си един на [platform.openai.com](https://platform.openai.com/api-keys) преди да започнем (нужни са ~$1 кредит, за homework стига и trial). Алтернативно можем да ползваме Anthropic Claude API или друг LLM provider.
