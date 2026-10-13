# LeadFlow — TODO

Task tracker for [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md). Section numbers like `§3.2` refer to the plan.
Legend: `[ ]` todo · `[~]` in progress · `[x]` done · **(F1)** = evaluation-matrix item.

---

## M0 — Repo bootstrap
- [ ] `git init`, default branch `main`
- [ ] Root `.gitignore` (Python, Node, `.env`, `.venv`, `.next`, `__pycache__`, OS files)
- [ ] `.editorconfig`, `.gitattributes` (LF line endings)
- [ ] Move wireframes into `docs/wireframes/`
- [ ] Commit the assignment brief, `IMPLEMENTATION_PLAN.md`, and `TODO.md`
- [ ] `.env.example` with every variable from §7
- [ ] Create the public GitHub repo and push

## M1 — Backend foundation
- [ ] `backend/pyproject.toml`: fastapi, uvicorn[standard], sqlalchemy 2, psycopg[binary], alembic, pydantic-settings; dev: pytest, httpx, ruff, mypy
- [ ] `app/core/config.py`: `Settings` (DATABASE_URL, CORS_ORIGINS, LOG_LEVEL, SEED_ON_STARTUP)
- [ ] `app/db/base.py` (naming conventions) and `app/db/session.py` (`get_db` dependency)
- [ ] `app/models/enums.py`: `LeadStatus`, `DiscussionKind`
- [ ] `app/models/lead.py`, `app/models/discussion.py`, plus indexes (§3.1)
- [ ] Alembic init + initial migration (enums, tables, indexes)
- [ ] `app/main.py`: app factory, CORS, router mounting under `/api/v1`
- [ ] `GET /api/v1/health` with a DB ping (returns `503` on failure)

## M2 — Backend API
### Error handling (Q2)
- [ ] `app/core/errors.py`: `AppError` base, `NotFoundError`, plus handlers that return the error envelope
- [ ] Override the `RequestValidationError` handler → `422 validation_error` with field details
- [ ] Catch-all `500 internal_error` handler (log the traceback, return a safe message)

### Leads
- [ ] Schemas: `LeadCreate`, `LeadUpdate`, `LeadRead`, `LeadListItem`, `DiscussionPreview`
- [ ] Validators: trim and blank→null; length limits; phone regex (§4.3)
- [ ] `lead_service.create`: insert the lead + a "Lead created." system note in one transaction
- [ ] `lead_service.list`: `status` filter, `search` (ILIKE on name), latest discussion via LATERAL / `DISTINCT ON` (no N+1)
- [ ] `lead_service.update`: partial update; a status change writes a "Status changed from X to Y" system note
- [ ] `POST /leads` → `201` + `Location` header **(F5)**
- [ ] `GET /leads?status=&search=` → `200` **(F1, N1, N5)**
- [ ] `GET /leads/{id}` → `200` / `404`
- [ ] `PATCH /leads/{id}` → `200` / `404` / `422` **(F6)**

### Discussions
- [ ] Schemas: `DiscussionCreate` (body, optional `follow_up_at`, not in the past), `DiscussionRead`, `DiscussionCreated` (discussion + lead)
- [ ] `discussion_service.create`: insert, bump `last_activity_at`, set `next_follow_up_at` if provided **(F4)**
- [ ] `GET /leads/{id}/discussions` → newest first, `404` for an unknown lead **(F3)**
- [ ] `POST /leads/{id}/discussions` → `201` / `404` / `422`

### Seed (N4)
- [ ] `scripts/seed.py`: 8 leads covering all 6 statuses and all 4 follow-up buckets (§6), with timestamps relative to now
- [ ] Idempotent by default; `--reset` truncates and re-seeds

### Tests
- [ ] `conftest.py`: test DB, per-test transaction rollback, `client` fixture
- [ ] Leads: create (201, Location, default status `new`, system note), missing name (422), list filter/search, get 404, patch status persists, patch 404/422
- [ ] Discussions: ordering is newest first, follow-up propagates to the lead, `last_activity_at` bumped, past follow-up → 422, unknown lead → 404
- [ ] Error envelope shape asserted for 404 and 422

## M3 — Frontend: lead list
- [ ] Scaffold Next.js 15 (TypeScript strict, App Router, `src/`, ESLint) + Tailwind + Prettier
- [ ] Install `@tanstack/react-query`, `date-fns`, `lucide-react`, `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-checkbox`, `clsx`
- [ ] `lib/api-client.ts`: fetch wrapper, `ApiError(status, code, message, details)`
- [ ] `features/leads/types.ts`, `constants.ts` (`STATUS_META` labels and colors, §5.3)
- [ ] `features/leads/api.ts` + `hooks.ts` (`useLeads`)
- [ ] `app/providers.tsx` (QueryClient); `layout.tsx` with fonts and metadata
- [ ] UI primitives: Button, Badge, Input, Textarea, Checkbox, Dialog, Select, Spinner, EmptyState, ErrorState
- [ ] `Header` (logo + "Add New Lead" button)
- [ ] `StatusBadge`
- [ ] `LeadCard`: name, (company), badge, "Last Note:" truncated, time ago; muted for won/lost **(F1)**
- [ ] `hooks/useNow.ts` (60-second tick) and `lib/time.ts` helpers
- [ ] `lib/followUps.ts`: `classifyFollowUp`, `partitionLeads` + Vitest tests (midnight and timezone edges)
- [ ] `FollowUpTag`: today (blue 🔔), overdue (**red**), upcoming (neutral) **(N2)**
- [ ] `LeadSection` ×2: "📌 Today's Follow-ups" (overdue + today) and "All Leads" **(F2)**
- [ ] `StatusFilter` chips: All + all 6 statuses, synced to `?status=` **(N5)**
- [ ] `SearchInput`: debounced 250 ms, synced to `?q=` **(N1)**
- [ ] Loading skeletons, empty state, error state with retry

## M4 — Frontend: dialogs
### Add lead (F5)
- [ ] `AddLeadDialog`: Full Name*, Company (Optional), Phone (Optional); Cancel / Save Lead
- [ ] Client validation (name required); show server 422 field errors inline
- [ ] `useCreateLead` → invalidate `['leads']`, close the dialog, reset the form

### Timeline (F3, F4, F6)
- [ ] `LeadTimelineDialog` opened via a card click; `?lead=<id>` deep link
- [ ] Header: name, (company), 📞 phone, `StatusSelect`, close button
- [ ] `Timeline` + `TimelineItem`: rail with dots (newest blue), `MMM d, h:mm a (x ago)`, 📅 follow-up chip, italic system entries
- [ ] `useDiscussions(id)` with a loading skeleton
- [ ] `DiscussionForm`: textarea, "Set Follow-up" checkbox toggling date and time inputs, Save Note; ⌘/Ctrl + Enter submits
- [ ] Combine local date + time → ISO with offset; validate it is not in the past on the client
- [ ] `useCreateDiscussion`: write the returned lead into the list cache and prepend to the timeline, then invalidate **(F4)**
- [ ] `useUpdateLeadStatus`: optimistic update + rollback on error; invalidate leads and discussions **(F6)**
- [ ] Error toasts for failed mutations

### Accessibility pass
- [ ] Cards are keyboard-activatable buttons with `aria-label`
- [ ] Focus returns to the trigger when a dialog closes
- [ ] Labels and `aria-describedby` on every input; status never conveyed by color alone

## M5 — Packaging (N3)
- [ ] `backend/Dockerfile` (python:3.12-slim, non-root) + `entrypoint.sh` (wait for db → migrate → seed → uvicorn)
- [ ] `frontend/Dockerfile` (multi-stage, `output: "standalone"`, `NEXT_PUBLIC_API_URL` build arg)
- [ ] `.dockerignore` for both
- [ ] `docker-compose.yml`: db (healthcheck, volume), api (healthcheck), web
- [ ] Verify `docker compose up --build` from a fresh clone

## M6 — Quality & delivery
- [ ] GitHub Actions: backend (ruff, mypy, alembic, pytest with a Postgres service) and frontend (lint, tsc, vitest, build)
- [ ] Manual E2E walkthrough (below) passes
- [ ] Screenshots: list, filters/search, overdue, add lead, timeline, status change
- [ ] Short demo video / GIF of the full flow
- [ ] `README.md` (sections listed in §10 of the plan)
- [ ] Final review: no secrets committed, `.env.example` complete, CI green
- [ ] Push to the public GitHub repo; verify the README renders

---

## Manual E2E checklist (before recording)
- [ ] Fresh `docker compose up --build` → seeded list renders at `localhost:3000`
- [ ] Each card shows name, company, status badge, last note, and time ago **(F1)**
- [ ] Today's follow-ups are pinned at the top; overdue leads are in red **(F2, N2)**
- [ ] Every status filter chip works; "All" resets **(N5)**
- [ ] Searching "sar" finds Sarah Connor; search combines with a status filter **(N1)**
- [ ] Add a lead with name only → appears with status `New` and a "Lead created." note **(F5)**
- [ ] Add a lead with an empty name → blocked with an inline error
- [ ] Open a timeline → newest discussion first **(F3)**
- [ ] Add a note with a follow-up for today → the lead moves to the pinned section without a reload **(F4)**
- [ ] Change the status in the dialog → badge updates; still correct after a page refresh **(F6)**
- [ ] `?lead=<id>` deep link opens the dialog; Esc closes it and the URL clears
- [ ] Stop the API → the UI shows an error state, not a blank screen

## Stretch (only if time remains)
- [ ] Optional login (JWT) with a seeded demo user
- [ ] Playwright E2E in CI
- [ ] Edit or delete discussions
