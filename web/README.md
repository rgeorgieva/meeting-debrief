# Meeting Debrief

A personal meeting intelligence tool: paste a transcript, get back decisions, action items, blockers, and a follow-up email — every time. Built in 4 hours for the encorp.ai Vibe Coding Workshop.

## Live demo

→ **TODO: add Vercel URL here after deploy**

## Stack

- **Next.js 16** (App Router) + **Tailwind v4** + **shadcn/ui-style components**
- **Supabase Postgres** for storage
- **n8n** as the full backend orchestrator (auth, CRUD, AI calls)
- **OpenAI GPT-4o-mini** with structured outputs for the debrief extraction
- **Custom session auth** — bcrypt-style password hashing (PBKDF2 via Node's `crypto`), session tokens stored in DB, HttpOnly cookies
- **Vercel** for hosting

## Architecture

```
Browser
   │
   ▼
Next.js (Vercel)                       Supabase
   ├── Server Components (auth gate)    (Postgres
   ├── Client UI (React)                 only — no
   └── API Routes (thin proxy) ─────┐    Auth used)
                                    │           ▲
                                    ▼           │
                              n8n (Docker + ngrok)
                              ├── Auth workflows (PBKDF2, session tokens)
                              ├── Meetings CRUD
                              ├── Action items CRUD
                              └── Debrief (OpenAI structured outputs)
```

Next.js is intentionally a **thin client + thin proxy**. All business logic lives in n8n workflows. Next.js only handles cookies (because HttpOnly cookies must be set on the same domain), rendering, and forwarding requests with the session token.

## Repository layout

```
.
├── n8n/                       # n8n workflow JSON files + READMEs
│   ├── 01-auth-signup.json    # ... through 14-action-items-open.json
│   └── ...
└── web/                       # Next.js app
    ├── app/
    │   ├── (auth)/            # login, signup
    │   ├── (app)/             # dashboard, meetings, new debrief
    │   └── api/               # proxy routes to n8n
    ├── components/
    │   ├── ui/                # primitives (Button, Input, Card, Dialog, ...)
    │   ├── meeting/           # DebriefFlow, MeetingDetail, MeetingsList
    │   ├── dashboard/         # DashboardList
    │   └── nav/               # Sidebar, MobileNav, UserMenu
    └── lib/
        ├── n8n.ts             # fetcher with URL routing
        ├── session.ts         # cookie session helpers
        ├── types.ts           # shared types
        └── utils.ts
```

## Local development

### Prerequisites
- Node 20+ / npm 10+
- Docker (for self-hosted n8n)
- A Supabase project (free tier)
- An OpenAI API key

### Setup

1. **Clone and install:**
   ```bash
   git clone <this-repo>
   cd web
   npm install
   ```

2. **Set up Supabase:**
   - Create a project at https://supabase.com
   - In SQL Editor, run the schema from `n8n/01-auth-signup.README.md` (top section)

3. **Run n8n locally:**
   ```bash
   docker compose up -d
   ```
   With `NODE_FUNCTION_ALLOW_BUILTIN=crypto` env var set (for PBKDF2 in Code nodes).

4. **Import n8n workflows:**
   - Import each `.json` file in `n8n/` (14 total)
   - In each workflow: connect the **Supabase Postgres** credential to all Postgres nodes
   - In `05-debrief.json`: also connect a **Header Auth** credential pointing to OpenAI (`Authorization: Bearer sk-...`)
   - Activate (Publish) each workflow

5. **Expose n8n publicly** (only needed if you'll deploy Next.js):
   ```bash
   ngrok http 5678
   ```
   Note the URL — you'll need it for `.env.local`.

6. **Configure Next.js:**
   ```bash
   cd web
   cp .env.example .env.local
   # edit .env.local: set N8N_BASE_URL=https://your-ngrok-url.ngrok-free.dev/webhook
   ```

7. **Run:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Set **Root Directory** to `web`.
4. Add env var: `N8N_BASE_URL=https://your-ngrok-url.ngrok-free.dev/webhook`.
5. Deploy.

⚠️ Free ngrok URLs change on every tunnel restart. For a stable demo, either pay for ngrok reserved domains, host n8n on Railway/Render, or use n8n Cloud.

## Features

- Sign in / sign up (frictionless — no email verification)
- Paste-and-debrief: transcript → structured AI extraction in 5-15 seconds
- Review-before-save: edit the title, summary, action items, decisions, blockers, follow-up email before committing
- Action item checkboxes with completion timestamps
- Dashboard view: all open action items across all meetings, oldest first
- Full-text search by title, summary, or transcript
- One-click copy of the follow-up email
- Delete-with-confirmation
- Designed empty states everywhere
- Mobile-responsive (sidebar collapses to bottom nav under `md`)

## Privacy

The schema enforces per-user isolation:
- Every `meeting` and `action_item` row stores `user_id` (denormalized for fast filtering)
- Every n8n SQL query filters by `user_id = (session.user_id)`
- A second test account cannot see another user's meetings — confirmed end-to-end

## Process artifacts

(Required for homework submission)

- `../d-ai-academy-2026-encorp-7-swirling-milner.md` — the initial plan written in Claude Code plan mode
- Screenshots in `../screenshots/` (TODO)
- Demo video link: TODO

### Rejection note

During scaffolding, the AI initially proposed an `--name` flag to `create-next-app` to bypass the directory-name validation when the parent folder contained spaces and capital letters. This didn't work because `create-next-app` derives the package name from the target directory when using `.`. We rejected this approach and instead created a `web/` subfolder — cleaner, doesn't fight the tooling, and the repo can house both n8n workflows and the Next.js app side-by-side.
