# Seminar Management System

A production-oriented seminar management platform: course scheduling, trainer management, intelligent conflict detection, AI-powered trainer matching (via OpenRouter), assignment emails (Mailhog in dev), and a multi-agent Claude Code pipeline that built the matching module autonomously.

> The original assessment brief is preserved in [ASSESSMENT.md](./ASSESSMENT.md). Answers to the follow-up questions are in [FOLLOW-UP.md](./FOLLOW-UP.md). The agent pipeline audit trail is in [agent-run.log](./agent-run.log).

## Quick start

Prerequisites: Docker Desktop.

```bash
# 1. Configure environment
cp seminar-management/.env.example seminar-management/.env
#    - set SESSION_SECRET (openssl rand -base64 32)
#    - set OPENROUTER_API_KEY (https://openrouter.ai/keys) — optional; without
#      it, trainer matching uses the deterministic fallback scorer

# 2. Build and start everything (app + Postgres + Mailhog)
docker compose up --build -d

# 3. Seed demo data (idempotent, re-runnable)
docker compose exec app npx prisma db seed
```

| Service | URL | Notes |
|---|---|---|
| App | http://localhost:3000 | Login: `admin` / `admin123` |
| Mailhog | http://localhost:8025 | All assignment emails land here |
| Postgres | localhost:**5433** | Mapped to 5433 to avoid clashing with a local Postgres |

Migrations run automatically on container start (`prisma migrate deploy`). For host-side development: `cd seminar-management && npm install && npm run dev` (uses `DATABASE_URL` on port 5433 from `.env`).

## Testing the key features

- **Conflict detection**: create a course in *Stuttgart, Germany* on the same date as the seeded "Advanced React.js & Next.js Workshop" → the form shows the structured conflicts with a *Save anyway* override.
- **AI matching**: Courses → "Suggest trainers" on any course → ranked suggestions with confidence, reasoning and per-factor notes. With no/placeholder API key the response is flagged `source: "fallback"` (deterministic scorer). The seeded trainer *Sarah Johnson* has a blackout window ~3 weeks out — she is excluded from suggestions for courses in that window.
- **Email**: assign a trainer (form, quick-select, or suggestion panel) → check Mailhog. Stop Mailhog (`docker compose stop mailhog`) and assign again → the assignment still succeeds and the UI reports the failed notification.
- **Agent pipeline**: run `/build-trainer-matching` in a Claude Code session at the repo root. The previous run's audit trail is `agent-run.log`; its artifacts are in `.claude/pipeline/`.

## Architecture

```
seminar-management/
├── middleware.ts          # auth boundary: every page/API guarded by default
├── pages/                 # UI pages + thin API route handlers
│   └── api/               #   parse → validate (zod) → call service → map errors
├── services/              # business logic, transactions, Prisma access, DTOs
├── schemas/               # zod schemas — single source of validation truth
├── components/            # self-contained React components (Tailwind)
├── lib/                   # infrastructure: prisma, mailer, openrouter, api utils
└── prisma/                # schema, migrations, seed
```

Layering rules: route files contain no business logic and no try/catch (a central `createHandler` maps ZodError/ApiError/Prisma errors to a consistent `{ error, details? }` envelope); services own all database access and return JSON-safe DTOs (Decimal→number, dates→ISO); zod schemas are shared by API validation and describe the exact request contracts.

### Data model highlights

- **Course** — soft-deleted (`deletedAt`) so history and revenue reporting survive; `Decimal` money columns; indexes on the conflict/dashboard query paths (`[location, date]`, `[trainerId, date]`, `status`, `deletedAt`).
- **Trainer** — hard-deleted; FK sets courses to unassigned; the service writes an `UNASSIGNED` history entry per affected course in the same transaction.
- **TrainerAvailability** — date-range table (not JSON) so availability is filterable in SQL.
- **AssignmentHistory** — append-only audit log with denormalized trainer name/email snapshots that survive trainer deletion.

### Conflict detection

`services/conflictService.ts` detects `TRAINER_DOUBLE_BOOKED`, `LOCATION_OCCUPIED` and `TRAINER_UNAVAILABLE` (blackout windows) with one indexed same-day query plus classification — O(courses that day). Conflicts block saves with **409 + structured details**; an explicit `overrideConflicts: true` saves anyway and echoes them as warnings. Cancelled courses are exempt. Granularity is per-day by design (the data model has no time slots); the service comments mark exactly what would change for hourly slots.

### AI trainer matching

`POST /api/trainers/suggest` (built by the agent pipeline — see below):
- Candidates are pre-filtered by the conflict service (trainer-specific conflict types only — a venue clash must not disqualify every trainer).
- OpenRouter chat completions (`OPENROUTER_MODEL`, default `openai/gpt-4o-mini`) with JSON response format, temperature 0.2, 20s timeout, 2 retries with jittered exponential backoff on 429/5xx/network.
- LLM output is zod-validated, confidence clamped to 0–100, and **trainerIds whitelisted against the candidate set** (anti-hallucination); names are re-joined from the DB.
- Deterministic fallback scorer (subject overlap 50 / same location 20 / rating 15 / availability 10 / experience 5) when the key is unset or the AI fails; responses are flagged `source: "ai" | "fallback"`.
- 5-minute in-memory cache keyed on a SHA-256 fingerprint of course + candidate data (includes `updatedAt`, so edits invalidate naturally).

### Emails

Assignment notifications are sent **after** the assignment transaction commits and never throw — a mail outage cannot roll back or block an assignment. The result (`{ sent, to, error? }`) is returned to the client and surfaced in the UI. Templates are HTML + plain-text with every interpolated field HTML-escaped.

### Agentic pipeline (Section 5 of the brief)

`.claude/skills/build-trainer-matching.md` defines a 5-agent pipeline — Planner → (API ∥ UI) → Reviewer → Reconciler — with file-based context handoffs (`.claude/pipeline/plan.json`, critiques), structured output contracts (one re-prompt then abort), a tsc gate treated as a review critique, per-component revision budget (2) with a global review-round cap (3), a dispute mechanism, and mandatory SUCCESS/PARTIAL/FAILURE reporting. The recorded run (`agent-run.log`) shows the Reviewer catching a real blocking integration flaw and the Reconciler fixing it in one cycle.

## API overview

All endpoints require the session cookie (login first). Errors: `{ error: string, details?: unknown }`.

| Method & path | Purpose |
|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | Session management (rate-limited login) |
| `GET /api/stats` | Dashboard aggregates (computed in DB) |
| `GET/POST /api/courses` | List (filters: `status`, `subject`, `location`, `search`, `trainerId`, `sortBy`, `sortOrder`) / create (409 on conflicts unless `overrideConflicts`) |
| `GET/PUT/DELETE /api/courses/:id` | Detail incl. history / partial update (conflict-checked against effective state) / soft delete |
| `POST /api/courses/check-conflicts` | Non-mutating conflict probe for forms |
| `GET/POST /api/trainers` | List (filters + nulls-last rating sort) / create |
| `GET/PUT/DELETE /api/trainers/:id` | Profile incl. courses+history / update (availability replace-all) / delete (unassigns courses, returns count) |
| `POST /api/trainers/suggest` | AI-ranked trainer suggestions for a course |

## Security

Encrypted `httpOnly` `SameSite=Lax` session cookie (iron-session, 8h TTL); default-deny middleware over every page and API route; bcrypt-hashed credentials with timing-safe verification; zod validation on all inputs with whitelisted sort columns; Prisma parameterized queries (no raw SQL); React output escaping + HTML-escaped email templates; login rate limiting; generic 500s (internals logged server-side only); AI API key never leaves the server.

## Known limitations / trade-offs

- Day-granular scheduling (no time slots) — documented extension path in `conflictService.ts`.
- Rate limiter and AI cache are in-memory (single-instance); Redis would replace both at scale.
- Conflict check and save are not serialized — a concurrent-write TOCTOU window exists (discussed with remedies in FOLLOW-UP).
- No pagination on list endpoints; no automated test suite (verified via scripted curl flows — see git history); trainer availability windows are seedable and displayed but not editable in the UI.
- Four advisory findings from the pipeline's Reviewer are documented in `agent-run.log` and left unfixed by design (only blocking issues trigger reconciliation).
- Next.js 14.2.35 retains upstream advisories whose fixes require the v15 major upgrade.
