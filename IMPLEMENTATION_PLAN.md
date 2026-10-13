# LeadFlow — Implementation Plan

> A single-screen lead management tool (lightweight CRM) where a sales rep tracks leads,
> logs every discussion, and sets follow-up reminders.

| | |
|---|---|
| **Status** | In progress |
| **Source brief** | [`docs/ASSIGNMENT.md`](docs/ASSIGNMENT.md) |
| **Wireframes** | [`landing-page`](docs/wireframes/landing-page.png) · [`add-lead`](docs/wireframes/add-lead.png) · [`lead-timeline`](docs/wireframes/lead-timeline.png) |
| **Task tracker** | [`TODO.md`](TODO.md) |

---

## 1. Goals & Scope

### 1.1 In scope (graded)
| # | Requirement | Where it lives |
|---|---|---|
| F1 | Lead list shows name, company, status badge, last note, time since last discussion | `LeadCard` + `GET /leads` |
| F2 | Today's follow-ups pinned at the top | `partitionLeads()` on the client |
| F3 | Timeline dialog lists discussions newest first | `LeadTimelineDialog` + `GET /leads/{id}/discussions` |
| F4 | Adding a discussion (with an optional follow-up) updates the list immediately | `POST /leads/{id}/discussions` + query invalidation |
| F5 | Add a new lead (name required; company and phone optional; status defaults to `New`) | `AddLeadDialog` + `POST /leads` |
| F6 | Status update from the dialog persists | `PATCH /leads/{id}` |
| N1 | Search leads by name | `?search=` (server-side, debounced) |
| N2 | Overdue follow-ups highlighted in red | `classifyFollowUp()` → `FollowUpTag` |
| N3 | Docker Compose setup | `docker-compose.yml` (db + api + web) |
| N4 | Seed script with ≥ 5 leads and their discussions | `backend/scripts/seed.py` |
| N5 | Status filters (all 6 statuses) | `StatusFilter` + `?status=` |
| Q1 | Clean frontend component structure | feature-folder layout (§5) |
| Q2 | Correct API status codes, clean error handling | error envelope + handlers (§4.4) |
| D1 | README with working setup steps, `.env.example`, screenshots/video | repo root |
| D2 | Meaningful git commit history | Conventional Commits, one feature per commit (§9) |

### 1.2 Out of scope (stretch only if time permits)
- Authentication / login (the brief marks it optional).
- Multi-user ownership, pagination, editing or deleting notes, notifications.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript (strict)** | Preferred by the brief; type safety end to end |
| Styling | **Tailwind CSS** + **Radix UI** primitives (Dialog, Select, Checkbox) | Accessible dialogs (focus trap, Esc, ARIA) without heavy UI kits |
| Server state | **TanStack Query v5** | Caching, invalidation, and optimistic updates → "reflects immediately" |
| Dates | **date-fns** | Tree-shakeable; `formatDistanceToNowStrict`, `isToday` |
| Icons | **lucide-react** | Matches the wireframe's line icons |
| Backend | **FastAPI** + **Pydantic v2** + **pydantic-settings** | Preferred by the brief; typed validation |
| ORM / migrations | **SQLAlchemy 2.0** (typed ORM) + **Alembic** | Versioned schema; production-grade |
| Database | **PostgreSQL 16** | Native enums, `timestamptz`, `ILIKE`; same DB in dev, test, and Docker |
| Testing | **pytest** + FastAPI `TestClient`; **Vitest** for frontend pure logic | Covers status codes and follow-up bucketing |
| Quality | **ruff** (lint + format), **mypy** (backend); **ESLint** + **Prettier** + `tsc --noEmit` (frontend) | Consistent, reviewable code |
| CI | **GitHub Actions** | Lint, type-check, test, and build on every push |
| Packaging | **Docker** multi-stage images + **Docker Compose** | One-command run |

---

## 3. Domain Model

### 3.1 Entities

```
┌──────────────────────────────┐        ┌──────────────────────────────────┐
│ leads                        │ 1    * │ discussions                      │
├──────────────────────────────┤────────├──────────────────────────────────┤
│ id              SERIAL PK    │        │ id            SERIAL PK          │
│ name            VARCHAR(120) │        │ lead_id       FK → leads.id      │
│ company         VARCHAR(120)?│        │               ON DELETE CASCADE  │
│ phone           VARCHAR(40)? │        │ body          TEXT  NOT NULL     │
│ status          lead_status  │        │ kind          discussion_kind    │
│ next_follow_up_at TIMESTAMPTZ?│       │               ('note'|'system')  │
│ last_activity_at  TIMESTAMPTZ │       │ follow_up_at  TIMESTAMPTZ?       │
│ created_at      TIMESTAMPTZ  │        │ created_at    TIMESTAMPTZ        │
│ updated_at      TIMESTAMPTZ  │        └──────────────────────────────────┘
└──────────────────────────────┘
lead_status = new | contacted | qualified | proposal_sent | won | lost
```

**Indexes:** `discussions (lead_id, created_at DESC)`, `leads (next_follow_up_at)`, `leads (status)`, `leads (lower(name))`.

### 3.2 Business rules (decisions on ambiguities in the brief)
1. **Timestamps** are stored in UTC (`timestamptz`) and rendered in the browser's local timezone. "Today" therefore means *the user's* today.
2. **Creating a lead** also inserts a `system` discussion ("Lead created."), so the timeline is never empty. This matches the italic first entry in the wireframe.
3. **Adding a note with a follow-up** sets `lead.next_follow_up_at = follow_up_at`. A note *without* a follow-up leaves any existing follow-up unchanged.
4. **Adding any discussion** bumps `lead.last_activity_at`, which drives the "time ago" text and the default sort order.
5. **Changing status** writes a `system` discussion ("Status changed from Contacted to Qualified"), giving an audit trail in the timeline.
6. **Follow-up validation:** `follow_up_at` must not be in the past (60-second tolerance for clock skew). Otherwise the API returns `422`.
7. **"Last note"** is the most recent discussion of kind `note`. If there is none, the list falls back to the most recent `system` entry.

### 3.3 Follow-up classification (client-side, local time)
| Bucket | Condition | Visual |
|---|---|---|
| `overdue` | `next_follow_up_at < now` | Red card border + red "Overdue · 2 days ago" tag |
| `today` | same local calendar day as now, and `≥ now` | Blue card + "🔔 Follow-up today at 2:00 PM" |
| `upcoming` | after today | Neutral "Follow-up May 12, 10:00 AM" tag |
| `none` | no follow-up | — |

**List layout:**
- **📌 Today's Follow-ups**: overdue leads (oldest first) followed by today's leads (soonest first).
- **All Leads**: every other lead, sorted by `last_activity_at DESC`.
- A lead appears in only one section, as in the wireframe.
- Status filters and search apply to both sections.
- `won` and `lost` leads are visually muted, like Bruce Wayne in the wireframe.
- A `useNow()` hook re-renders every 60 seconds, so "time ago" values and buckets stay accurate without a page reload.

> Overdue leads are pinned (not just colored red) because a rep should never lose track of a missed follow-up. This is a deliberate extension of "Today's follow-ups pinned" and will be documented in the README.

---

## 4. Backend Design (FastAPI)

### 4.1 Project layout
```
backend/
├── app/
│   ├── main.py                 # app factory: CORS, exception handlers, routers
│   ├── core/
│   │   ├── config.py           # pydantic-settings (env-driven)
│   │   └── errors.py           # AppError hierarchy + handlers → error envelope
│   ├── db/
│   │   ├── base.py             # DeclarativeBase, naming conventions
│   │   └── session.py          # engine, SessionLocal, get_db dependency
│   ├── models/                 # SQLAlchemy ORM: lead.py, discussion.py, enums.py
│   ├── schemas/                # Pydantic DTOs: lead.py, discussion.py, common.py
│   ├── services/               # business rules: lead_service.py, discussion_service.py
│   └── api/v1/
│       ├── router.py           # mounts sub-routers under /api/v1
│       ├── health.py
│       ├── leads.py
│       └── discussions.py
├── alembic/                    # migrations
├── scripts/seed.py             # idempotent seed (--reset)
├── tests/                      # conftest (transactional fixtures), test_leads, test_discussions
├── pyproject.toml
├── Dockerfile
└── entrypoint.sh               # wait for db → alembic upgrade head → optional seed → uvicorn
```

**Layering:** routers handle only HTTP concerns (parse, call a service, map the result to a response). Services own business rules and transactions. Models know nothing about HTTP.

### 4.2 REST API (`/api/v1`)

| Method | Path | Purpose | Success | Errors |
|---|---|---|---|---|
| `GET` | `/health` | Liveness and DB check | `200` | `503` if the DB is unreachable |
| `GET` | `/leads?status=&search=` | List leads with last discussion and follow-up | `200` | `422` invalid status |
| `POST` | `/leads` | Create a lead (+ system note) | `201` + `Location` header | `422` |
| `GET` | `/leads/{id}` | Lead detail | `200` | `404` |
| `PATCH` | `/leads/{id}` | Partial update (status, name, company, phone) | `200` | `404`, `422` |
| `GET` | `/leads/{id}/discussions` | Timeline, newest first | `200` | `404` |
| `POST` | `/leads/{id}/discussions` | Add a note (+ optional follow-up) | `201` | `404`, `422` |

**`LeadListItem` response shape**
```json
{
  "id": 1,
  "name": "Sarah Connor",
  "company": "Acme Corp",
  "phone": "555-0199",
  "status": "proposal_sent",
  "next_follow_up_at": "2026-10-13T14:00:00Z",
  "last_activity_at": "2026-10-11T10:30:00Z",
  "last_discussion": { "body": "Sent pricing tier PDF…", "created_at": "2026-10-11T10:30:00Z" },
  "created_at": "2026-10-08T16:00:00Z"
}
```

**`POST /leads/{id}/discussions` request**
```json
{ "body": "Called, they want a demo.", "follow_up_at": "2026-10-15T09:30:00+05:30" }
```
The response returns the created discussion **and** the updated lead, so the client can update the cache without a second round trip.

**Query efficiency:** the list endpoint fetches each lead's latest discussion with a single `LATERAL` subquery (or `DISTINCT ON`), which avoids N+1 queries.

### 4.3 Validation
- `name`: trimmed, 1–120 characters, required.
- `company`: optional, ≤ 120 characters; blank becomes `null`.
- `phone`: optional, ≤ 40 characters, pattern `^[0-9+()\-\s.]{3,40}$`.
- `body`: trimmed, 1–5000 characters.
- `follow_up_at`: timezone-aware datetime that is not in the past.
- `status`: one of the six enum values.

### 4.4 Error handling
All errors share one envelope:
```json
{ "error": { "code": "lead_not_found", "message": "Lead 42 does not exist.", "details": null } }
```
| Situation | Status | `code` |
|---|---|---|
| Pydantic validation failure | `422` | `validation_error` (`details` = field errors) |
| Unknown lead | `404` | `lead_not_found` |
| Malformed JSON | `400` | `bad_request` |
| DB unavailable | `503` | `service_unavailable` |
| Unhandled exception | `500` | `internal_error` (logged with traceback, never leaked to the client) |

### 4.5 Configuration
All configuration is read from environment variables via `pydantic-settings`. There are no hard-coded secrets. See §7.

---

## 5. Frontend Design (Next.js)

### 5.1 Project layout (feature-first)
```
frontend/src/
├── app/
│   ├── layout.tsx              # fonts, <Providers>, header shell
│   ├── page.tsx                # LeadsPage (the single screen)
│   ├── providers.tsx           # QueryClientProvider
│   └── globals.css
├── components/ui/              # dumb, reusable primitives
│   ├── Button.tsx  Badge.tsx  Input.tsx  Textarea.tsx  Checkbox.tsx
│   ├── Dialog.tsx  Select.tsx  Spinner.tsx  EmptyState.tsx  ErrorState.tsx
├── features/leads/
│   ├── api.ts                  # typed fetchers (listLeads, createLead, …)
│   ├── hooks.ts                # useLeads, useCreateLead, useUpdateLeadStatus, useDiscussions, useCreateDiscussion
│   ├── types.ts                # Lead, Discussion, LeadStatus (mirror the API)
│   ├── constants.ts            # STATUS_META: label + badge colors per status
│   ├── lib/followUps.ts        # classifyFollowUp(), partitionLeads()  ← unit tested
│   └── components/
│       ├── Header.tsx          # logo + "Add New Lead"
│       ├── Toolbar.tsx         # StatusFilter + SearchInput
│       ├── StatusFilter.tsx    StatusBadge.tsx    SearchInput.tsx
│       ├── LeadSection.tsx     # titled list (Today's Follow-ups / All Leads)
│       ├── LeadCard.tsx        FollowUpTag.tsx
│       ├── AddLeadDialog.tsx
│       └── timeline/
│           ├── LeadTimelineDialog.tsx   # header + status select + timeline + form
│           ├── StatusSelect.tsx
│           ├── Timeline.tsx  TimelineItem.tsx
│           └── DiscussionForm.tsx       # textarea + "Set follow-up" + date/time
├── lib/
│   ├── api-client.ts           # fetch wrapper → throws ApiError(status, code, message)
│   └── time.ts                 # formatRelative, formatDateTime, toUtcIso(date, time)
└── hooks/
    ├── useNow.ts               # ticking clock (60 s)
    └── useDebouncedValue.ts
```

### 5.2 State and data flow
- **URL is the source of truth** for UI filters: `?status=qualified&q=sar&lead=12`. Filters can be shared, survive a refresh, and `?lead=12` deep-links straight into the open timeline dialog.
- **Query keys:** `['leads', { status, search }]`, `['lead', id]`, `['discussions', id]`.
- **Mutations:**
  - `createLead` → invalidate `['leads']`.
  - `updateLeadStatus` → **optimistic** update of the cached lead and list item, rolled back on error, then invalidate `['leads']` and `['discussions', id]` (the latter because of the system note).
  - `createDiscussion` → write the returned lead into the list cache and prepend the discussion to the timeline cache immediately, then invalidate in the background. This is how F4 is met.
- **UX states:** skeleton loaders, empty states ("No leads match 'xyz'"), inline field errors from `422 details`, and toast messages for network failures.

### 5.3 Visual spec (from the wireframes)
| Status | Badge |
|---|---|
| New | green-50 bg / green-700 text |
| Contacted | amber-50 / amber-700 |
| Qualified | blue-50 / blue-700 |
| Proposal Sent | purple-50 / purple-700 |
| Won | gray-100 / gray-600, card muted |
| Lost | red-50 / red-700, card muted |

- Container `max-w-4xl`, page background `gray-50`, white cards with a `gray-200` border and `rounded-lg`, primary color `blue-600`.
- **Timeline:** a vertical rail with dots. The newest dot is blue and the rest are gray. Each entry shows `MMM d, h:mm a (x ago)`. A note that set a follow-up shows a 📅 "Follow-up set for: …" chip. `system` entries are shown in italics.
- **Discussion form:** "Set Follow-up" checkbox. The date and time inputs are enabled only when it is checked. "Save Note" is disabled while the note is empty or a save is pending. ⌘/Ctrl + Enter submits.

### 5.4 Accessibility
- Dialogs use Radix: focus trap, `Esc` closes, focus returns to the trigger.
- Lead cards are `<button>`s (keyboard-activatable) and have descriptive `aria-label`s.
- Status is never conveyed by color alone: there is always a text label, and overdue items say "Overdue".
- Every form input has a `<label>`. Errors are linked with `aria-describedby`.

---

## 6. Seed Data
`python -m scripts.seed [--reset]` is idempotent: it skips if leads exist unless `--reset` is passed. All timestamps are **relative to the time it runs**, so the demo always shows realistic "today" and "overdue" states.

| Lead | Company | Status | Follow-up | # Discussions |
|---|---|---|---|---|
| Sarah Connor | Acme Corp | Proposal Sent | **today**, a few hours ahead | 3 |
| Peter Gibbons | Initrode | Qualified | **overdue** (yesterday) | 3 |
| Hank Scorpio | Globex | New | — | 1 |
| Bill Lumbergh | Initech | Contacted | upcoming (+3 days) | 2 |
| Tony Stark | Stark Industries | Qualified | **today**, later | 4 |
| Bruce Wayne | Wayne Ent | Won | — | 4 |
| Gavin Belson | Hooli | Lost | — | 2 |
| Monty Burns | Burns Power | Contacted | **overdue** (3 days ago) | 2 |

This covers all six statuses and all four follow-up buckets.

---

## 7. Configuration & Environment

`.env.example` (copied to `.env`):
```dotenv
# ─── Database ──────────────────────────────
POSTGRES_USER=leadflow
POSTGRES_PASSWORD=leadflow
POSTGRES_DB=leadflow
POSTGRES_PORT=5432

# ─── Backend (FastAPI) ─────────────────────
DATABASE_URL=postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow
CORS_ORIGINS=http://localhost:3000
API_PORT=8000
LOG_LEVEL=info
SEED_ON_STARTUP=true

# ─── Frontend (Next.js) ────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
WEB_PORT=3000
```

---

## 8. Infrastructure

### 8.1 Docker Compose
| Service | Image | Notes |
|---|---|---|
| `db` | `postgres:16-alpine` | named volume; `pg_isready` healthcheck |
| `api` | `backend/Dockerfile` (python:3.12-slim, non-root user) | `depends_on: db (healthy)`; entrypoint runs migrations, then the seed, then uvicorn; `/api/v1/health` healthcheck |
| `web` | `frontend/Dockerfile` (multi-stage, `output: "standalone"`, node:20-alpine) | `NEXT_PUBLIC_API_URL` passed as a **build arg** (Next inlines it at build time) |

`docker compose up --build` starts the full app at http://localhost:3000, with the API docs at http://localhost:8000/docs.

### 8.2 CI (GitHub Actions)
- **backend job:** Postgres service container → `ruff check`, `ruff format --check`, `mypy`, `alembic upgrade head`, `pytest`.
- **frontend job:** `npm ci` → `lint`, `tsc --noEmit`, `vitest run`, `next build`.

---

## 9. Testing Strategy

| Layer | What | Tool |
|---|---|---|
| API | Each endpoint's happy path plus 404/422 cases; envelope shape; `Location` header | pytest + TestClient |
| Services | Follow-up propagation, `last_activity_at` bump, status-change system note, past follow-up rejected, ordering of discussions | pytest |
| DB | Each test runs in a transaction that is rolled back (fast, isolated) | pytest fixtures |
| Frontend logic | `classifyFollowUp` / `partitionLeads` across timezone and midnight edges | Vitest |
| Manual E2E | Scripted walkthrough of F1–F6 and N1–N5 before recording the demo | checklist in TODO.md |

---

## 10. Delivery & Git Workflow

- **Branching:** `main` is always green. Each milestone is built on a short-lived `feat/*` branch and squash- or rebase-merged.
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/), small and focused:
  ```
  chore: initialize monorepo with editorconfig, gitignore, and docs
  feat(api): add SQLAlchemy models and initial Alembic migration
  feat(api): implement leads CRUD endpoints with error envelope
  feat(api): add discussions endpoints with follow-up propagation
  test(api): cover leads and discussions endpoints
  feat(api): add idempotent seed script
  chore(web): scaffold Next.js app with Tailwind and TanStack Query
  feat(web): render lead list with status badges and relative time
  feat(web): pin today's and overdue follow-ups
  feat(web): add status filters and debounced name search
  feat(web): add new-lead dialog
  feat(web): add lead timeline dialog with discussion form
  feat(web): update lead status from timeline dialog
  build: add Dockerfiles and docker-compose
  ci: add GitHub Actions for backend and frontend
  docs: write README with setup steps and screenshots
  ```
- **README sections:** overview and screenshots/GIF · features · tech stack · quick start (Docker) · local dev (without Docker) · environment variables · API reference (links to `/docs`) · design decisions and assumptions (§3.2) · testing · project structure · future improvements.

---

## 11. Milestones

| # | Milestone | Exit criteria |
|---|---|---|
| M0 | Repo bootstrap | git initialized, tooling configs, docs committed |
| M1 | Backend foundation | models, migration, config, `/health` green |
| M2 | Backend API complete | all endpoints implemented and tested; seed works |
| M3 | Frontend list | list, badges, time ago, pinned follow-ups, filters, search |
| M4 | Frontend dialogs | add lead, timeline, discussion form, status update |
| M5 | Packaging | `docker compose up` works from a clean clone |
| M6 | Polish & delivery | CI green, README, screenshots/video, public GitHub repo |

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Timezone bugs ("today" off by one near midnight) | Store UTC, classify on the client in local time, unit-test edge cases |
| `NEXT_PUBLIC_*` baked at build time inside Docker | Pass it as a build arg in Compose and document this |
| API starts before Postgres is ready | Compose healthcheck + `depends_on: condition: service_healthy` + a retry in the entrypoint |
| List out of sync after a mutation | Server returns the updated lead; cache is written directly, then invalidated |
| Seed data goes stale ("today" becomes yesterday) | Timestamps are relative to seed time; `--reset` re-seeds |

---

## 13. Future Improvements (README "Next steps")
- JWT authentication and per-rep lead ownership.
- Pagination or infinite scroll, and full-text search over notes.
- Edit and delete discussions; lead edit and archive.
- Browser notifications or email for due follow-ups.
- Playwright E2E tests in CI.
