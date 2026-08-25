# UGC Creator & Campaign Management Platform ("Nexus")

**Format:** Individual project with instructor (mentor) code review
**Prerequisites:** CMSC 3XX (Data Structures), working knowledge of JavaScript, basic SQL
**Estimated effort:** 8–10 hours/week across 12 weeks

---

## 1. Project Overview

You will design, build, test, and (eventually) deploy a full-stack web application for a fictional UGC (User-Generated Content) marketing agency. The platform allows agency staff to manage **creators** (influencers/content producers), **campaigns** (brand engagements), and **deliverables** (posts, videos, stories), and to view **performance analytics** with AI-generated insights.

The current scope of the project (**Phases 0–4**) is a fully functional local application running on **mock/seeded data**. Cloud deployment (AWS), social-media scraping (Lambda), and AI insights are defined as later phases so the architecture must anticipate them, but you are **not** required to touch AWS until Phase 5.

### 1.1 Why this project

This project is intentionally shaped around the skill profile of a modern junior/mid-level full-stack role:

| Skill in industry job listings | Where you practice it here |
|---|---|
| TypeScript / Node.js | Backend API, shared types, tooling |
| Angular | Dashboard frontend |
| GraphQL (Apollo) | Read-heavy dashboard queries |
| REST | Webhooks, health checks, service-to-service |
| PostgreSQL | Schema design, migrations, indexing |
| AWS (EC2, Lambda, Secrets Manager, CloudWatch) | Phases 5–6 |
| Automated testing | Required every phase — untested code is incomplete code |
| Agentic AI tooling | Required workflow (see §9) |
| Agile habits | Weekly sprints, PR reviews, demos |

---

## 2. Learning Objectives

By the end of this project you should be able to:

1. **LO1:** Design a normalized relational schema for a multi-entity business domain and implement it with versioned migrations.
2. **LO2:** Build a layered Node.js/Express backend in TypeScript (routes → services → repositories) and explain why the layers exist.
3. **LO3:** Implement a GraphQL API with Apollo Server, including schema design, resolvers, and DataLoader-based N+1 mitigation — and articulate when GraphQL is the wrong choice.
4. **LO4:** Build a component-based Angular frontend with typed API clients, reactive state, and route-level code organization.
5. **LO5:** Write meaningful automated tests at unit, integration, and e2e levels.
6. **LO6:** Use agentic AI tools as a force multiplier while retaining full ownership and understanding of every line merged.
7. **LO7 (later phases):** Deploy and operate the system on AWS with proper secret handling and log observability.

---

## 3. Tech Stack (Mandated)

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript (strict mode) everywhere | `"strict": true` is non-negotiable |
| Frontend | Angular 18+ (standalone components) | Angular Material or Tailwind permitted |
| Backend | Node.js 20 LTS + Express 4 | Apollo Server 4 mounted via `expressMiddleware` |
| API | GraphQL for dashboard reads; REST for webhooks/health/uploads | See §6 |
| Database | PostgreSQL 16 | Run via Docker Compose locally |
| ORM | Prisma 5 | Migrations via `prisma migrate`; seeding via `prisma db seed` |
| Testing | Jest (unit), Jest + Supertest (integration) | Cypress e2e deferred to a later phase |
| Tooling | ESLint, Prettier, Husky pre-commit hooks | |
| Cloud (Phase 5+) | AWS: EC2, Lambda, Secrets Manager, CloudWatch, RDS | |

---

## 4. System Architecture

### 4.1 Target architecture (end state, Phase 6)

```
┌──────────────┐        ┌─────────────────────────────────────┐
│   Browser     │        │              AWS VPC                │
│  (Angular SPA)│◄──────►│  EC2: Nginx → Express/Apollo (Node) │
└──────────────┘  HTTPS  │        │                            │
                         │        ▼                            │
                         │  RDS PostgreSQL                     │
                         │        ▲                            │
                         │  Lambda (scheduled scraper) ────────┼──► Social APIs
                         │        │                            │
                         │  Secrets Manager (env injection)    │
                         │  CloudWatch (logs + alarms)         │
                         └─────────────────────────────────────┘
```

### 4.2 Current-phase architecture (Phases 0–4, local only)

```
Angular dev server (4200) ──► Express + Apollo (3000) ──► Postgres (Docker, 5432)
                                      ▲
                              seed script (mock data)
```

**Key rule:** anything that will later come from a Lambda scraper (social metrics) must, today, come from a **seed/mock service behind an interface**, so the swap in Phase 6 is a one-file change. Design to the seam.

### 4.3 Repository structure (monorepo)

```
nexus/
├── apps/
│   ├── api/                  # Express + Apollo backend
│   │   ├── src/
│   │   │   ├── graphql/      # typeDefs, resolvers, dataloaders
│   │   │   ├── rest/         # REST routes (webhooks, health)
│   │   │   ├── services/     # business logic (framework-agnostic)
│   │   │   ├── repositories/ # data access only
│   │   │   ├── db/           # migrations, seed scripts
│   │   │   └── config/       # env parsing (zod-validated)
│   │   └── test/
│   └── web/                  # Angular app
│       └── src/app/
│           ├── core/         # singleton services, interceptors
│           ├── shared/       # dumb/presentational components
│           └── features/     # creators/, campaigns/, insights/
├── packages/
│   └── shared-types/         # DTOs & enums shared FE/BE
├── docker-compose.yml        # postgres + adminer
├── docs/
│   ├── adr/                  # Architecture Decision Records
│   └── api/                  # schema docs
└── .github/workflows/        # CI (Phase 4+)
```

---

## 5. Data Model (minimum viable schema)

You must implement at least the following entities via migrations. Extend as needed, but document changes in an ADR.

- **creators** — id, handle, display_name, primary_platform (enum: `tiktok | instagram | youtube`), follower_count, engagement_rate, rate_per_post (cents), status (enum: `prospect | active | paused | churned`), created_at
- **brands** — id, name, industry, contact_email
- **campaigns** — id, brand_id (FK), name, budget_cents, start_date, end_date, status (enum: `draft | active | completed | cancelled`)
- **campaign_creators** — join table: campaign_id, creator_id, agreed_rate_cents, role (enum)
- **deliverables** — id, campaign_id, creator_id, type (enum: `video | post | story | livestream`), due_date, posted_url, status (enum: `assigned | in_review | approved | posted | overdue`)
- **metrics_snapshots** — id, deliverable_id, captured_at, views, likes, comments, shares, watch_time_seconds *(this table is what the future Lambda scraper writes to — seed it with mock time-series data)*
- **insights** — id, scope (enum: `creator | campaign`), scope_id, generated_at, model, summary_text, payload_json *(future AI feature writes here; seed with 2–3 fake rows)*

**Requirements:** every FK indexed; money stored as integer cents; timestamps in UTC (`timestamptz`); enums declared as Prisma `enum` types (which map to native Postgres enums) — document the migration implications of adding/removing enum values in ADR-002.

---

## 6. API Design Requirements

### 6.1 The GraphQL/REST split (this is a graded design competency)

| Concern | Protocol | Rationale you must be able to defend |
|---|---|---|
| Dashboard reads (nested creator→campaign→deliverable→metrics) | **GraphQL** | One round-trip per view; clients select fields; no over-fetch |
| Standard CRUD mutations (create campaign, assign creator) | **GraphQL mutations** | Keeps dashboard on one client stack |
| Health check (`GET /healthz`) | **REST** | Load balancers speak REST |
| Inbound webhooks (future: social platform callbacks) | **REST** | Third parties can't call your GraphQL schema |
| File upload (creator media kits — stretch) | **REST** | Multipart handling is simpler outside GraphQL |

### 6.2 GraphQL requirements

- Schema-first (`.graphql` files), with generated TS types (GraphQL Code Generator).
- At least one **DataLoader** to solve a demonstrated N+1 (show the before/after query logs in your Phase 2 demo).
- Pagination on all list fields (cursor or offset — justify in ADR-003).
- Errors mapped to typed GraphQL errors; never leak stack traces.

### 6.3 General backend requirements

- Layering: resolvers/routes contain **zero business logic**; services contain **zero SQL**.
- All env vars parsed and validated at boot (zod) — the app must crash loudly on bad config. *(This is what makes Secrets Manager injection trivial in Phase 5.)*
- Structured JSON logging (pino) from day one. *(This is what makes CloudWatch useful in Phase 5.)*

---

## 7. Phase Plan & Milestones

> Phases 0–4 are the current assignment. Phases 5–7 are specified now so your design anticipates them.

### Phase 0 — Environment & Skeleton (Week 1) — 10%
- Monorepo scaffolded; Docker Compose brings up Postgres with one command.
- CI-ready scripts: `dev`, `build`, `test`, `lint`, `db:migrate`, `db:seed`.
- ADR-001 written: *Prisma access strategy* — do services call PrismaClient directly, or is it wrapped behind a repository layer? (Hint: think about what you'll need to mock in Jest unit tests, and what Phase 2's "services contain zero SQL" rule implies.)
- **Exit criteria:** a teammate can clone → `docker compose up` → `npm run dev` → hit `/healthz` in under 10 minutes.

### Phase 1 — Schema & Mock Data (Weeks 2–3) — 15%
- All migrations from §5 implemented in `schema.prisma` and applied via `prisma migrate dev`.
- Seed script (wired to `prisma db seed`) generates realistic mock data with **faker**: ≥50 creators, ≥10 brands, ≥15 campaigns, ≥100 deliverables, ≥1,000 metrics snapshots spread over 90 simulated days (so charts look real).
- Seeding is **idempotent** and deterministic (fixed faker seed).
- **Exit criteria:** `npm run db:reset` produces the same DB every time; ER diagram in `/docs`.

### Phase 2 — Backend API (Weeks 4–6) — 25%
- GraphQL schema + resolvers for all read paths; mutations for campaign/creator/deliverable lifecycle.
- REST: `/healthz`, plus a stubbed `/webhooks/metrics` endpoint that writes a metrics snapshot (this is the Lambda seam).
- DataLoader demo, pagination, typed errors.
- **Unit tests (Jest):** services tested in isolation with the Prisma layer mocked (this is where your ADR-001 choice gets stress-tested).
- **Integration tests (Jest + Supertest):** run against a real dockerized test database with `prisma migrate deploy` in the test setup — no mocked DB in integration tests.
- **Exit criteria:** ≥80% coverage on services; documented schema; demo of N+1 fix.

### Phase 3 — Angular Dashboard (Weeks 7–9) — 25%
Required views:
1. **Creator roster** — filterable/sortable table, status chips, detail drawer.
2. **Campaign board** — campaigns by status with budget vs. spend bar.
3. **Campaign detail** — assigned creators, deliverable checklist, metrics chart (time series from snapshots).
4. **Insights panel** — renders rows from the `insights` table (mock AI output for now).

Technical requirements: Apollo Angular client with generated types; loading/error/empty states on every view; at least one shared presentational component reused across ≥2 features; route lazy loading; component tests for the two most complex components.
- **Exit criteria:** click-through demo of all four views against seeded data.

### Phase 4 — Quality & CI (Week 10) — 15%
- GitHub Actions: lint + typecheck + Jest unit + integration suites on every PR (Postgres as a CI service container, migrated via Prisma before tests run).
- **E2E is intentionally deferred:** a Cypress smoke test (load roster → open campaign → see chart) is scoped as part of Phase 5 hardening, not required here.
- Pre-commit hooks (lint-staged).
- `README.md` good enough that a stranger ships a feature in one sitting.
- **Exit criteria:** red builds block merge; a demonstrated failed-then-fixed PR.

### Phase 5 — AWS Deployment (Weeks 11–12) — 10% *(specified, not yet started)*
- EC2 (Nginx reverse proxy + Node via systemd or PM2), RDS Postgres, Secrets Manager for all env vars (no `.env` on the box), CloudWatch agent shipping structured logs, one CloudWatch alarm (5xx rate).

### Phase 6 — Lambda Scraper *(stretch)*
- Scheduled Lambda (EventBridge cron) that "scrapes" (initially: generates) metrics and POSTs to `/webhooks/metrics` with an HMAC signature. The seam you built in Phase 2 pays off here.

### Phase 7 — AI Insights *(stretch)*
- Backend job calls an LLM API with a campaign's metrics summary and writes structured output to `insights`. Requirements: prompt lives in version control, output validated against a zod schema before persisting, cost/token logging. The frontend panel from Phase 3 needs zero changes — that's the point.

---

## 8. Engineering Standards (enforced in review)

1. **Git:** trunk-based with short-lived feature branches; conventional commits (`feat:`, `fix:`, `chore:`); every merge via PR with self-review comments; no direct pushes to `main`.
2. **PR size:** target < 400 changed lines. Big features ship in slices.
3. **TypeScript:** no `any` without an inline justification comment; shared DTOs live in `packages/shared-types`, never duplicated.
4. **Testing definition of done:** a feature without tests is not done. Bug fixes require a regression test that fails before the fix.
5. **ADRs:** every non-obvious technical decision (ORM, pagination style, enum strategy, state management) gets a one-page ADR. Minimum 4 by Phase 4.
6. **Secrets:** never committed. `.env.example` documents every variable. (Phase 5 replaces `.env` with Secrets Manager — the zod config layer means nothing else changes.)

---

## 9. AI-Assisted Development Policy

Unlike most courses, use of AI tools (Claude, Claude Code, Cursor, Copilot) is **required**, not merely permitted — with conditions:

1. **Ownership rule:** you must be able to explain any merged line to the instructor on demand. "The AI wrote it" is an automatic review failure.
2. **AI worklog:** keep `docs/ai-log.md` with ~2 entries/week: what you asked, what it produced, what you kept/changed/rejected, and what you learned. *(In interviews you will be asked exactly this — "how do you use AI tools?" — and this log is your answer bank.)*
3. **Recommended workflow:** use AI to scaffold tests first, then implementation; use it for code review before opening a PR; use it to explain unfamiliar errors rather than pasting fixes blindly.
4. **Prohibited:** letting an agent commit directly to `main`; pasting secrets into prompts.

---

## 10. Grading Rubric (100 pts)

| Category | Pts | What "A" work looks like |
|---|---|---|
| Phase 0–1: Setup, schema, mock data | 25 | One-command bootstrap; idempotent realistic seed; clean migrations |
| Phase 2: Backend | 25 | Clean layering; defensible GraphQL/REST split; N+1 demonstrably solved; real integration tests |
| Phase 3: Frontend | 25 | Typed Apollo client; all states handled; reusable components; not just "it renders" |
| Phase 4: Quality & CI | 15 | CI blocks bad merges; docs enable a stranger; coverage meaningful, not gamed |
| Design communication | 10 | ADRs, ER diagram, AI worklog, demo articulation |
| **Late policy** | — | Milestones slip a week with prior notice; silent slips cost 5 pts. (Practicing sprint communication is part of the assignment.) |

---

## 11. Deliverables Checklist (current assignment: Phases 0–4)

- [ ] Monorepo with one-command local bootstrap
- [ ] Migrations + idempotent faker seed (§5 volumes)
- [ ] ER diagram (`docs/`)
- [ ] Apollo GraphQL API with DataLoader + pagination
- [ ] REST `/healthz` + `/webhooks/metrics` stub
- [ ] Angular dashboard: roster, campaign board, campaign detail w/ chart, insights panel
- [ ] Jest unit + integration suites, all green in CI (Cypress e2e deferred to Phase 5)
- [ ] ≥4 ADRs, `docs/ai-log.md`, README
- [ ] 15-minute recorded or live demo walking through the system and one design decision you'd defend in an interview

---

## 12. Resources

- Apollo Server 4 + Express integration docs (`expressMiddleware`)
- GraphQL Code Generator (typed resolvers + typed Angular client)
- Prisma docs: schema modeling, `migrate`, `db seed`, and the unit-testing guide (mocking PrismaClient)
- Cypress docs (bookmark for Phase 5 — not needed yet)
- Angular standalone components + Apollo Angular
- *Designing Data-Intensive Applications* (Kleppmann) — ch. 1–3 for schema thinking
- AWS docs: EC2 user data, Secrets Manager SDK, CloudWatch agent (Phase 5)

**Office hours:** async code review on every PR; weekly 30-minute demo/retro.
