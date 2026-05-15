# Workflow 1: `POST /auth/signup`

Това е първият workflow. Целта е да научиш базовите nodes на n8n, преди да минем към по-сложните.

## Структура (overview)

```
Webhook (POST /auth/signup)
    │
    ▼
Validate & Hash  ─── Code node: проверява вход, хешира парола, генерира session token
    │
    ▼
Valid input?  ─── IF node
    │ true                    │ false
    ▼                         ▼
Insert User              Respond Validation Error (400)
(ON CONFLICT DO NOTHING)
    │
    ▼
User created?  ─── IF node (id съществува ли в резултата?)
    │ true                    │ false
    ▼                         ▼
Insert Session          Respond Email Taken (409)
    │
    ▼
Respond Success (200)
```

---

## Стъпки за import и адаптация

### 1. Преди да import-неш

Увери се, че имаш:

- **Supabase project с готова schema** (изпълни SQL-а от плана, раздел 1).
- **n8n environment variable `WEBHOOK_SECRET`** — нещо случайно, напр. `openssl rand -hex 32`. Същата стойност ще сложиш в `.env.local` на Next.js като `N8N_WEBHOOK_SECRET`.
- **Postgres credential в n8n** свързан със Supabase. Settings → Credentials → New → Postgres:
  - Host: `aws-0-eu-central-1.pooler.supabase.com` (или каквото пише в Supabase → Project Settings → Database → Connection string → "Session pooler")
  - Database: `postgres`
  - User: `postgres.<your-project-ref>`
  - Password: твоята database парола
  - Port: `5432`
  - SSL: `require`
  - Дай credential-а име като "Supabase Postgres".

### 2. Import

В n8n: горе вдясно "..." → **Import from File** → избери `01-auth-signup.json`.

### 3. Адаптация (3 неща)

#### a) Свържи Postgres credentials

Workflow-ът ще покаже двата Postgres nodes ("Insert User", "Insert Session") с **червен надпис "Credential needed"**.

- Отвори всеки от двата → в Credentials падащото → избери "Supabase Postgres".
- ⚠️ Трябва да го направиш и за двата node-а отделно.

#### b) Активирай webhook secret check (опционално, но препоръчвам)

В Code node-а "Validate & Hash" има тази проверка:
```js
const expectedSecret = $env.WEBHOOK_SECRET;
if (expectedSecret && headers['x-webhook-secret'] !== expectedSecret) { ... }
```

Тя автоматично се изпълнява, ако имаш set-нат `WEBHOOK_SECRET` environment variable в n8n. Ако нямаш такъв — пропуска проверката (за лесно тестване в началото).

За да set-неш env var в n8n:
- **self-hosted (Docker):** в `docker-compose.yml` под `environment:` добави `WEBHOOK_SECRET=твой_секрет`.
- **n8n Cloud:** Settings → Environment Variables.

#### c) Активирай workflow-а

Горе вдясно превключи toggle-а на **Active**. При активация webhook URL-ът става production URL — копирай го (изглежда нещо като `https://your-instance.n8n.cloud/webhook/auth/signup`).

В тестови режим (Inactive) URL-ът е `/webhook-test/auth/signup` и работи само ако си кликнал "Execute workflow" точно преди това.

---

## Как да тестваш (преди да минем нататък)

Отвори PowerShell и пусни:

```powershell
$body = @{ email = "test@example.com"; password = "supersecret123" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://YOUR-N8N-URL/webhook/auth/signup" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ "X-Webhook-Secret" = "твой_секрет" } `
  -Body $body
```

**Очакван резултат:**
```json
{
  "sessionToken": "a1b2c3...64 hex chars",
  "expiresAt": "2026-06-13T...",
  "user": { "id": "uuid", "email": "test@example.com" }
}
```

**Провери и в Supabase** Table Editor:
- `users` — има нов ред с твоя email и хеш започващ с `pbkdf2$100000$...`
- `sessions` — има нов ред с token-а от response-а

**Edge cases за тестване:**

| Тест | Очакван отговор |
|---|---|
| Същият email втори път | 409 `email_taken` |
| Парола `short` (< 8 символа) | 400 `weak_password` |
| Email `notanemail` | 400 `invalid_email` |
| Без `X-Webhook-Secret` header (ако имаш env var) | 401 `unauthorized` |

---

## Какво научи в този workflow

1. **Webhook node** — entry point, "Response Mode: Using Respond to Webhook Node" позволява custom status codes.
2. **Code node** — pure JavaScript за валидация, хеширане (`crypto.pbkdf2Sync`), генериране на токен (`crypto.randomBytes`).
3. **IF node** — branch logic базиран на стойност в `$json`.
4. **Postgres node "Execute Query"** — параметризирани SQL заявки с `$1, $2` placeholders и `queryReplacement`.
5. **ON CONFLICT DO NOTHING RETURNING** — Postgres pattern за "insert if not exists, иначе ми кажи". Ако email съществува, заявката връща празно → влизаме в "email taken" branch.
6. **Cross-node references** — `$('Validate & Hash').item.json.sessionToken` чете output от друг node, не предходния.
7. **Respond to Webhook** — отделни nodes за различни status codes (200, 400, 409).

---

## Често срещани грешки

- **"Cannot read property 'body' of undefined"** в Code node → Webhook node-ът не е минал. Натисни "Execute workflow" първо, после изпрати request към `/webhook-test/...`.
- **Postgres "permission denied"** → погрешен role или връзка със wrong database. Провери connection string.
- **`$env.WEBHOOK_SECRET` undefined** → env var не е set-нат в n8n. Restart на n8n след добавяне.
- **Respond Success връща `{{ ... }}` literal** → синтаксисът трябва да започва с `=` за expressions, не `=={`. Внимавай при copy-paste.

---

## Когато си готова

Тествай happy path + email_taken case. Като работят → ела при мен и минаваме на **`POST /auth/login`** (по-кратък — само добавя bcrypt-style compare).
