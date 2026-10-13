# LeadFlow

A single-screen lead management tool: a lightweight CRM where a sales rep tracks leads, logs
every discussion, and sets follow-up reminders.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS · TanStack Query — FastAPI ·
SQLAlchemy 2 · Alembic · PostgreSQL 16 — Docker Compose · GitHub Actions

![Lead list with pinned follow-ups](docs/screenshots/lead-list.png)

| Lead timeline | Filters + search |
| --- | --- |
| ![Lead timeline dialog](docs/screenshots/lead-timeline.png) | ![Status filter and search](docs/screenshots/filters-and-search.png) |

---

## Contents

- [Features](#features)
- [Quick start (Docker)](#quick-start-docker)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [API](#api)
- [Testing & quality](#testing--quality)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)
- [Future improvements](#future-improvements)

## Features

**Lead list**
- Each card shows name, company, a colour-coded **status badge**, the **last note**, and **time since** it was logged.
- **📌 Today's follow-ups are pinned** at the top. **Overdue follow-ups are highlighted in red** and pinned too, so nothing slips.
- **Filter by status** (All / New / Contacted / Qualified / Proposal Sent / Won / Lost) and **search by name** (debounced, case-insensitive).
- Filters live in the URL (`?status=qualified&q=sar`), so they survive a refresh and can be shared.
- Won / Lost leads are visually muted. Relative times refresh every minute without reloading.

**Lead timeline dialog** (opens over the list; deep-linkable with `?lead=<id>`)
- Full discussion history in **reverse chronological order**, on a timeline rail.
- Form at the bottom to **log a new discussion** with an **optional follow-up date & time**.
  `Ctrl/⌘ + Enter` saves.
- Saving a note with a follow-up **updates the lead's follow-up and moves the card in the list immediately**.
- **Change status** from the dialog. The update is optimistic, persists to the API, and rolls back on error.
- When a follow-up is due, a pre-ticked **"Mark the current follow-up as done"** option clears it as you log the call.
- System entries ("Lead created.", "Status changed from New to Contacted.") give an audit trail.

**Add new lead:** name is required; company and phone are optional; status defaults to **New**.
Validation runs on the client and the server, and field errors from the API show inline.

## Quick start (Docker)

Requires Docker with Compose v2.

```bash
git clone <repo-url> leadflow && cd leadflow
cp .env.example .env        # optional: every variable has a default
docker compose up --build
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | `localhost:5432` (user / password / db: `leadflow`) |

On startup the API container applies migrations and **seeds 8 demo leads** (when the database is
empty). The seed covers every status and every follow-up state: due today, overdue, upcoming,
and none.

> **Tip:** set `SEED_TIMEZONE` in `.env` to your timezone (e.g. `Asia/Kolkata`) so the demo's
> "due today" follow-ups land before *your* midnight. To re-seed with fresh, relative timestamps:
> `docker compose exec api python -m scripts.seed --reset`
>
> To start over completely: `docker compose down -v`.

## Local development

Prerequisites: **Python 3.12+** with [uv](https://docs.astral.sh/uv/), **Node.js 20.9+**, and
PostgreSQL 16 (or just the `db` service from Compose).

```bash
# 1. Database
docker compose up -d db

# 2. API  →  http://localhost:8000
cd backend
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed          # add --reset to wipe and re-seed
uv run uvicorn app.main:app --reload

# 3. Web  →  http://localhost:3000   (in another terminal)
cd frontend
npm install
cp .env.example .env.local             # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

The API reads configuration from environment variables or a `.env` file in `backend/` or the
repository root.

## Environment variables

All variables are listed in [`.env.example`](.env.example).

| Variable | Default | Used by | Description |
| --- | --- | --- | --- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `leadflow` | db, api | Database credentials |
| `POSTGRES_PORT` | `5432` | compose | Host port for PostgreSQL |
| `DATABASE_URL` | `postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow` | api | SQLAlchemy URL (Compose points it at the `db` service) |
| `CORS_ORIGINS` | `http://localhost:3000` | api | Comma-separated allowed browser origins |
| `API_PORT` | `8000` | compose | Host port for the API |
| `LOG_LEVEL` | `info` | api | Python log level |
| `SEED_ON_STARTUP` | `true` | api (Docker) | Seed demo data on start if the DB has no leads |
| `SEED_TIMEZONE` | `UTC` | seed | IANA timezone that defines "today" for demo follow-ups |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | web | API URL as seen by the **browser**, inlined at build time (Docker build arg) |
| `WEB_PORT` | `3000` | compose | Host port for the web app |
| `TEST_DATABASE_URL` | `<DATABASE_URL db>_test` | tests | Optional override for the test database |

## API

Base path: `/api/v1`. Interactive docs at [`/docs`](http://localhost:8000/docs).

| Method | Path | Description | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Liveness + database check | `200` | `503` |
| `GET` | `/leads?status=&search=` | List leads (with latest note), most recent activity first | `200` | `422` |
| `POST` | `/leads` | Create a lead | `201` + `Location` | `422` |
| `GET` | `/leads/{id}` | Get a lead | `200` | `404` |
| `PATCH` | `/leads/{id}` | Partial update (e.g. status) | `200` | `404`, `422` |
| `GET` | `/leads/{id}/discussions` | Timeline, newest first | `200` | `404` |
| `POST` | `/leads/{id}/discussions` | Log a discussion (`body`, optional `follow_up_at`, `clear_follow_up`) | `201` | `404`, `422` |

Every error uses one envelope:

```json
{ "error": { "code": "lead_not_found", "message": "Lead 42 does not exist.", "details": null } }
```

Validation failures return `422` with `details: [{ "field", "message", "type" }]`. Malformed JSON
returns `400`, unknown routes `404`, wrong methods `405`, and an unreachable database `503`.
Unexpected errors return `500` and are logged server-side without leaking internals.

## Testing & quality

```bash
# Backend: 44 tests against a real PostgreSQL test database (created automatically)
cd backend
uv run pytest
uv run ruff check . && uv run ruff format --check . && uv run mypy app scripts tests

# Frontend: unit tests run in Asia/Kolkata (UTC+05:30) to exercise local-midnight edge cases
cd frontend
npm test
npm run lint && npm run typecheck && npm run format:check
```

[GitHub Actions](.github/workflows/ci.yml) runs all of the above on every push and pull request.
CI also checks that migrations roll back cleanly and that both Docker images build.

## Project structure

```
.
├── backend/                     FastAPI service
│   ├── app/
│   │   ├── api/v1/              HTTP layer: routers only (health, leads, discussions)
│   │   ├── core/                settings, error types + JSON error envelope handlers
│   │   ├── db/                  engine/session, declarative base
│   │   ├── models/              SQLAlchemy models (Lead, Discussion, enums)
│   │   ├── schemas/             Pydantic request/response models
│   │   └── services/            business rules + transactions
│   ├── alembic/                 migrations
│   ├── scripts/seed.py          idempotent demo data
│   └── tests/                   pytest suite (transactional fixtures)
├── frontend/                    Next.js app
│   └── src/
│       ├── app/                 layout, page (single screen), global styles
│       ├── components/ui/       reusable primitives (Button, Dialog, Field, states…)
│       ├── features/leads/      feature module
│       │   ├── components/      LeadBoard, LeadCard, StatusFilter, AddLeadDialog, timeline/…
│       │   ├── lib/follow-ups   pure follow-up classification (unit tested)
│       │   ├── api.ts           typed API calls
│       │   └── queries.ts       TanStack Query hooks + cache updates
│       ├── hooks/               useNow, useDebouncedValue
│       └── lib/                 API client, time formatting, cn()
├── docs/                        assignment brief, wireframes, screenshots
├── docker-compose.yml
├── IMPLEMENTATION_PLAN.md       design document
└── TODO.md                      task tracker
```

## Design decisions

The full rationale is in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). The key choices:

- **Times are stored in UTC and classified in the browser's local timezone.** "Today" and
  "overdue" are decided client-side with the user's clock, so a follow-up at 11:30 PM IST is
  "today" for that user even though it is tomorrow in UTC.
- **Overdue follow-ups are pinned with today's.** The brief pins today's follow-ups and asks for
  overdue ones in red. Pinning overdue ones too keeps missed follow-ups from being buried.
- **One lead appears in exactly one section.** This matches the wireframe.
- **"Last note" prefers rep notes over system entries.** A status change doesn't hide the latest
  real conversation.
- **Logging a note never silently drops a follow-up.** A note with a date reschedules the
  follow-up. "Mark as done" clears it explicitly. Any other note leaves it unchanged.
- **The list updates instantly.** `POST /discussions` returns the updated lead, which is written
  straight into every cached list, then revalidated in the background.
- **No N+1 queries.** The list endpoint fetches each lead's latest discussion with a single
  `LATERAL` join.
- **Login is not implemented.** The brief marks it optional, so it's listed under future
  improvements below.

## Future improvements

- Authentication (JWT) and per-rep lead ownership
- Pagination / infinite scroll and full-text search across notes
- Editing and deleting discussions; editing lead details from the dialog
- Browser or email notifications for due follow-ups
- Playwright end-to-end tests in CI
