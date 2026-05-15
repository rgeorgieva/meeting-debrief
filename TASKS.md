# Task list — Meeting Debrief build

Task tracking kept open throughout the 4+ hour build. Captured progression below.

## Plan mode (00:00–00:30)

- [x] Read homework spec, identify scope
- [x] Clarify architecture (n8n as full orchestrator vs partial)
- [x] Choose stack (Next.js 16, Tailwind v4, shadcn-style, Supabase, OpenAI, Vercel)
- [x] Choose auth approach (custom PBKDF2 + DB-backed sessions)
- [x] Write detailed plan with n8n API spec

## n8n backend (~3 hours)

- [x] Set up Supabase schema (users, sessions, meetings, action_items)
- [x] Build & test `POST /auth/signup` (PBKDF2 hashing, session creation)
- [x] Build & test `POST /auth/login` (constant-time compare, new session)
- [x] Build & test `GET /auth/me` (session lookup with JOIN)
- [x] Build & test `POST /auth/logout` (idempotent DELETE)
- [x] Build & test `POST /debrief` (OpenAI with structured outputs)
- [x] Build & test meetings CRUD (create, list with search, get, patch, delete)
- [x] Build & test action items CRUD (create, patch with toggle done, delete, open list)
- [x] Resolve `webhookId` URL prefix quirk for `:id` paths
- [x] Resolve postgres parameter parsing bug for values containing commas (JSON payload approach)
- [x] Resolve orphan webhook conflict via DB cleanup
- [x] Verify privacy invariant (every query filters by `user_id`)

## Next.js frontend (~1 hour)

- [x] Scaffold Next.js 16 + Tailwind v4 in `web/` subfolder
- [x] Install Radix UI primitives, lucide-react, sonner, clsx
- [x] Build `lib/n8n.ts` fetcher with URL routing for `:id`-prefixed endpoints
- [x] Build `lib/session.ts` cookie helpers (async `cookies()` for Next.js 16)
- [x] Build UI primitives (Button, Input, Card, Textarea, Checkbox, Dialog, Label)
- [x] Build API proxy routes (9 endpoints) forwarding to n8n with session token
- [x] Build auth pages (split-screen design)
- [x] Build app shell (Sidebar, MobileNav, UserMenu) with auth guard
- [x] Build debrief flow (paste → AI → editable review → save)
- [x] Build meetings list with debounced search
- [x] Build meeting detail with optimistic action item toggling
- [x] Build dashboard with cross-meeting open items

## Deployment (~30 min)

- [x] Push to GitHub (public repo, no secrets)
- [x] Deploy to Vercel with `web/` as Root Directory
- [x] Verify live URL end-to-end

## Process & polish

- [x] Reject AI proposal that didn't fit (documented in README)
- [x] Maintain meaningful commit history
- [x] Update README with setup instructions + live URL
- [ ] Record 2-minute demo video
- [ ] Write 200-word reflection
