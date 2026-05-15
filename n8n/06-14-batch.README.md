# Batch Import: Meetings + Action Items (workflows 06-14)

Тези 9 workflow-а имат **същата** структура като предишните: auth check (Extract Token → Lookup Session → Session valid?) + бизнес логика + Respond nodes.

## Batch import процедура

За всеки от 9-те файла повтори:

1. n8n → "..." → **Import from File** → избери `0X-...json`
2. Намери всичките **Postgres nodes** (1-3 на workflow) → за всеки **избери `Supabase Postgres` credential**
3. **Publish / Active** toggle ON
4. Двойно кликни Webhook node → копирай **Production URL**

Препоръчвам да минеш всичките 9 в **batch import** (10-15 мин), после да тестваш само **критичните** (виж по-долу).

## Endpoints overview

| # | Workflow | Метод + Path | Какво прави |
|---|---|---|---|
| 06 | meetings-create | POST `/meetings` | Save debrief draft + action items (атомична транзакция) |
| 07 | meetings-list | GET `/meetings?q=&limit=&offset=` | List + full-text search + open count |
| 08 | meetings-get | GET `/meetings/:id` | Detail + всички action items |
| 09 | meetings-patch | PATCH `/meetings/:id` | Partial update (само променените полета) |
| 10 | meetings-delete | DELETE `/meetings/:id` | Изтрива meeting + всички action items (cascade) |
| 11 | action-items-create | POST `/meetings/:id/action-items` | Manual add на нов item |
| 12 | action-items-patch | PATCH `/action-items/:id` | Toggle done / edit text / edit owner |
| 13 | action-items-delete | DELETE `/action-items/:id` | Изтрива един item |
| 14 | action-items-open | GET `/action-items/open` | Dashboard: всички open across meetings, oldest first |

---

## Critical-path тестове (минимум)

Тествай тези **3 потока**, които покриват 90% от endpoint-ите. Ако те минат, останалите вероятно работят (защото патерните се повтарят).

### Helper script (стартирай първо)

Запази в PowerShell сесия за reuse:

```powershell
$base = "https://vending-context-abdominal.ngrok-free.dev/webhook"
$h = @{ "ngrok-skip-browser-warning" = "1" }

# Get session
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
  -ContentType "application/json" -Headers $h `
  -Body '{"email":"test@example.com","password":"supersecret123"}'
$token = $login.sessionToken
$auth = @{ "Authorization" = "Bearer $token"; "ngrok-skip-browser-warning" = "1" }
Write-Host "Token: $token" -ForegroundColor Cyan
```

### Поток 1: Create + Get + Patch + List

```powershell
# Create meeting
$createBody = @{
  title = "Test Meeting 1"
  meetingDate = "2026-05-15"
  summary = "Discussed Q2 roadmap and feature priorities."
  transcript = "Alice: Let's launch on May 31. Bob: I'll handle the rate limiting work."
  participants = @("Alice", "Bob")
  decisions = @("Launch on May 31")
  blockers = @("Backend rate limiting incomplete")
  followupEmail = "Hi all, thanks for the discussion..."
  actionItems = @(
    @{ text = "Complete rate limiting"; owner = "Bob" }
    @{ text = "Draft integration spec"; owner = $null }
  )
} | ConvertTo-Json -Depth 5

$created = Invoke-RestMethod -Uri "$base/meetings" -Method POST `
  -ContentType "application/json" -Headers $auth -Body $createBody
$meetingId = $created.id
Write-Host "Created meeting: $meetingId" -ForegroundColor Green

# Get meeting (full detail with action items)
$detail = Invoke-RestMethod -Uri "$base/meetings/$meetingId" -Headers $auth
$detail.meeting | ConvertTo-Json -Depth 5

# Patch title
$patchBody = '{"title":"Test Meeting 1 — Updated"}'
Invoke-RestMethod -Uri "$base/meetings/$meetingId" -Method PATCH `
  -ContentType "application/json" -Headers $auth -Body $patchBody

# List meetings
$list = Invoke-RestMethod -Uri "$base/meetings" -Headers $auth
Write-Host "Total: $($list.total)" -ForegroundColor Green
$list.meetings | Format-Table id, title, openActionItemsCount
```

**Очаквано:**
- Create → връща `{ id: "uuid" }` със 201 status
- Get → връща meeting обект с **2 action items** в массива (с правилни owner-и)
- Patch → 200 ok, title-ът се update-ва
- List → връща обект с `meetings` array и `total`

### Поток 2: Action items toggle + dashboard

```powershell
# Get a current action item ID from the meeting
$detail = Invoke-RestMethod -Uri "$base/meetings/$meetingId" -Headers $auth
$itemId = $detail.meeting.actionItems[0].id
Write-Host "Toggling item: $itemId" -ForegroundColor Cyan

# Toggle done
$toggleBody = '{"isDone":true}'
$toggled = Invoke-RestMethod -Uri "$base/action-items/$itemId" -Method PATCH `
  -ContentType "application/json" -Headers $auth -Body $toggleBody
Write-Host "Completed at: $($toggled.actionItem.completedAt)" -ForegroundColor Green

# Dashboard — open items only
$open = Invoke-RestMethod -Uri "$base/action-items/open" -Headers $auth
Write-Host "Open items count: $($open.items.Count)" -ForegroundColor Green
$open.items | Format-Table id, text, @{n='meeting';e={$_.meeting.title}}

# Toggle back to undone
Invoke-RestMethod -Uri "$base/action-items/$itemId" -Method PATCH `
  -ContentType "application/json" -Headers $auth -Body '{"isDone":false}'
```

**Очаквано:**
- PATCH с `isDone:true` → `completedAt` се set-ва на now()
- Dashboard → показва само НЕ done items, най-старите първи
- PATCH с `isDone:false` → `completedAt` става null

### Поток 3: Search + Delete

```powershell
# Search
$results = Invoke-RestMethod -Uri "$base/meetings?q=rate+limiting" -Headers $auth
Write-Host "Search hits: $($results.total)" -ForegroundColor Green

# Add manual action item
$addBody = '{"text":"Send weekly status update","owner":"Alice"}'
$added = Invoke-RestMethod -Uri "$base/meetings/$meetingId/action-items" -Method POST `
  -ContentType "application/json" -Headers $auth -Body $addBody
Write-Host "Added item: $($added.actionItem.id)"

# Delete that item
Invoke-RestMethod -Uri "$base/action-items/$($added.actionItem.id)" -Method DELETE -Headers $auth
Write-Host "Item deleted"

# Delete the whole meeting
Invoke-RestMethod -Uri "$base/meetings/$meetingId" -Method DELETE -Headers $auth
Write-Host "Meeting deleted"

# Confirm deletion
try {
  Invoke-RestMethod -Uri "$base/meetings/$meetingId" -Headers $auth
} catch {
  Write-Host "404 confirmed: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
}
```

**Очаквано:**
- Search връща meeting-а (намира "rate limiting" в transcript-а)
- POST action item → нов item с position +1
- DELETE → 200
- GET след DELETE → 404

---

## Important n8n настройки

### За всеки workflow с `:id` в path-а (08, 09, 10, 11, 12, 13)

n8n трябва да парсва URL param. Когато импортнеш и видиш path-а във Webhook node-а, увери се че пише точно:
- `meetings/:id` (НЕ `meetings/{id}` или `meetings/id`)

Този формат n8n превръща в `$json.params.id`.

### За `alwaysOutputData` на Postgres nodes

Ако някъде workflow върне 200 с празно body вместо 404 → значи `Always Output Data` НЕ е enabled на дадения Postgres node. Виж предишния fix който направихме за /auth/me.

В JSON-ите по подразбиране е set-нат, но при ръчни редакции внимавай.

### За `responseCode` като expression

В action-items-create виж "Respond Input Error" — има `responseCode: "={{ $json.status }}"`. Това позволява един Respond node да връща 400 или 404 според предишния result. Ако виждаш че винаги връща статус 200 за грешки → провери че expression-а е активен (n8n понякога tries го интерпретира като string "={{...}}").

---

## Privacy тест (важно за homework grading)

Спецификацията изисква expicit тест с 2 акаунта:

```powershell
# Account 1
$login1 = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
  -ContentType "application/json" -Headers $h `
  -Body '{"email":"test@example.com","password":"supersecret123"}'
$auth1 = @{ "Authorization" = "Bearer $($login1.sessionToken)"; "ngrok-skip-browser-warning" = "1" }

# Create a meeting as Account 1
$created = Invoke-RestMethod -Uri "$base/meetings" -Method POST `
  -ContentType "application/json" -Headers $auth1 `
  -Body '{"title":"Private","transcript":"Secret meeting notes here"}'
$meetingId = $created.id

# Sign up Account 2
$signup2 = Invoke-RestMethod -Uri "$base/auth/signup" -Method POST `
  -ContentType "application/json" -Headers $h `
  -Body '{"email":"spy@example.com","password":"longpass123"}'
$auth2 = @{ "Authorization" = "Bearer $($signup2.sessionToken)"; "ngrok-skip-browser-warning" = "1" }

# Account 2 tries to read Account 1's meeting
try {
  Invoke-RestMethod -Uri "$base/meetings/$meetingId" -Headers $auth2
  Write-Host "PRIVACY BREACH!" -ForegroundColor Red
} catch {
  Write-Host "Privacy OK: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
}

# Account 2's meetings list should be empty
$list2 = Invoke-RestMethod -Uri "$base/meetings" -Headers $auth2
Write-Host "Account 2 sees $($list2.total) meetings (expected 0)"
```

**Очаквано:** 404 за чужд meeting, 0 в собствения list. Това е mandatory check за homework deliverable-ите.

---

## Когато си готова

След като минат:
- ✅ Поток 1 (create / get / patch / list)
- ✅ Поток 2 (toggle / dashboard)
- ✅ Privacy тест

→ Всички n8n workflows са готови. Минаваме на **Next.js scaffolding**.

Ако някъде заседнеш — кажи кой endpoint и какъв е error-ът от Executions tab-а.
