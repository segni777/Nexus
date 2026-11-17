# Nexus

**A UGC creator and campaign management platform.**

Nexus is an internal dashboard for running creator (influencer) marketing. Brands run campaigns, creators are assigned to them at an agreed rate, creators owe deliverables (videos, posts, stories, livestreams), and once content is posted, performance metrics stream in over time.

- **Creator roster**: browse creators across TikTok, Instagram, and YouTube, filter by status and platform, and open a detail drawer.
- **Campaign board**: every campaign grouped by status, with budget and spend.
- **Campaign detail**: assigned creators, deliverables, and a cumulative views chart.
- **Insights**: AI-generated summaries for creators and campaigns (currently seeded mock data).

---

## Tech stack

| Layer | Technology |
|---|---|
| API | Node.js, TypeScript, Express 5, Apollo Server 5 (GraphQL) |
| Database | PostgreSQL 16, Prisma 6 |
| Web | Angular 22 (standalone components, signals), Apollo Angular |
| Validation | Zod |
| Testing | Jest + Supertest (API), Vitest (web) |
| Tooling | GraphQL Code Generator, Docker Compose, pino logging |

---

## Project structure

```
nexus/
├── apps/
│   ├── api/                  # GraphQL + REST backend
│   │   ├── prisma/           # schema, migrations, seed, verify script
│   │   ├── src/
│   │   │   ├── config/       # env validation, logger
│   │   │   ├── db/           # Prisma client
│   │   │   ├── repositories/ # all database queries
│   │   │   ├── services/     # business rules (status transitions, validation)
│   │   │   ├── graphql/      # schema.graphql, resolvers, DataLoaders, error formatting
│   │   │   ├── rest/         # metrics webhook + REST error handler
│   │   │   └── errors/       # typed application errors
│   │   ├── scripts/          # N+1 query demo
│   │   └── test/             # unit + integration tests
│   └── web/                  # Angular dashboard
│       └── src/app/
│           ├── core/graphql/ # generated, typed GraphQL operations
│           ├── features/     # creators, campaigns, insights
│           └── shared/       # status chips, money pipe, line chart, loading/error state
├── packages/
│   └── shared-types/         # shared enum types
├── docs/                     # API reference, ERD, N+1 demo output, AI log
├── docker-compose.yml
└── .env.example
```

**Request flow in the API:**
`GraphQL resolver / REST route → Service (business rules) → Repository (Prisma) → PostgreSQL`

Services depend on repository interfaces rather than Prisma directly, so you can unit-test them with mocks. DataLoaders are created per request to batch related lookups and avoid N+1 queries.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 22+ and npm
- [Docker](https://www.docker.com/) with Docker Compose

---

## Getting started

All commands run from the `nexus/` directory.

```bash
cd nexus

# 1. Configure environment
cp .env.example .env

# 2. Start PostgreSQL (and optionally Adminer, a browser DB client)
docker compose up -d db adminer

# 3. Install dependencies for all workspaces
npm install

# 4. Create the database tables
npm run db:migrate

# 5. Load deterministic sample data, then sanity-check it
npm run db:seed
npm run db:verify

# 6. Run the API (terminal 1)
npm run dev

# 7. Run the web app (terminal 2)
npm run dev:web
```

Then open:

| What | URL |
|---|---|
| Web dashboard | http://localhost:4200 |
| GraphQL API (with browser explorer) | http://localhost:3000/graphql |
| Health check | http://localhost:3000/healthz |
| Adminer (DB browser) | http://localhost:8080 (server `db`, user `nexus`, password `nexus_dev_pw`, database `nexus`) |

### Sample data

The seed uses a fixed random seed and a fixed date window ending 2026-01-15, so every run produces identical data: 14 brands, 80 creators, 22 campaigns, 100+ deliverables, 1,000+ metrics snapshots, and 3 mock insights. `db:verify` checks these volumes and the key business rules.

---

## Environment variables

Defined in `nexus/.env` and validated at startup (the API refuses to boot with bad config).

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://nexus:nexus_dev_pw@localhost:5433/nexus?schema=public` | PostgreSQL connection string |
| `PORT` | `3000` | API port |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |

---

## Scripts

### From `nexus/` (root)

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with hot reload |
| `npm run dev:web` | Start the Angular dev server |
| `npm run build` | Build all workspaces |
| `npm run db:migrate` | Apply/create Prisma migrations (dev) |
| `npm run db:seed` | Wipe and reseed sample data |
| `npm run db:verify` | Check seeded data volumes and invariants |
| `npm run db:reset` | Drop the database, re-run migrations, and reseed |

### API workspace (`npm run <script> -w apps/api`)

| Command | What it does |
|---|---|
| `test:unit` | Service-level unit tests (no database needed) |
| `test:integration` | Starts the test database in Docker on port 5434, applies migrations, runs HTTP tests |
| `test:coverage` | Unit tests with a coverage report |
| `test:db:down` | Remove the test database container |
| `codegen` | Regenerate resolver types from `schema.graphql` |
| `demo:n-plus-one` | Show query counts with vs. without DataLoader |
| `build` / `start` | Compile to `dist/` and run the compiled server |

### Web workspace (`npm run <script> -w apps/web`)

| Command | What it does |
|---|---|
| `start` | Angular dev server |
| `build` | Production build |
| `test` | Vitest unit tests |
| `codegen` | Regenerate typed operations from the API schema and `*.graphql` files |

> After editing `apps/api/src/graphql/schema.graphql`, run **both** codegen scripts. Never hand-edit files in a `generated/` folder.

---

## API overview

| Endpoint | Purpose |
|---|---|
| `POST /graphql` | All reads and writes for creators, brands, campaigns, deliverables, metrics, insights |
| `POST /webhooks/metrics` | Ingest a metrics snapshot for a posted deliverable |
| `GET /healthz` | Liveness check |

**Pagination:** every list returns `{ items, pageInfo }`. Defaults are offset `0` and limit `20`, and the maximum limit is `50`.

**Errors:** errors carry a code in `errors[].extensions.code` (GraphQL) or `error.code` (REST): `BAD_USER_INPUT`, `NOT_FOUND`, `CONFLICT`, `INVALID_TRANSITION`, `INTERNAL_SERVER_ERROR`. Stack traces are never exposed.

**Lifecycle rules enforced by the API:**

- **Creator:** `PROSPECT → ACTIVE | CHURNED`, `ACTIVE ⇄ PAUSED`, any → `CHURNED`
- **Campaign:** `DRAFT → ACTIVE | CANCELLED`, `ACTIVE → COMPLETED | CANCELLED`
- **Deliverable:** main path is `ASSIGNED → IN_REVIEW → APPROVED → POSTED`, and an item can also step back or become `OVERDUE`. `POSTED` is final and requires a valid http(s) `postedUrl`.
- A creator must be assigned to a campaign before receiving deliverables. Due dates must fall within the campaign window.
- Metrics can only be recorded for `POSTED` deliverables, and values can never decrease.

Example webhook call:

```bash
curl -X POST http://localhost:3000/webhooks/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "deliverableId": "<uuid of a POSTED deliverable>",
    "capturedAt": "2026-01-15T12:00:00Z",
    "views": 1200, "likes": 140, "comments": 12, "shares": 9, "watchTimeSeconds": 5400
  }'
```

See [`nexus/docs/api/graphql.md`](nexus/docs/api/graphql.md) for the full reference and [`nexus/docs/erd.md`](nexus/docs/erd.md) for the data model.

---

## Ports

| Service | Port |
|---|---|
| API | 3000 |
| Web | 4200 |
| PostgreSQL (dev) | 5433 |
| PostgreSQL (tests) | 5434 |
| Adminer | 8080 |

---

## Known issues and roadmap

- **`Campaign.spentCents` has no resolver.** The Campaign board and Campaign detail pages currently fail with an internal server error.
- **Root `npm test` exits with failure** because `packages/shared-types` has npm's placeholder test script. `npm run lint` is not configured.
- **The web app is read-only.** Mutations (create creator/campaign, assign, status changes) exist in the API but have no UI yet.
- **Insights are mock data.** Real AI generation is planned for a later phase.
- **No authentication or authorization.** CORS is open and the API URL is hard-coded to `localhost:3000`. This setup is not deployment-ready.
- Deliverables are not marked `OVERDUE` automatically.
- Creator table sorting applies to the current page only, and the campaign board loads the first 50 campaigns.
- Test scripts use POSIX shell syntax. On Windows, use WSL or Git Bash.

---

## License

[MIT](LICENSE) © 2026 Ethan Grammer
