# Phase 0 Setup Guide — Nexus Monorepo Skeleton

**Companion to:** CMSC 4XX Project Guidelines (§4.3, §7 Phase 0)
**Goal:** From an empty folder to a running stack — Angular (4200) → Express + Apollo (3000) → Postgres (Docker, 5432) — with Prisma migrations and a hello-world GraphQL query.
**Estimated time:** 2–4 hours if you read as you go.

> **How to use this guide:** type the commands yourself rather than pasting entire blocks. The point of Phase 0 is knowing *why* each file exists. Anywhere you see `# WHY:` — read it.

---

## 0. Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| Docker Desktop / Engine + Compose | current | `docker compose version` |
| Angular CLI | 18+ (used via npx, no global install needed) | — |
| Git | any recent | `git --version` |

---

## 1. Monorepo Root

```bash
mkdir nexus && cd nexus
git init
npm init -y
```

Edit the root `package.json` to declare **npm workspaces**:

```json
{
  "name": "nexus",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev --workspace=apps/api",
    "dev:web": "npm run start --workspace=apps/web",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "db:migrate": "npm run db:migrate --workspace=apps/api",
    "db:seed": "npm run db:seed --workspace=apps/api",
    "db:reset": "npm run db:reset --workspace=apps/api"
  }
}
```

> **WHY workspaces:** one `npm install` at the root installs everything, and `packages/shared-types` can be imported by both apps without publishing to a registry. This is the lightest-weight monorepo tool; you can graduate to Nx/Turborepo later without restructuring.

Create the directory skeleton and root hygiene files:

```bash
mkdir -p apps/api apps/web packages/shared-types docs/adr .github/workflows
```

**`.gitignore`** (root):

```
node_modules/
dist/
.env
*.local
.angular/
coverage/
```

**`.env.example`** (root — commit this; never commit `.env`):

```
# Postgres (docker-compose defaults)
DATABASE_URL=postgresql://nexus:nexus_dev_pw@localhost:5432/nexus?schema=public
PORT=3000
NODE_ENV=development
```

> **WHY `.env.example`:** it documents every variable the app needs. In Phase 5, Secrets Manager will populate these same names — nothing else changes.

---

## 2. PostgreSQL via Docker Compose

**`docker-compose.yml`** (root):

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: nexus
      POSTGRES_PASSWORD: nexus_dev_pw
      POSTGRES_DB: nexus
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nexus"]
      interval: 5s
      timeout: 3s
      retries: 10

  # Browser DB client at http://localhost:8080 (server: db, user: nexus)
  adminer:
    image: adminer
    ports:
      - "8080:8080"
    depends_on:
      - db

volumes:
  pgdata:
```

Bring it up and verify:

```bash
docker compose up -d
docker compose ps        # db should be "healthy"
```

> **WHY a named volume:** your data survives `docker compose down`. To truly wipe the DB: `docker compose down -v`.

---

## 3. Shared Types Package

```bash
cd packages/shared-types
npm init -y
```

**`packages/shared-types/package.json`:**

```json
{
  "name": "@nexus/shared-types",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

**`packages/shared-types/src/index.ts`** — start tiny; grow as needed:

```ts
export type Platform = 'TIKTOK' | 'INSTAGRAM' | 'YOUTUBE';
export type CreatorStatus = 'PROSPECT' | 'ACTIVE' | 'PAUSED' | 'CHURNED';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type DeliverableStatus = 'ASSIGNED' | 'IN_REVIEW' | 'APPROVED' | 'POSTED' | 'OVERDUE';
export type DeliverableType = 'VIDEO' | 'POST' | 'STORY' | 'LIVESTREAM';
```

> **WHY:** these mirror the Prisma enums (§5 of the guidelines). The frontend imports from here instead of redeclaring — one source of truth, per Engineering Standard #3.

Return to root: `cd ../..`

---

## 4. Backend — Express + Apollo + Prisma (`apps/api`)

### 4.1 Init and dependencies

```bash
cd apps/api
npm init -y
npm i express @apollo/server graphql cors zod pino pino-http @prisma/client @nexus/shared-types
npm i -D typescript tsx prisma @types/express @types/cors @types/node \
         jest ts-jest @types/jest supertest @types/supertest jest-mock-extended
```

> **WHY tsx:** runs TypeScript directly with fast restarts (`tsx watch`) — no build step during dev.

### 4.2 TypeScript config

**`apps/api/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

### 4.3 Validated config (the Secrets Manager seam)

**`apps/api/src/config/env.ts`:**

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// WHY: crash loudly at boot on bad config instead of failing mysteriously at 2am.
// In Phase 5, Secrets Manager injects these same names — this file never changes.
export const env = EnvSchema.parse(process.env);
```

### 4.4 Prisma setup

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and an `apps/api/.env`. Make sure that `.env` contains the `DATABASE_URL` from `.env.example`.

Replace **`apps/api/prisma/schema.prisma`** with the §5 data model:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Platform {
  TIKTOK
  INSTAGRAM
  YOUTUBE
}

enum CreatorStatus {
  PROSPECT
  ACTIVE
  PAUSED
  CHURNED
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  COMPLETED
  CANCELLED
}

enum DeliverableType {
  VIDEO
  POST
  STORY
  LIVESTREAM
}

enum DeliverableStatus {
  ASSIGNED
  IN_REVIEW
  APPROVED
  POSTED
  OVERDUE
}

enum InsightScope {
  CREATOR
  CAMPAIGN
}

model Creator {
  id              String            @id @default(uuid())
  handle          String            @unique
  displayName     String
  primaryPlatform Platform
  followerCount   Int
  engagementRate  Float
  ratePerPost     Int               // cents
  status          CreatorStatus     @default(PROSPECT)
  createdAt       DateTime          @default(now()) @db.Timestamptz()
  campaigns       CampaignCreator[]
  deliverables    Deliverable[]

  @@index([status])
  @@map("creators")
}

model Brand {
  id           String     @id @default(uuid())
  name         String
  industry     String
  contactEmail String
  campaigns    Campaign[]

  @@map("brands")
}

model Campaign {
  id          String            @id @default(uuid())
  brandId     String
  brand       Brand             @relation(fields: [brandId], references: [id])
  name        String
  budgetCents Int
  startDate   DateTime          @db.Timestamptz()
  endDate     DateTime          @db.Timestamptz()
  status      CampaignStatus    @default(DRAFT)
  creators    CampaignCreator[]
  deliverables Deliverable[]
  
  @@index([brandId])
  @@index([status])
  @@map("campaigns")
}

model CampaignCreator {
  campaignId      String
  creatorId       String
  agreedRateCents Int
  campaign        Campaign @relation(fields: [campaignId], references: [id])
  creator         Creator  @relation(fields: [creatorId], references: [id])

  @@id([campaignId, creatorId])
  @@index([creatorId])
  @@map("campaign_creators")
}

model Deliverable {
  id         String            @id @default(uuid())
  campaignId String
  creatorId  String
  campaign   Campaign          @relation(fields: [campaignId], references: [id])
  creator    Creator           @relation(fields: [creatorId], references: [id])
  type       DeliverableType
  dueDate    DateTime          @db.Timestamptz()
  postedUrl  String?
  status     DeliverableStatus @default(ASSIGNED)
  metrics    MetricsSnapshot[]

  @@index([campaignId])
  @@index([creatorId])
  @@map("deliverables")
}

model MetricsSnapshot {
  id               String      @id @default(uuid())
  deliverableId    String
  deliverable      Deliverable @relation(fields: [deliverableId], references: [id])
  capturedAt       DateTime    @db.Timestamptz()
  views            Int
  likes            Int
  comments         Int
  shares           Int
  watchTimeSeconds Int

  @@index([deliverableId, capturedAt])
  @@map("metrics_snapshots")
}

model Insight {
  id          String       @id @default(uuid())
  scope       InsightScope
  scopeId     String
  generatedAt DateTime     @default(now()) @db.Timestamptz()
  model       String
  summaryText String
  payloadJson Json

  @@index([scope, scopeId])
  @@map("insights")
}
```

> **WHY `@@map`:** Prisma models are PascalCase for TypeScript, but the underlying tables stay snake_case like a conventional Postgres schema.

Create and apply the first migration:

```bash
npx prisma migrate dev --name init
```

Verify in Adminer (http://localhost:8080) that the tables exist.

**Prisma client singleton — `apps/api/src/db/prisma.ts`:**

```ts
import { PrismaClient } from '@prisma/client';

// WHY: one client = one connection pool. Instantiating per-request
// exhausts Postgres connections under load.
export const prisma = new PrismaClient();
```

### 4.5 Minimal seed (placeholder — Phase 1 replaces this)

**`apps/api/prisma/seed.ts`:**

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.creator.upsert({
    where: { handle: 'demo_creator' },
    update: {},
    create: {
      handle: 'demo_creator',
      displayName: 'Demo Creator',
      primaryPlatform: 'TIKTOK',
      followerCount: 125_000,
      engagementRate: 0.043,
      ratePerPost: 50_000, // $500.00
      status: 'ACTIVE',
    },
  });
  console.log('Seed complete.');
}

main().finally(() => prisma.$disconnect());
```

Wire it up in **`apps/api/package.json`** (add alongside `scripts`):

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

> **WHY upsert:** makes the seed idempotent — run it twice, get the same DB. Phase 1 keeps this property while scaling up with faker (fixed seed: `faker.seed(42)`).

### 4.6 GraphQL schema + resolver (hello world)

**`apps/api/src/graphql/typeDefs.ts`:**

```ts
export const typeDefs = /* GraphQL */ `
  enum Platform { TIKTOK INSTAGRAM YOUTUBE }
  enum CreatorStatus { PROSPECT ACTIVE PAUSED CHURNED }

  type Creator {
    id: ID!
    handle: String!
    displayName: String!
    primaryPlatform: Platform!
    followerCount: Int!
    engagementRate: Float!
    status: CreatorStatus!
  }

  type Query {
    health: String!
    creators: [Creator!]!
  }
`;
```

**`apps/api/src/graphql/resolvers.ts`:**

```ts
import { prisma } from '../db/prisma.js';

export const resolvers = {
  Query: {
    health: () => 'ok',
    // Phase 2 will move this behind a service + repository (see ADR-001)
    creators: () => prisma.creator.findMany(),
  },
};
```

### 4.7 The server (Express + Apollo + REST)

**`apps/api/src/server.ts`:**

```ts
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import pinoHttp from 'pino-http';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';

export async function createServer() {
  const app = express();
  app.use(pinoHttp()); // WHY: structured JSON logs now = CloudWatch queries later
  app.use(cors());
  app.use(express.json());

  // REST lane: infra + machine-to-machine (guidelines §6.1)
  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.post('/webhooks/metrics', (_req, res) => {
    // Phase 2 fleshes this out; Phase 6's Lambda will call it.
    res.status(202).json({ accepted: true });
  });

  // GraphQL lane: the dashboard
  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo));

  return app;
}
```

**`apps/api/src/index.ts`:**

```ts
import { env } from './config/env.js';
import { createServer } from './server.js';

const app = await createServer();
app.listen(env.PORT, () => {
  console.log(`API ready: http://localhost:${env.PORT}/graphql`);
});
```

> **WHY split `server.ts` from `index.ts`:** Supertest imports `createServer()` directly in integration tests — no port binding, no flaky test servers.

### 4.8 Scripts + Jest config

**`apps/api/package.json` scripts:**

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:reset": "prisma migrate reset --force"
}
```

**`apps/api/jest.config.ts`:**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
};
export default config;
```

**Smoke test — `apps/api/test/health.test.ts`:**

```ts
import request from 'supertest';
import { createServer } from '../src/server.js';

describe('healthz', () => {
  it('returns ok', async () => {
    const app = await createServer();
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
```

### 4.9 Verify the backend

```bash
# from repo root
npm install          # installs all workspaces
npm run db:migrate
npm run db:seed
npm run dev
```

Then in another terminal:

```bash
curl http://localhost:3000/healthz
curl -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ creators { handle displayName followerCount } }"}'
```

You should get back `demo_creator`. Also open http://localhost:3000/graphql in a browser — Apollo Sandbox gives you an interactive query explorer.

---

## 5. Frontend — Angular (`apps/web`)

### 5.1 Generate the app

From the **repo root**:

```bash
npx -p @angular/cli@latest ng new web --directory apps/web \
  --skip-git --style=scss --ssr=false
```

Angular creates its own `package.json` inside `apps/web`; because of the workspace glob it's automatically part of the monorepo. Run `npm install` at the root again to hoist dependencies.

### 5.2 Add Apollo Angular

```bash
cd apps/web
npx ng add apollo-angular
```

When prompted for the GraphQL endpoint, enter `http://localhost:3000/graphql`. This wires up `provideApollo` in `app.config.ts` (Angular 18 standalone style).

### 5.3 Prove the pipe works end-to-end

Replace **`apps/web/src/app/app.component.ts`** with a minimal creators list:

```ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';

const CREATORS = gql`
  query Creators {
    creators { id handle displayName followerCount }
  }
`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1>Nexus — Creator Roster (Phase 0 smoke test)</h1>
    <ul>
      @for (c of creators$ | async; track c.id) {
        <li>{{ c.displayName }} (@{{ c.handle }}) — {{ c.followerCount | number }} followers</li>
      }
    </ul>
  `,
})
export class AppComponent {
  private apollo = inject(Apollo);
  creators$ = this.apollo
    .watchQuery<{ creators: any[] }>({ query: CREATORS })
    .valueChanges.pipe(map(r => r.data.creators));
}
```

> **Note:** the `any` here is temporary and violates Standard #3 — Phase 2 introduces GraphQL Code Generator so query results are fully typed. Leave a `// TODO(phase-2)` comment; deliberately carrying a known, documented debt is also a skill.

### 5.4 Run it

```bash
# terminal 1 (root): backend
npm run dev
# terminal 2 (root): frontend
npm run dev:web
```

Open http://localhost:4200 — you should see the demo creator rendered from Postgres, through Prisma, through Apollo, into Angular. That's the whole vertical slice.

> **CORS note:** the backend's `cors()` default allows all origins, fine for dev. Tighten it before Phase 5.

---

## 6. First ADR

Create **`docs/adr/ADR-001-prisma-access-strategy.md`** using this template:

```markdown
# ADR-001: Prisma Access Strategy

## Status
Proposed

## Context
Services must contain zero SQL (guidelines §6.3) and be unit-testable
with Jest without a database. Options:
  A) Services call PrismaClient directly; unit tests mock it with
     jest-mock-extended's mockDeep<PrismaClient>().
  B) Thin repository layer per aggregate (CreatorRepository, ...);
     services depend on small interfaces; tests stub the interface.

## Decision
<yours — try writing one unit test both ways first, then decide>

## Consequences
<what gets easier, what gets more boilerplate-y>
```

---

## 7. Phase 0 Exit Checklist

- [ ] `git clone` → `docker compose up -d` → `npm install` → `npm run db:migrate && npm run db:seed` → `npm run dev` works in under 10 minutes on a clean machine
- [ ] `curl /healthz` returns `{"status":"ok"}`
- [ ] Apollo Sandbox at `/graphql` runs the `creators` query
- [ ] Angular app at :4200 renders the seeded creator
- [ ] `npm test` passes (health smoke test)
- [ ] `.env` is gitignored; `.env.example` is committed
- [ ] ADR-001 written with a real decision, not a coin flip
- [ ] Initial commit pushed with a conventional commit message (`chore: phase 0 skeleton`)

## Common Failure Modes

| Symptom | Likely cause |
|---|---|
| `P1001: Can't reach database` | Docker not running, or `DATABASE_URL` port/creds mismatch |
| Prisma types missing / stale | Run `npx prisma generate` (migrate dev does this automatically) |
| Angular can't reach API (CORS or connection refused) | Backend not running, or wrong endpoint in Apollo config |
| `Cannot use import statement outside a module` in Jest | ts-jest preset missing, or test importing compiled `dist/` |
| Two Postgres instances fighting over 5432 | A local (non-Docker) Postgres is running — stop it or remap the compose port |

**Next up (Phase 1):** replace the placeholder seed with the full faker-based generator (fixed seed, §7 volumes), and produce the ER diagram — `npx prisma generate` + an ERD tool, or export from Adminer.