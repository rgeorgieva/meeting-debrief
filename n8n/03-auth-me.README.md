# Workflow 3: `GET /auth/me`

Това е най-простият workflow досега, но и **най-важният pattern** — session check. Този pattern ще се повтаря във всеки protected endpoint (debrief, meetings, action items), затова си струва да го разбереш добре.

## Структура

```
Webhook (GET /auth/me)
    │
    ▼
Extract Token  ─── Code: парсва "Authorization: Bearer <token>"
    │
    ▼
Token present?  ─── IF
    │ true             │ false
    ▼                  ▼
Lookup Session     Respond Unauthorized (401)
(JOIN sessions+users, проверява expires_at > now())
    │
    ▼
Session valid?  ─── IF: има ли върнат ред?
    │ true             │ false
    ▼                  ▼
Respond Success   Respond Unauthorized (401)
(user.id + email)
```

---

## Защо този workflow е важен

Това е **тестов проксиращ endpoint** за session token-а. Next.js ще го извиква при всеки page load на protected route, за да:
1. Провери дали потребителят е логнат
2. Вземе email-а му за показване в UI-а
3. Получи `user.id` ако трябва (но не задължително — token-ът е enough)

В по-нататъшните workflows (debrief, meetings и т.н.) ще ползваме **същата** SQL заявка с JOIN, само че после ще правим още queries за самите данни.

---

## Стъпки

1. **Import** `03-auth-me.json`.
2. **Свържи Postgres credential** на "Lookup Session" node (само един е този път).
3. **Активирай** workflow-а (Publish).
4. **Копирай Production URL** — нещо като `https://ТВОЯ-NGROK/webhook/auth/me`.

---

## Тестове

### 1. Валидна сесия

Първо вземи session token от предишен login или signup. Имаш такъв от последния login response.

```powershell
$uri = "https://ТВОЯ-NGROK/webhook/auth/me"
$token = "ЗАЛЕПИ-СЕСИЯТА-ОТ-LOGIN"

try {
  $r = Invoke-WebRequest -Uri $uri -Method GET `
    -Headers @{ "Authorization" = "Bearer $token" } `
    -UseBasicParsing
  Write-Host "STATUS: $($r.StatusCode)" -ForegroundColor Green
  Write-Host "BODY: $($r.Content)"
} catch {
  Write-Host "ERROR STATUS: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
  if ($_.ErrorDetails) { Write-Host "BODY: $($_.ErrorDetails.Message)" }
}
```

**Очаквано:** Status 200 + `{ "user": { "id": "...", "email": "test@example.com" } }`.

### 2. Без header

```powershell
Invoke-WebRequest -Uri $uri -Method GET -UseBasicParsing
```
**Очаквано:** 401 + `invalid_session`.

### 3. Грешен token

```powershell
$r = Invoke-WebRequest -Uri $uri -Method GET `
  -Headers @{ "Authorization" = "Bearer 0000000000000000000000000000000000000000000000000000000000000000" } `
  -UseBasicParsing -ErrorAction SilentlyContinue
```
**Очаквано:** 401 (token е 64 hex символа правилно, но не съществува в DB).

### 4. Грешен формат

```powershell
-Headers @{ "Authorization" = "Bearer not-a-real-token" }
```
**Очаквано:** 401 (regex-ът не matches → token се отхвърля още в Extract Token node-а).

---

## Какво научаваш в този workflow

### 1. Authorization header parsing

```js
const authHeader = headers['authorization'] || headers['Authorization'] || '';
const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(authHeader);
```

- HTTP headers са case-insensitive по стандарт, но в JS обектът ключовете са lowercase. Чета и двата за сигурност.
- Regex-ът проверява и **формата** (точно 64 hex символа), което елиминира validnessions tokens още преди да удариш DB-то.

### 2. JOIN с expiry check

```sql
SELECT u.id, u.email
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token = $1 AND s.expires_at > now()
LIMIT 1;
```

Един query прави:
- Намира сесията по token
- Прескача expired sessions (`expires_at > now()`)
- JOIN-ва веднага с user-а, за да върне email-а

Това е **THE** session check pattern. Ще го виждаш отново и отново.

### 3. Empty result-style branching

В IF "Session valid?" проверяваме дали `$json.id` съществува. Ако SELECT не върне нищо (token не съществува или е expired), result-ът е празен → IF отива в false branch → 401.

---

## Reuse pattern за следващите workflows

В следващите workflows (debrief, meetings, action items) ще се повтори **същият** Extract Token + Lookup Session pattern. За да не дублираме код, ще го inline-ваме като първи две стъпки във всеки workflow.

(n8n няма concept на "subroutine" workflows, които да върнат данни синхронно — има "Execute Workflow" node, но е тромаво за нашия use case. По-просто е да copy-paste-нем тези 2 nodes.)

---

## Когато си готова

Тествай happy path + поне един error case → ела при мен.

След това следва **`POST /auth/logout`** (триене на session) — много кратък, или направо може да минем на **`POST /debrief`** (AI part — най-интересният).
