# Workflow 5: `POST /debrief`

Сърцето на проекта. Извиква OpenAI с **structured outputs** (гарантира валиден JSON по дефинирана схема) и връща debrief draft на потребителя. **НЕ запазва нищо в DB** — само връща draft за review.

## Структура

```
Webhook (POST /debrief)
    │
    ▼
Extract Token → Token present? ─false─→ Respond Unauthorized (401)
    │ true
    ▼
Lookup Session (alwaysOutputData=true)
    │
    ▼
Session valid? ─false─→ Respond Unauthorized (401)
    │ true
    ▼
Validate Transcript → Transcript valid? ─false─→ Respond Validation Error (400)
    │ true
    ▼
Call OpenAI (HTTP Request с structured outputs)
    │ │ onError continue
    │ └─→ Respond LLM Failed (502)
    ▼
Parse Response
    │
    ▼
Respond Success (200)
```

---

## Setup стъпки

### 1. Създай OpenAI API key

1. Иди на https://platform.openai.com/api-keys
2. **Create new secret key** → дай му име като "Meeting Debrief" → копирай ключа (започва с `sk-...`)
3. ⚠️ Запази го веднага — OpenAI няма да ти го покаже повторно.

> 💳 За тестовете ще ти трябват $1-2 credit. Регистрирай payment method в Billing settings, или ако имаш free trial credit, използвай него. GPT-4o-mini е много евтин (~$0.15 / 1M input tokens).

### 2. Създай HTTP Header Auth credential в n8n

- Settings → Credentials → **Create New** → търси "Header Auth"
- Попълни:
  - **Name (на credential-а):** `OpenAI API`
  - **Name (header name):** `Authorization`
  - **Value:** `Bearer sk-твоят-ключ`
    > ⚠️ Не забравяй думата `Bearer` отпред със space, преди ключа.
- Save

### 3. Import workflow-а

В n8n: "..." → Import from File → `05-debrief.json`.

### 4. Свържи credentials на два node-а

- **"Lookup Session"** (Postgres) → избери `Supabase Postgres`
- **"Call OpenAI"** (HTTP Request) → избери `OpenAI API`

### 5. Активирай и копирай URL-а

Publish → Production URL ще е `https://ТВОЯ-NGROK/webhook/debrief`.

---

## Тестове

### Подготовка — вземи прясна сесия

```powershell
$base = "https://vending-context-abdominal.ngrok-free.dev/webhook"
$h = @{ "ngrok-skip-browser-warning" = "1" }

$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
  -ContentType "application/json" -Headers $h `
  -Body '{"email":"test@example.com","password":"supersecret123"}'
$token = $login.sessionToken
```

### Тест 1: Реален transcript (happy path)

```powershell
$transcript = @"
Project Sync — Q2 Roadmap
Attendees: Alice, Bob, Carol

Alice: We need to decide on the launch date for Feature X. The marketing team is pushing for end of May.
Bob: That's aggressive. The backend isn't ready — we still don't have the rate limiting work done.
Alice: How long would that take?
Bob: About two weeks if I focus on it.
Carol: I can help with the frontend integration once Bob's done.
Alice: OK, let's commit to May 31. Bob, can you have the rate limiting ready by May 17? And Carol, can you start drafting the integration spec now so we're ready to go?
Bob: Yeah, I'll have it done by then.
Carol: Sure, I'll send the draft tomorrow.
Alice: Great. One more thing — we still haven't heard back from legal about the data retention policy. Carol, can you ping them?
Carol: On it.
"@

$body = @{ transcript = $transcript } | ConvertTo-Json
$debriefUri = "$base/debrief"

$r = Invoke-WebRequest -Uri $debriefUri -Method POST `
  -ContentType "application/json" `
  -Headers @{
    "Authorization" = "Bearer $token"
    "ngrok-skip-browser-warning" = "1"
  } `
  -Body $body `
  -UseBasicParsing
Write-Host "STATUS: $($r.StatusCode)" -ForegroundColor Green
Write-Host ($r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
```

**Очаквано:** Status 200 + draft с:
- title (нещо като "Q2 Roadmap Project Sync")
- meetingDate: вероятно `null` (няма дата в transcript-а)
- summary: 2-3 изречения
- participants: ["Alice", "Bob", "Carol"]
- decisions: ["Launch Feature X on May 31", ...]
- actionItems: масив с обекти `{ text, owner }`, owner-ите трябва да са Bob/Carol където имена са споменати, null където не са
- blockers: ["Legal hasn't approved data retention policy"]
- followupEmail: ~120-180 думи email

**Време:** обикновено 5-15 секунди.

### Тест 2: Невалиден input (не е meeting)

```powershell
$body = @{ transcript = "Roses are red, violets are blue, I like cookies, and so do you." } | ConvertTo-Json

$r = Invoke-WebRequest -Uri $debriefUri -Method POST `
  -ContentType "application/json" `
  -Headers @{
    "Authorization" = "Bearer $token"
    "ngrok-skip-browser-warning" = "1"
  } `
  -Body $body `
  -UseBasicParsing
$r.Content | ConvertFrom-Json | ConvertTo-Json
```

**Очаквано:** Status 200 + `{ "isValidMeeting": false, "message": "This doesn't look like a meeting transcript..." }`.

### Тест 3: Прекалено кратко

```powershell
$body = '{"transcript":"too short"}'
# Същата команда
```

**Очаквано:** Status 400 + `{ "error": "transcript_too_short" }`.

### Тест 4: Без auth

```powershell
Invoke-WebRequest -Uri $debriefUri -Method POST `
  -ContentType "application/json" `
  -Headers @{ "ngrok-skip-browser-warning" = "1" } `
  -Body '{"transcript":"... long enough text ... long enough text ... long enough text ..."}'
```

**Очаквано:** 401.

---

## Ключови концепции в този workflow

### 1. OpenAI Structured Outputs

```json
"response_format": {
  "type": "json_schema",
  "json_schema": {
    "name": "meeting_debrief",
    "strict": true,
    "schema": { ... JSON schema ... }
  }
}
```

С `strict: true`, OpenAI **гарантира** че отговорът е валиден JSON match-ващ схемата. Без това може да върне Markdown с код блок, или JSON със syntax error, или поле, което липсва.

Изисквания за strict mode:
- Всички properties трябва да са в `required` array (и nullable полета).
- `additionalProperties: false` навсякъде в обекти.
- nullable полета: `"type": ["string", "null"]` вместо просто `"type": "string"`.

### 2. HTTP Request error handling

```json
"onError": "continueErrorOutput"
```

Прави node-а с **2 изхода**: success (горен) и error (долен). При timeout, rate limit, или 5xx грешка от OpenAI, заявката отива в error branch → Respond LLM Failed (502).

### 3. JSON.parse + try/catch

OpenAI response е `{ choices: [{ message: { content: "...JSON string..." } }] }`. Това е **string**, не object — трябва ръчно `JSON.parse`. И трябва try/catch за случая, когато (рядко) JSON-ът е невалиден.

### 4. Reuse на auth pattern

Първите 4 nodes (Extract Token → Token present? → Lookup Session → Session valid?) са **същите** като в `/auth/me`. Това е стандарт за всеки protected endpoint оттук нататък. Само не забравяй `alwaysOutputData: true` на Postgres node-а — без него ще се счупи когато сесията не съществува.

---

## Цена

С GPT-4o-mini, един debrief на типичен 500-1500 word transcript струва около **$0.0003 - $0.001** (под половин цент). $1 кредит ти стига за 1000+ debriefs.

Ако искаш по-качествени резултати, можеш да смениш на `gpt-4o` в jsonBody-то — ~10x по-скъп, но забележимо по-добър за нюансирани transcripts.

---

## Често срещани грешки

- **401 от OpenAI** → credential-ът е грешен или OpenAI key-ът е изтекъл/изтрит. Провери в platform.openai.com → API keys.
- **429 rate limit** → ако нямаш payment method, OpenAI има строги rate limits. Добави billing.
- **400 от OpenAI "invalid_request"** → грешка в schema-та (strict mode е capricious). Виж execution log-а в n8n → expand error response.
- **Timeout (60s)** → OpenAI бавно отговаря. Може да увеличиш timeout-а в options, но обикновено е знак за rate limit или мрежов проблем.
- **`Parse Response` връща llm_failed дори при 200 статус** → response shape е различен от очакваното. Виж execution log → input на Parse Response → провери дали `choices[0].message.content` съществува.

---

## Когато си готова

Тествай happy path с meeting transcript-а от тест 1. Покажи ми response-а — особено action items с owners и follow-up email-а. Това е най-видимата AI логика в целия проект, важно е да върви добре.

После следват **meetings CRUD** workflows — повтаряеми patterns, по-малко интересни но необходими.
