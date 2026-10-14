# LeadFlow — TODO

Task tracker for [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md). Section numbers like `§3.2` refer to the plan.
**Status:** M0–M6 complete except publishing (needs the repo owner's GitHub account) and the demo video.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · **(F1)** = evaluation-matrix item.

---

## M0 — Repo bootstrap
- [x] `git init`, default branch `main`
- [x] Root `.gitignore` (Python, Node, `.env`, `.venv`, `.next`, `__pycache__`, OS files)
- [x] `.editorconfig`, `.gitattributes` (LF line endings)
- [x] Move wireframes into `docs/wireframes/`
- [x] Commit the assignment brief, `IMPLEMENTATION_PLAN.md`, and `TODO.md`
- [x] `.env.example` with every variable from §7
- [ ] Create the public GitHub repo and push

## M1 — Backend foundation
- [x] `backend/pyproject.toml`: fastapi, uvicorn[standard], sqlalchemy 2, psycopg[binary], alembic, pydantic-settings; dev: pytest, httpx, ruff, mypy
- [x] `app/core/config.py`: `Settings` (DATABASE_URL, CORS_ORIGINS, LOG_LEVEL, SEED_ON_STARTUP)
- [x] `app/db/base.py` (naming conventions) and `app/db/session.py` (`get_db` dependency)
- [x] `app/models/enums.py`: `LeadStatus`, `DiscussionKind`
- [x] `app/models/lead.py`, `app/models/discussion.py`, plus indexes (§3.1)
- [x] Alembic init + initial migration (enums, tables, indexes)
- [x] `app/main.py`: app factory, CORS, router mounting under `/api/v1`
- [x] `GET /api/v1/health` with a DB ping (returns `503` on failure)

## M2 — Backend API
### Error handling (Q2)
- [x] `app/core/errors.py`: `AppError` base, `NotFoundError`, plus handlers that return the error envelope
- [x] Override the `RequestValidationError` handler → `422 validation_error` with field details
- [x] Catch-all `500 internal_error` handler (log the traceback, return a safe message)

### Leads
- [x] Schemas: `LeadCreate`, `LeadUpdate`, `LeadRead`, `LeadListItem`, `DiscussionPreview`
- [x] Validators: trim and blank→null; length limits; phone regex (§4.3)
- [x] `lead_service.create`: insert the lead + a "Lead created." system note in one transaction
- [x] `lead_service.list`: `status` filter, `search` (ILIKE on name), latest discussion via LATERAL / `DISTINCT ON` (no N+1)
- [x] `lead_service.update`: partial update; a status change writes a "Status changed from X to Y" system note
- [x] `POST /leads` → `201` + `Location` header **(F5)**
- [x] `GET /leads?status=&search=` → `200` **(F1, N1, N5)**
- [x] `GET /leads/{id}` → `200` / `404`
- [x] `PATCH /leads/{id}` → `200` / `404` / `422` **(F6)**

### Discussions
- [x] Schemas: `DiscussionCreate` (body, optional `follow_up_at`, not in the past), `DiscussionRead`, `DiscussionCreated` (discussion + lead)
- [x] `discussion_service.create`: insert, bump `last_activity_at`, set `next_follow_up_at` if provided **(F4)**
- [x] `GET /leads/{id}/discussions` → newest first, `404` for an unknown lead **(F3)**
- [x] `POST /leads/{id}/discussions` → `201` / `404` / `422`

### Seed (N4)
- [x] `scripts/seed.py`: 8 leads covering all 6 statuses and all 4 follow-up buckets (§6), with timestamps relative to now
- [x] Idempotent by default; `--reset` truncates and re-seeds

### Tests
- [x] `conftest.py`: test DB, per-test transaction rollback, `client` fixture
- [x] Leads: create (201, Location, default status `new`, system note), missing name (422), list filter/search, get 404, patch status persists, patch 404/422
- [x] Discussions: ordering is newest first, follow-up propagates to the lead, `last_activity_at` bumped, past follow-up → 422, unknown lead → 404
- [x] Error envelope shape asserted for 404 and 422

## M3 — Frontend: lead list
- [x] Scaffold Next.js 16 (TypeScript strict, App Router, `src/`, ESLint) + Tailwind + Prettier
- [x] Install `@tanstack/react-query`, `date-fns`, `lucide-react`, `@radix-ui/react-dialog`, `clsx`, `tailwind-merge`, `sonner` (native `<select>`/checkbox match the wireframe)
- [x] `lib/api-client.ts`: fetch wrapper, `ApiError(status, code, message, details)`
- [x] `features/leads/types.ts`, `constants.ts` (`STATUS_META` labels and colors, §5.3)
- [x] `features/leads/api.ts` + `hooks.ts` (`useLeads`)
- [x] `app/providers.tsx` (QueryClient); `layout.tsx` with fonts and metadata
- [x] UI primitives: Button, Badge, Input, Textarea, Checkbox, Dialog, Select, Spinner, EmptyState, ErrorState
- [x] `Header` (logo + "Add New Lead" button)
- [x] `StatusBadge`
- [x] `LeadCard`: name, (company), badge, "Last Note:" truncated, time ago; muted for won/lost **(F1)**
- [x] `hooks/useNow.ts` (60-second tick) and `lib/time.ts` helpers
- [x] `lib/followUps.ts`: `classifyFollowUp`, `partitionLeads` + Vitest tests (midnight and timezone edges)
- [x] `FollowUpTag`: today (blue 🔔), overdue (**red**), upcoming (neutral) **(N2)**
- [x] `LeadSection` ×2: "📌 Today's Follow-ups" (overdue + today) and "All Leads" **(F2)**
- [x] `StatusFilter` chips: All + all 6 statuses, synced to `?status=` **(N5)**
- [x] `SearchInput`: debounced 250 ms, synced to `?q=` **(N1)**
- [x] Loading skeletons, empty state, error state with retry

## M4 — Frontend: dialogs
### Add lead (F5)
- [x] `AddLeadDialog`: Full Name*, Company (Optional), Phone (Optional); Cancel / Save Lead
- [x] Client validation (name required); show server 422 field errors inline
- [x] `useCreateLead` → invalidate `['leads']`, close the dialog, reset the form

### Timeline (F3, F4, F6)
- [x] `LeadTimelineDialog` opened via a card click; `?lead=<id>` deep link
- [x] Header: name, (company), 📞 phone, `StatusSelect`, close button
- [x] `Timeline` + `TimelineItem`: rail with dots (newest blue), `MMM d, h:mm a (x ago)`, 📅 follow-up chip, italic system entries
- [x] `useDiscussions(id)` with a loading skeleton
- [x] `DiscussionForm`: textarea, "Set Follow-up" checkbox toggling date and time inputs, Save Note; ⌘/Ctrl + Enter submits
- [x] Combine local date + time → ISO with offset; validate it is not in the past on the client
- [x] `useCreateDiscussion`: write the returned lead into the list cache and prepend to the timeline, then invalidate **(F4)**
- [x] `useUpdateLeadStatus`: optimistic update + rollback on error; invalidate leads and discussions **(F6)**
- [x] Error toasts for failed mutations

### Accessibility pass
- [x] Cards are keyboard-activatable buttons with `aria-label`
- [x] Focus returns to the trigger when a dialog closes
- [x] Labels and `aria-describedby` on every input; status never conveyed by color alone

## M5 — Packaging (N3)
- [x] `backend/Dockerfile` (python:3.12-slim, non-root) + `entrypoint.sh` (wait for db → migrate → seed → uvicorn)
- [x] `frontend/Dockerfile` (multi-stage, `output: "standalone"`, `NEXT_PUBLIC_API_URL` build arg)
- [x] `.dockerignore` for both
- [x] `docker-compose.yml`: db (healthcheck, volume), api (healthcheck), web
- [x] Verify `docker compose up --build` from a fresh clone

## M6 — Quality & delivery
- [x] GitHub Actions: backend (ruff, mypy, alembic, pytest with a Postgres service) and frontend (lint, tsc, vitest, build)
- [x] Manual E2E walkthrough (below) passes
- [x] Screenshots: list, filters/search, timeline (`docs/screenshots/`)
- [ ] Short demo video / GIF of the full flow
- [x] `README.md` (sections listed in §10 of the plan)
- [x] Final review: no secrets committed, `.env.example` complete, CI green
- [ ] Push to the public GitHub repo; verify the README renders

---

## Manual E2E checklist (before recording)
- [x] Fresh `docker compose up --build` → seeded list renders at `localhost:3000`
- [x] Each card shows name, company, status badge, last note, and time ago **(F1)**
- [x] Today's follow-ups are pinned at the top; overdue leads are in red **(F2, N2)**
- [x] Every status filter chip works; "All" resets **(N5)**
- [x] Searching "sar" finds Sarah Connor; search combines with a status filter **(N1)**
- [x] Add a lead with name only → appears with status `New` and a "Lead created." note **(F5)**
- [x] Add a lead with an empty name → blocked with an inline error
- [x] Open a timeline → newest discussion first **(F3)**
- [x] Add a note with a follow-up for today → the lead moves to the pinned section without a reload **(F4)**
- [x] Change the status in the dialog → badge updates; still correct after a page refresh **(F6)**
- [x] `?lead=<id>` deep link opens the dialog; Esc closes it and the URL clears
- [x] Stop the API → the UI shows an error state, not a blank screen

## Stretch (only if time remains)
- [x] Optional login (JWT in httpOnly cookie) with a seeded demo user (see M7)
- [ ] Playwright E2E in CI
- [ ] Edit or delete discussions

## M7 — Authentication (optional in the brief)
- [x] `users` table + migration; Argon2 hashing (pwdlib); JWT (PyJWT), secret >= 32 chars
- [x] `POST /auth/login` (httpOnly SameSite=Lax cookie + token), `POST /auth/logout`, `GET /auth/me`
- [x] All lead/discussion endpoints require a session (cookie or Bearer); `/health` public
- [x] Constant-time failed login; same 401 for unknown email, wrong password, inactive user
- [x] Seed creates demo user; `scripts/create_user.py` CLI
- [x] Auth tests (21) and existing tests run through the real login flow
- [x] `/login` page, `AuthGate`, user menu + sign-out, global 401 → `/login?next=…` (sanitised)
- [x] Compose / `.env.example` / README updated
- [ ] Per-rep lead ownership, sign-up, password reset, login rate limiting
