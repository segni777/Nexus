# Phase 2 Guide — Backend API

**Companion to:** CMSC 4XX Project Guidelines (§6 API Design, §7 Phase 2, §8 Standards, §9 AI Policy)

**Follows:** `001-setup-skeleton.md` (Phase 0) and `002-schema-and-mock-data.md` (Phase 1)

**Goal:** Turn the Phase 0 hello-world API into the real Nexus backend: layered repositories and services, schema-first GraphQL reads and mutations, pagination, typed errors, a demonstrated DataLoader N+1 fix, a real metrics webhook, and unit/integration tests.

**Estimated time:** 10–14 hours across three small slices. Phase 2 is 25% of the project; do not try to ship it as one giant commit.

> **How to use this guide:** type the code and run each checkpoint before moving on. Wherever you see `# WHY:` or `WHY:`, stop and make sure you can explain it. Phase 2 is where “the API returns data” becomes “the API has an architecture I can defend.”

---

## 0. Repository-specific baseline (read before changing anything)

The original project guidelines name older baseline versions. Your actual working repository has already moved forward, so this guide targets what is installed—not the older examples:

| Concern | Original guideline | Your working repository | Phase 2 rule |
|---|---|---|---|
| Node | 20 LTS | Node 22 | Keep Node 22; Apollo Server 5 supports Node 20+ |
| Express | 4 | 5.2 | Keep Express 5 |
| Apollo Server | 4 | 5.5 | Keep Apollo Server 5 |
| Express adapter | `@apollo/server/express4` | `@as-integrations/express5` | Keep the separate Express 5 adapter |
| Prisma | 5 | 6.19 | Keep `prisma.config.ts` and explicit dotenv loading |
| Jest | older CommonJS examples | Jest 30 + ESM | Keep `createDefaultEsmPreset()` and `.js` import mapping |
| PostgreSQL dev port | 5432 | 5433 | Use 5433 for development; reserve 5434 for tests |
| Angular | 18 | 22 | Only update the temporary smoke query in this phase |

Two other corrections matter:

1. The current Prisma schema has **seven models**, not eight: `Creator`, `Brand`, `Campaign`, `CampaignCreator`, `Deliverable`, `MetricsSnapshot`, and `Insight`.
2. Phase 1 produced two campaign-role migrations—one created the enum and the next added the column. That is valid history. Do not delete or rewrite applied migrations.

### 0.1 Finish the Phase 1 hand-off first

Before Phase 2, these commands must be green from `nexus/`:

```bash
docker compose up -d
npm run db:reset
npm run db:verify
npm test
```

Also finish the documentation items from Phase 1:

- `work-tasks/adr/NEXUS-1.md` contains the accepted repository decision.
- `work-tasks/adr/NEXUS-2.md` contains ADR-002 with a title, status, context, decision, and consequences.
- `nexus/docs/erd.md` begins with a heading and wraps the diagram in a fenced `mermaid` block.
- `nexus/docs/ai-log.md` exists and has the Phase 1 entry.

> **WHY stop here if these are red:** Phase 2 tests the repository decision from ADR-001 and depends on deterministic Phase 1 data. Building on an unfinished hand-off turns unrelated failures into “GraphQL problems.”

### 0.2 Correct the documented development port

Your Compose file exposes Postgres on host port `5433`, so update **`nexus/.env.example`** to match the working setup:

```dotenv
DATABASE_URL=postgresql://nexus:nexus_dev_pw@localhost:5433/nexus?schema=public
PORT=3000
NODE_ENV=development
```

Keep the real **`apps/api/.env`** on port `5433` too. Never commit it.

---

## 1. What Phase 2 is building

At the end of Phase 1, the shortest read path is:

```text
GraphQL resolver -> Prisma -> PostgreSQL
```

Phase 2 deliberately adds seams:

```text
HTTP / GraphQL boundary
        |
        v
resolver or REST handler      parses transport input; no business rules
        |
        v
service                       owns business rules; no Prisma calls
        |
        v
repository                    owns Prisma queries; no HTTP or GraphQL knowledge
        |
        v
PostgreSQL
```

Those extra layers are not ceremony for its own sake:

- Unit tests replace repositories with small mocks and test services without a database.
- Integration tests keep the real repositories and run against a separate PostgreSQL container.
- GraphQL and REST can call the same service rules.
- Phase 6 can call the metrics webhook without duplicating database logic.

### 1.1 Phase 2 API contract

Implement these GraphQL reads:

| Query | Purpose |
|---|---|
| `brand`, `brands` | Brand lookup and paginated brand list |
| `creator`, `creators` | Creator detail and filterable roster |
| `campaign`, `campaigns` | Campaign detail and board data |
| `deliverable`, `deliverables` | Deliverable detail and checklist data |
| `insights` | Mock insight rows by scope |

Implement these mutations:

| Mutation | Business action |
|---|---|
| `createCreator` | Add a creator prospect |
| `updateCreatorStatus` | Move a creator through its lifecycle |
| `createCampaign` | Create a draft campaign |
| `updateCampaignStatus` | Move a campaign through its lifecycle |
| `assignCreatorToCampaign` | Create the join row with rate and role |
| `createDeliverable` | Add work for a creator already booked on the campaign |
| `updateDeliverableStatus` | Move work from assigned through posted |

Implement one REST write:

```text
POST /webhooks/metrics -> validate -> MetricsService -> metrics_snapshots
```

All GraphQL list fields use pagination. This guide chooses **offset pagination** and records the trade-off in ADR-003.

---

## 2. Work in three reviewable slices

Keep each branch/PR near the §8 target of fewer than 400 changed lines.

| Slice | Suggested branch | Deliverable |
|---|---|---|
| A | `feat/phase2-read-api` | Schema-first GraphQL, generated resolver types, repositories/services for reads, pagination |
| B | `feat/phase2-write-api` | Lifecycle mutations, typed errors, metrics webhook, unit tests |
| C | `test/phase2-integration-dataloader` | Test DB, integration tests, DataLoader demo, ADR-003, API docs |

Use `codex/` in front of those names if Codex creates the branches for you.

---

## 3. Install only the missing dependencies

From **`nexus/apps/api`**:

```bash
npm i dataloader graphql-scalars
npm i -D @graphql-codegen/cli @graphql-codegen/typescript \
  @graphql-codegen/typescript-resolvers cross-env
```

You already have Apollo, Express, Prisma, Zod, Jest, Supertest, and `jest-mock-extended`. Do not reinstall or downgrade them.

> **WHY `dataloader`:** GraphQL resolves repeated child fields independently. DataLoader batches those separate requests into one repository call and memoizes results for that GraphQL request only.

> **WHY `graphql-scalars`:** GraphQL has no built-in date or JSON types. The package supplies tested `DateTime` and `JSON` scalars instead of maintaining home-grown parsers.

> **WHY Code Generator:** `schema.graphql` is the API contract; generated resolver types make TypeScript reject resolvers that drift from it. Never edit generated files by hand.

Create the Phase 2 directories:

```bash
mkdir -p src/errors src/repositories src/services src/graphql/generated \
  src/graphql/loaders src/rest scripts test/unit test/integration/helpers
mkdir -p ../../docs/api
```

The resulting backend shape will be:

```text
apps/api/
├── codegen.ts
├── scripts/n-plus-one-demo.ts
├── src/
│   ├── errors/
│   ├── graphql/
│   │   ├── generated/          # generated; never hand-edit
│   │   ├── loaders/
│   │   ├── context.ts
│   │   ├── resolvers.ts
│   │   ├── schema.graphql
│   │   └── schema.ts
│   ├── repositories/
│   ├── rest/
│   └── services/
└── test/
    ├── unit/
    └── integration/
```

---

## 4. Define the schema first

Delete the inline schema from `src/graphql/typeDefs.ts` after the new schema is wired. Create **`apps/api/src/graphql/schema.graphql`**:

```graphql
scalar DateTime
scalar JSON

enum Platform { TIKTOK INSTAGRAM YOUTUBE }
enum CreatorStatus { PROSPECT ACTIVE PAUSED CHURNED }
enum CampaignStatus { DRAFT ACTIVE COMPLETED CANCELLED }
enum CampaignRole { PRIMARY SUPPORTING AFFILIATE }
enum DeliverableType { VIDEO POST STORY LIVESTREAM }
enum DeliverableStatus { ASSIGNED IN_REVIEW APPROVED POSTED OVERDUE }
enum InsightScope { CREATOR CAMPAIGN }

input PaginationInput {
  offset: Int! = 0
  limit: Int! = 20
}

type PageInfo {
  offset: Int!
  limit: Int!
  totalCount: Int!
  hasNextPage: Boolean!
}

input CreatorFilter {
  status: CreatorStatus
  platform: Platform
}

input CampaignFilter {
  status: CampaignStatus
  brandId: ID
  creatorId: ID
}

input DeliverableFilter {
  status: DeliverableStatus
  campaignId: ID
  creatorId: ID
}

type Brand {
  id: ID!
  name: String!
  industry: String!
  contactEmail: String!
  campaigns(page: PaginationInput): CampaignConnection!
}

type BrandConnection {
  items: [Brand!]!
  pageInfo: PageInfo!
}

type Creator {
  id: ID!
  handle: String!
  displayName: String!
  primaryPlatform: Platform!
  followerCount: Int!
  engagementRate: Float!
  ratePerPost: Int!
  status: CreatorStatus!
  createdAt: DateTime!
  campaigns(page: PaginationInput): CampaignConnection!
  deliverables(page: PaginationInput): DeliverableConnection!
}

type CreatorConnection {
  items: [Creator!]!
  pageInfo: PageInfo!
}

type Campaign {
  id: ID!
  brandId: ID!
  brand: Brand!
  name: String!
  budgetCents: Int!
  startDate: DateTime!
  endDate: DateTime!
  status: CampaignStatus!
  creators(page: PaginationInput): CampaignCreatorConnection!
  deliverables(page: PaginationInput): DeliverableConnection!
}

type CampaignConnection {
  items: [Campaign!]!
  pageInfo: PageInfo!
}

type CampaignCreator {
  campaignId: ID!
  creatorId: ID!
  creator: Creator!
  agreedRateCents: Int!
  role: CampaignRole!
}

type CampaignCreatorConnection {
  items: [CampaignCreator!]!
  pageInfo: PageInfo!
}

type Deliverable {
  id: ID!
  campaignId: ID!
  creatorId: ID!
  campaign: Campaign!
  creator: Creator!
  type: DeliverableType!
  dueDate: DateTime!
  postedUrl: String
  status: DeliverableStatus!
  metrics(page: PaginationInput): MetricsSnapshotConnection!
}

type DeliverableConnection {
  items: [Deliverable!]!
  pageInfo: PageInfo!
}

type MetricsSnapshot {
  id: ID!
  deliverableId: ID!
  capturedAt: DateTime!
  views: Int!
  likes: Int!
  comments: Int!
  shares: Int!
  watchTimeSeconds: Int!
}

type MetricsSnapshotConnection {
  items: [MetricsSnapshot!]!
  pageInfo: PageInfo!
}

type Insight {
  id: ID!
  scope: InsightScope!
  scopeId: ID!
  generatedAt: DateTime!
  model: String!
  summaryText: String!
  payloadJson: JSON!
}

type InsightConnection {
  items: [Insight!]!
  pageInfo: PageInfo!
}

input CreateCreatorInput {
  handle: String!
  displayName: String!
  primaryPlatform: Platform!
  followerCount: Int!
  engagementRate: Float!
  ratePerPost: Int!
}

input CreateCampaignInput {
  brandId: ID!
  name: String!
  budgetCents: Int!
  startDate: DateTime!
  endDate: DateTime!
}

input AssignCreatorInput {
  campaignId: ID!
  creatorId: ID!
  agreedRateCents: Int!
  role: CampaignRole!
}

input CreateDeliverableInput {
  campaignId: ID!
  creatorId: ID!
  type: DeliverableType!
  dueDate: DateTime!
}

input UpdateDeliverableStatusInput {
  id: ID!
  status: DeliverableStatus!
  postedUrl: String
}

type Query {
  health: String!
  brand(id: ID!): Brand!
  brands(page: PaginationInput): BrandConnection!
  creator(id: ID!): Creator!
  creators(page: PaginationInput, filter: CreatorFilter): CreatorConnection!
  campaign(id: ID!): Campaign!
  campaigns(page: PaginationInput, filter: CampaignFilter): CampaignConnection!
  deliverable(id: ID!): Deliverable!
  deliverables(page: PaginationInput, filter: DeliverableFilter): DeliverableConnection!
  insights(page: PaginationInput, scope: InsightScope, scopeId: ID): InsightConnection!
}

type Mutation {
  createCreator(input: CreateCreatorInput!): Creator!
  updateCreatorStatus(id: ID!, status: CreatorStatus!): Creator!
  createCampaign(input: CreateCampaignInput!): Campaign!
  updateCampaignStatus(id: ID!, status: CampaignStatus!): Campaign!
  assignCreatorToCampaign(input: AssignCreatorInput!): CampaignCreator!
  createDeliverable(input: CreateDeliverableInput!): Deliverable!
  updateDeliverableStatus(input: UpdateDeliverableStatusInput!): Deliverable!
}
```

> **WHY connection objects instead of returning arrays:** every list carries its items and pagination metadata in the same response. Phase 3 can render “showing 1–20 of 80” without making another query.

### 4.1 Load the `.graphql` file at runtime

Create **`apps/api/src/graphql/schema.ts`**:

```ts
import { readFileSync } from 'node:fs';

const schemaUrl = new URL('./schema.graphql', import.meta.url);
export const typeDefs = readFileSync(schemaUrl, 'utf8');
```

> **Prisma/Apollo version note:** keep importing `expressMiddleware` from `@as-integrations/express5`. Apollo Server 5 removed the old built-in Express integration used by many Apollo 4 tutorials.

---

## 5. Generate resolver types

Create **`apps/api/codegen.ts`**:

```ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/schema.graphql',
  generates: {
    './src/graphql/generated/resolver-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context.js#GraphQLContext',
        enumsAsTypes: true,
        strictScalars: true,
        scalars: {
          DateTime: { input: 'Date', output: 'Date' },
          JSON: { input: 'unknown', output: 'unknown' },
        },
        mappers: {
          Brand: '@prisma/client#Brand',
          Creator: '@prisma/client#Creator',
          Campaign: '@prisma/client#Campaign',
          CampaignCreator: '@prisma/client#CampaignCreator',
          Deliverable: '@prisma/client#Deliverable',
          MetricsSnapshot: '@prisma/client#MetricsSnapshot',
          Insight: '@prisma/client#Insight',
        },
      },
    },
  },
};

export default config;
```

Add these scripts to **`apps/api/package.json`**:

```json
"codegen": "graphql-codegen --config codegen.ts",
"build": "npm run codegen && tsc && mkdir -p dist/graphql && cp src/graphql/schema.graphql dist/graphql/schema.graphql"
```

Generate once:

```bash
npm run codegen
```

Confirm that `src/graphql/generated/resolver-types.ts` exists. Commit it, but never hand-edit it.

> **WHY map GraphQL objects to Prisma model types:** a `Campaign` returned from Prisma does not contain computed GraphQL fields such as `brand` or `deliverables`. Mappers tell Code Generator that those fields are resolved separately instead of incorrectly requiring them on every returned object.

---

## 6. Shared pagination and typed application errors

### 6.1 Pagination helpers

Create **`apps/api/src/repositories/page.ts`**:

```ts
export type PageRequest = { offset: number; limit: number };

export type Page<T> = PageRequest & {
  items: T[];
  totalCount: number;
};

export function normalizePage(input?: Partial<PageRequest> | null): PageRequest {
  const offset = Math.max(0, input?.offset ?? 0);
  const limit = Math.min(50, Math.max(1, input?.limit ?? 20));
  return { offset, limit };
}
```

Create **`apps/api/src/graphql/connections.ts`**:

```ts
import type { Page } from '../repositories/page.js';

export function toConnection<T>(page: Page<T>) {
  return {
    items: page.items,
    pageInfo: {
      offset: page.offset,
      limit: page.limit,
      totalCount: page.totalCount,
      hasNextPage: page.offset + page.items.length < page.totalCount,
    },
  };
}

export function pageRows<T>(rows: T[], offset: number, limit: number): Page<T> {
  return {
    items: rows.slice(offset, offset + limit),
    totalCount: rows.length,
    offset,
    limit,
  };
}
```

> **WHY cap `limit` at 50:** GraphQL lets clients ask for exactly what they want; it should not let one client ask for an unbounded table scan.

### 6.2 Application errors

Create **`apps/api/src/errors/app-error.ts`**:

```ts
export type AppErrorCode =
  | 'BAD_USER_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} was not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(entity: string, from: string, to: string) {
    super(
      `${entity} cannot move from ${from} to ${to}`,
      'INVALID_TRANSITION',
      409,
    );
  }
}

export class InputError extends AppError {
  constructor(message: string) {
    super(message, 'BAD_USER_INPUT', 400);
  }
}
```

Services throw these errors. GraphQL and REST translate them differently at their boundaries.

---

## 7. Repository layer — Prisma lives here and nowhere else

ADR-001 should now be accepted as **Option B: thin repository interfaces with dependency injection**. The important rule is:

```text
src/repositories/** may import PrismaClient
src/services/** must not import PrismaClient
```

### 7.1 Start with one complete vertical slice

Create **`apps/api/src/repositories/creator.repository.ts`**:

```ts
import type {
  Creator,
  CreatorStatus,
  Platform,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type { Page, PageRequest } from './page.js';

export type CreatorFilter = {
  status?: CreatorStatus | null;
  platform?: Platform | null;
};

export type NewCreator = {
  handle: string;
  displayName: string;
  primaryPlatform: Platform;
  followerCount: number;
  engagementRate: number;
  ratePerPost: number;
};

export interface CreatorRepository {
  findById(id: string): Promise<Creator | null>;
  findByHandle(handle: string): Promise<Creator | null>;
  findManyByIds(ids: readonly string[]): Promise<Creator[]>;
  list(filter: CreatorFilter, page: PageRequest): Promise<Page<Creator>>;
  create(input: NewCreator): Promise<Creator>;
  updateStatus(id: string, status: CreatorStatus): Promise<Creator>;
}

export class PrismaCreatorRepository implements CreatorRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.creator.findUnique({ where: { id } });
  }

  findByHandle(handle: string) {
    return this.db.creator.findUnique({ where: { handle } });
  }

  findManyByIds(ids: readonly string[]) {
    return this.db.creator.findMany({ where: { id: { in: [...ids] } } });
  }

  async list(filter: CreatorFilter, page: PageRequest): Promise<Page<Creator>> {
    const where: Prisma.CreatorWhereInput = {
      status: filter.status ?? undefined,
      primaryPlatform: filter.platform ?? undefined,
    };

    const [items, totalCount] = await Promise.all([
      this.db.creator.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.offset,
        take: page.limit,
      }),
      this.db.creator.count({ where }),
    ]);

    return { ...page, items, totalCount };
  }

  create(input: NewCreator) {
    return this.db.creator.create({ data: input });
  }

  updateStatus(id: string, status: CreatorStatus) {
    return this.db.creator.update({ where: { id }, data: { status } });
  }
}
```

> **WHY the interface matters:** unit tests mock six small methods, not the entire generated Prisma client. The implementation remains thin: translate a repository method into Prisma and return the result.

### 7.2 Implement the remaining repository contracts

Create one file per aggregate using the same pattern. These are the required methods; do not add speculative generic CRUD abstractions.

| Repository | Required methods |
|---|---|
| `BrandRepository` | `findById`, `findManyByIds`, `list` |
| `CampaignRepository` | `findById`, `findManyByIds`, `list(filter, page)`, `create`, `updateStatus`, `findAssignment`, `listAssignments`, `createAssignment` |
| `DeliverableRepository` | `findById`, `list(filter, page)`, `findManyByCreatorIds`, `create`, `updateStatus` |
| `MetricsRepository` | `listForDeliverable`, `findLatestForDeliverable`, `create` |
| `InsightRepository` | `list(scope, scopeId, page)` |

Use these Prisma filters:

```ts
// CampaignRepository.list
const where: Prisma.CampaignWhereInput = {
  status: filter.status ?? undefined,
  brandId: filter.brandId ?? undefined,
  creators: filter.creatorId
    ? { some: { creatorId: filter.creatorId } }
    : undefined,
};

// DeliverableRepository.list
const where: Prisma.DeliverableWhereInput = {
  status: filter.status ?? undefined,
  campaignId: filter.campaignId ?? undefined,
  creatorId: filter.creatorId ?? undefined,
};

// InsightRepository.list
const where: Prisma.InsightWhereInput = {
  scope: scope ?? undefined,
  scopeId: scopeId ?? undefined,
};
```

Every list method must:

1. Apply a deterministic `orderBy` with `id` as the final tie-breaker.
2. Use `skip` and `take` from the normalized page.
3. Return both the page of rows and a matching `count`.

Create **`apps/api/src/repositories/index.ts`** as the composition point:

```ts
import type { PrismaClient } from '@prisma/client';
import { PrismaBrandRepository } from './brand.repository.js';
import { PrismaCampaignRepository } from './campaign.repository.js';
import { PrismaCreatorRepository } from './creator.repository.js';
import { PrismaDeliverableRepository } from './deliverable.repository.js';
import { PrismaInsightRepository } from './insight.repository.js';
import { PrismaMetricsRepository } from './metrics.repository.js';

export function createRepositories(db: PrismaClient) {
  return {
    brands: new PrismaBrandRepository(db),
    campaigns: new PrismaCampaignRepository(db),
    creators: new PrismaCreatorRepository(db),
    deliverables: new PrismaDeliverableRepository(db),
    insights: new PrismaInsightRepository(db),
    metrics: new PrismaMetricsRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
```

Checkpoint:

```bash
npm run build
```

Do not move on while repository types are red.

---

## 8. Service layer — put the rules here

Repositories answer “how do I store/fetch it?” Services answer “is this action allowed?”

### 8.1 Creator service example

Create **`apps/api/src/services/creator.service.ts`**:

```ts
import type { CreatorStatus } from '@prisma/client';
import {
  ConflictError,
  InputError,
  InvalidTransitionError,
  NotFoundError,
} from '../errors/app-error.js';
import type {
  CreatorFilter,
  CreatorRepository,
  NewCreator,
} from '../repositories/creator.repository.js';
import { normalizePage, type PageRequest } from '../repositories/page.js';

const transitions: Record<CreatorStatus, readonly CreatorStatus[]> = {
  PROSPECT: ['ACTIVE', 'CHURNED'],
  ACTIVE: ['PAUSED', 'CHURNED'],
  PAUSED: ['ACTIVE', 'CHURNED'],
  CHURNED: [],
};

export class CreatorService {
  constructor(private readonly creators: CreatorRepository) {}

  list(filter: CreatorFilter, page?: Partial<PageRequest> | null) {
    return this.creators.list(filter, normalizePage(page));
  }

  async get(id: string) {
    const creator = await this.creators.findById(id);
    if (!creator) throw new NotFoundError('Creator', id);
    return creator;
  }

  findManyByIds(ids: readonly string[]) {
    return this.creators.findManyByIds(ids);
  }

  async create(input: NewCreator) {
    if (!input.handle.trim()) throw new InputError('handle cannot be empty');
    if (input.followerCount < 0) throw new InputError('followerCount cannot be negative');
    if (input.engagementRate < 0 || input.engagementRate > 1) {
      throw new InputError('engagementRate must be between 0 and 1');
    }
    if (input.ratePerPost < 0) throw new InputError('ratePerPost cannot be negative');

    const existing = await this.creators.findByHandle(input.handle);
    if (existing) throw new ConflictError(`Creator handle ${input.handle} already exists`);
    return this.creators.create(input);
  }

  async updateStatus(id: string, next: CreatorStatus) {
    const creator = await this.get(id);
    if (creator.status === next) return creator;
    if (!transitions[creator.status].includes(next)) {
      throw new InvalidTransitionError('Creator', creator.status, next);
    }
    return this.creators.updateStatus(id, next);
  }
}
```

### 8.2 Required business rules for the other services

Implement these rules explicitly and cover them with unit tests:

#### Campaign service

- The brand must exist.
- `budgetCents` must be positive.
- `startDate` must be earlier than `endDate`.
- New campaigns start as `DRAFT`.
- Allowed status transitions:
  - `DRAFT -> ACTIVE | CANCELLED`
  - `ACTIVE -> COMPLETED | CANCELLED`
  - `COMPLETED` and `CANCELLED` are terminal.
- A creator can only be assigned once per campaign.
- `agreedRateCents` must be positive.
- Do not add creators to completed or cancelled campaigns.

#### Deliverable service

- The `(campaignId, creatorId)` pair must already exist in `campaign_creators`.
- The due date must fall within the campaign date range.
- New deliverables start as `ASSIGNED`.
- Allowed status transitions:
  - `ASSIGNED -> IN_REVIEW | OVERDUE`
  - `IN_REVIEW -> ASSIGNED | APPROVED | OVERDUE`
  - `APPROVED -> IN_REVIEW | POSTED | OVERDUE`
  - `OVERDUE -> IN_REVIEW | APPROVED | POSTED`
  - `POSTED` is terminal.
- Moving to `POSTED` requires a valid `postedUrl`.

#### Metrics service

- The deliverable must exist and have status `POSTED`.
- Every metric must be a non-negative integer.
- A new snapshot cannot decrease views, likes, comments, shares, or watch time relative to the latest snapshot.
- The repository performs the insert only after all checks pass.

#### Insight and brand services

- Reads only in this phase.
- A singular lookup throws `NotFoundError` rather than returning `null` because the GraphQL fields are non-null.

Create **`apps/api/src/services/index.ts`**:

```ts
import type { Repositories } from '../repositories/index.js';
import { BrandService } from './brand.service.js';
import { CampaignService } from './campaign.service.js';
import { CreatorService } from './creator.service.js';
import { DeliverableService } from './deliverable.service.js';
import { InsightService } from './insight.service.js';
import { MetricsService } from './metrics.service.js';

export function createServices(repositories: Repositories) {
  const brands = new BrandService(repositories.brands);
  const creators = new CreatorService(repositories.creators);
  const campaigns = new CampaignService(
    repositories.campaigns,
    repositories.brands,
    repositories.creators,
  );
  const deliverables = new DeliverableService(
    repositories.deliverables,
    repositories.campaigns,
  );

  return {
    brands,
    campaigns,
    creators,
    deliverables,
    insights: new InsightService(repositories.insights),
    metrics: new MetricsService(repositories.metrics, repositories.deliverables),
  };
}

export type Services = ReturnType<typeof createServices>;
```

> **WHY services receive repositories through constructors:** tests can pass mocks. No Jest module-mocking tricks and no database are required for a service unit test.

---

## 9. DataLoader and request context

The N+1 case we will solve is:

```graphql
query CreatorDeliverables {
  creators(page: { limit: 20 }) {
    items {
      handle
      deliverables(page: { limit: 5 }) {
        items { id status }
      }
    }
  }
}
```

Without batching, 20 creators can cause one creator query plus 20 deliverable queries. With DataLoader, those child reads become one `creatorId IN (...)` query.

### 9.1 Add the repository/service batch method

`DeliverableRepository.findManyByCreatorIds(ids)` must issue one query:

```ts
return db.deliverable.findMany({
  where: { creatorId: { in: [...ids] } },
  orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
});
```

Expose it through `DeliverableService.findManyByCreatorIds`. This method contains no new business rule; it is the batching seam.

### 9.2 Create per-request loaders

Create **`apps/api/src/graphql/loaders/index.ts`**:

```ts
import DataLoader from 'dataloader';
import type { Brand, Campaign, Creator, Deliverable } from '@prisma/client';
import type { Services } from '../../services/index.js';

function orderByKey<T extends { id: string }>(
  keys: readonly string[],
  rows: readonly T[],
  entity: string,
) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return keys.map((key) => byId.get(key) ?? new Error(`${entity} ${key} was not found`));
}

export function createLoaders(services: Services) {
  return {
    brandById: new DataLoader<string, Brand>(async (ids) =>
      orderByKey(ids, await services.brands.findManyByIds(ids), 'Brand'),
    ),
    campaignById: new DataLoader<string, Campaign>(async (ids) =>
      orderByKey(ids, await services.campaigns.findManyByIds(ids), 'Campaign'),
    ),
    creatorById: new DataLoader<string, Creator>(async (ids) =>
      orderByKey(ids, await services.creators.findManyByIds(ids), 'Creator'),
    ),
    deliverablesByCreatorId: new DataLoader<string, Deliverable[]>(async (creatorIds) => {
      const rows = await services.deliverables.findManyByCreatorIds(creatorIds);
      const grouped = new Map<string, Deliverable[]>();
      for (const row of rows) {
        const group = grouped.get(row.creatorId) ?? [];
        group.push(row);
        grouped.set(row.creatorId, group);
      }
      return creatorIds.map((id) => grouped.get(id) ?? []);
    }),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
```

Create **`apps/api/src/graphql/context.ts`**:

```ts
import { createLoaders, type Loaders } from './loaders/index.js';
import type { Services } from '../services/index.js';

export type GraphQLContext = {
  services: Services;
  loaders: Loaders;
};

export function createContext(services: Services): GraphQLContext {
  return {
    services,
    loaders: createLoaders(services),
  };
}
```

> **WHY loaders are created inside the context function:** one loader cache belongs to one GraphQL request. A global loader could serve stale or user-specific data to another request later.

> **DataLoader correctness rule:** the batch function must return exactly one result per key, in the same key order. Database `IN` queries do not promise that order; `orderByKey` restores it.

---

## 10. Typed resolvers

Replace **`apps/api/src/graphql/resolvers.ts`**. The exact service method names below are the contract your services must expose:

```ts
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';
import { normalizePage } from '../repositories/page.js';
import { pageRows, toConnection } from './connections.js';
import type { Resolvers } from './generated/resolver-types.js';

export const resolvers: Resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,

  Query: {
    health: () => 'ok',
    brand: (_parent, { id }, { services }) => services.brands.get(id),
    brands: async (_parent, { page }, { services }) =>
      toConnection(await services.brands.list(page)),
    creator: (_parent, { id }, { services }) => services.creators.get(id),
    creators: async (_parent, { page, filter }, { services }) =>
      toConnection(await services.creators.list(filter ?? {}, page)),
    campaign: (_parent, { id }, { services }) => services.campaigns.get(id),
    campaigns: async (_parent, { page, filter }, { services }) =>
      toConnection(await services.campaigns.list(filter ?? {}, page)),
    deliverable: (_parent, { id }, { services }) => services.deliverables.get(id),
    deliverables: async (_parent, { page, filter }, { services }) =>
      toConnection(await services.deliverables.list(filter ?? {}, page)),
    insights: async (_parent, { page, scope, scopeId }, { services }) =>
      toConnection(await services.insights.list(scope, scopeId, page)),
  },

  Mutation: {
    createCreator: (_parent, { input }, { services }) => services.creators.create(input),
    updateCreatorStatus: (_parent, { id, status }, { services }) =>
      services.creators.updateStatus(id, status),
    createCampaign: (_parent, { input }, { services }) => services.campaigns.create(input),
    updateCampaignStatus: (_parent, { id, status }, { services }) =>
      services.campaigns.updateStatus(id, status),
    assignCreatorToCampaign: (_parent, { input }, { services }) =>
      services.campaigns.assignCreator(input),
    createDeliverable: (_parent, { input }, { services }) =>
      services.deliverables.create(input),
    updateDeliverableStatus: (_parent, { input }, { services }) =>
      services.deliverables.updateStatus(input),
  },

  Brand: {
    campaigns: async (brand, { page }, { services }) =>
      toConnection(await services.campaigns.list({ brandId: brand.id }, page)),
  },

  Creator: {
    campaigns: async (creator, { page }, { services }) =>
      toConnection(await services.campaigns.list({ creatorId: creator.id }, page)),
    deliverables: async (creator, { page }, { loaders }) => {
      const normalized = normalizePage(page);
      const rows = await loaders.deliverablesByCreatorId.load(creator.id);
      return toConnection(pageRows(rows, normalized.offset, normalized.limit));
    },
  },

  Campaign: {
    brand: (campaign, _args, { loaders }) => loaders.brandById.load(campaign.brandId),
    creators: async (campaign, { page }, { services }) =>
      toConnection(await services.campaigns.listAssignments(campaign.id, page)),
    deliverables: async (campaign, { page }, { services }) =>
      toConnection(await services.deliverables.list({ campaignId: campaign.id }, page)),
  },

  CampaignCreator: {
    creator: (assignment, _args, { loaders }) =>
      loaders.creatorById.load(assignment.creatorId),
  },

  Deliverable: {
    campaign: (deliverable, _args, { loaders }) =>
      loaders.campaignById.load(deliverable.campaignId),
    creator: (deliverable, _args, { loaders }) =>
      loaders.creatorById.load(deliverable.creatorId),
    metrics: async (deliverable, { page }, { services }) =>
      toConnection(await services.metrics.list(deliverable.id, page)),
  },
};
```

Run:

```bash
npm run codegen
npm run build
```

Generated-type failures here are useful. They usually mean a service returns the wrong object or the resolver name no longer matches `schema.graphql`.

---

## 11. Map errors without leaking internals

Create **`apps/api/src/graphql/format-error.ts`**:

```ts
import type { GraphQLFormattedError } from 'graphql';
import { unwrapResolverError } from '@apollo/server/errors';
import { AppError } from '../errors/app-error.js';

export function formatGraphQLError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);

  if (original instanceof AppError) {
    return {
      message: original.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code: original.code },
    };
  }

  const publicCodes = new Set([
    'GRAPHQL_PARSE_FAILED',
    'GRAPHQL_VALIDATION_FAILED',
    'BAD_USER_INPUT',
  ]);
  const code = String(formatted.extensions?.code ?? '');
  if (publicCodes.has(code)) {
    return {
      message: formatted.message,
      locations: formatted.locations,
      path: formatted.path,
      extensions: { code },
    };
  }

  return {
    message: 'Internal server error',
    locations: formatted.locations,
    path: formatted.path,
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  };
}
```

> **WHY hide unknown messages:** Prisma and JavaScript errors can contain table names, connection details, or stack traces. Log the real error server-side; return a stable public error to the client.

Create **`apps/api/src/config/logger.ts`**:

```ts
import pino from 'pino';

export const logger = pino();
```

Create **`apps/api/src/graphql/error-logging-plugin.ts`** so the hidden error is still available in structured server logs:

```ts
import type { ApolloServerPlugin } from '@apollo/server';
import { logger } from '../config/logger.js';
import type { GraphQLContext } from './context.js';

export const errorLoggingPlugin: ApolloServerPlugin<GraphQLContext> = {
  async requestDidStart() {
    return {
      async didEncounterErrors({ errors }) {
        for (const error of errors) {
          logger.error(
            { err: error.originalError ?? error },
            'GraphQL request failed',
          );
        }
      },
    };
  },
};
```

---

## 12. Flesh out the REST metrics seam

Create **`apps/api/src/rest/metrics.routes.ts`**:

```ts
import { Router } from 'express';
import { z } from 'zod';
import type { MetricsService } from '../services/metrics.service.js';

const MetricsBody = z.object({
  deliverableId: z.string().uuid(),
  capturedAt: z.coerce.date(),
  views: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  shares: z.number().int().nonnegative(),
  watchTimeSeconds: z.number().int().nonnegative(),
});

export function metricsRoutes(metrics: MetricsService) {
  const router = Router();

  router.post('/metrics', async (req, res) => {
    const input = MetricsBody.parse(req.body);
    const snapshot = await metrics.record(input);
    res.status(201).json({ data: snapshot });
  });

  return router;
}
```

Create **`apps/api/src/rest/error-handler.ts`**:

```ts
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: 'BAD_USER_INPUT', issues: error.issues },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.httpStatus).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  req.log.error({ err: error }, 'Unhandled REST error');
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  });
};
```

The route performs transport validation and orchestration. The service still owns the rule that metrics can only be written to a posted deliverable and cannot move backward.

> **Express 5 compatibility note:** rejected promises from async route handlers are forwarded to error middleware automatically. Do not copy an Express 4 `asyncHandler` wrapper into this project unless you can explain why it is still needed.

---

## 13. Compose the application in `server.ts`

Replace **`apps/api/src/server.ts`**:

```ts
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import pinoHttp from 'pino-http';
import type { PrismaClient } from '@prisma/client';
import { logger } from './config/logger.js';
import { prisma } from './db/prisma.js';
import { createRepositories } from './repositories/index.js';
import { createServices } from './services/index.js';
import { createContext, type GraphQLContext } from './graphql/context.js';
import { errorLoggingPlugin } from './graphql/error-logging-plugin.js';
import { formatGraphQLError } from './graphql/format-error.js';
import { resolvers } from './graphql/resolvers.js';
import { typeDefs } from './graphql/schema.js';
import { metricsRoutes } from './rest/metrics.routes.js';
import { errorHandler } from './rest/error-handler.js';

export async function createServer(db: PrismaClient = prisma) {
  const repositories = createRepositories(db);
  const services = createServices(repositories);
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(cors());
  app.use(express.json());

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
  app.use('/webhooks', metricsRoutes(services.metrics));

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    formatError: formatGraphQLError,
    includeStacktraceInErrorResponses: false,
    plugins: [errorLoggingPlugin],
  });
  await apollo.start();

  app.use(
    '/graphql',
    expressMiddleware(apollo, {
      context: async () => createContext(services),
    }),
  );

  app.use(errorHandler);
  return app;
}
```

Delete the old `src/graphql/typeDefs.ts` after imports no longer reference it.

> **WHY `createServer(db = prisma)`:** production uses the singleton by default. Integration tests can inject a client connected to the test database without changing route or resolver code.

---

## 14. Keep the temporary Angular smoke page alive

Changing `creators` from an array to a connection changes the Phase 0 query shape. Update **`apps/web/src/app/app.component.ts`** so the vertical slice still works:

```ts
type CreatorRow = {
  id: string;
  handle: string;
  displayName: string;
  followerCount: number;
};

type CreatorRosterResult = {
  creators: { items: CreatorRow[] };
};

const CREATORS = gql`
  query CreatorRoster {
    creators(page: { offset: 0, limit: 20 }) {
      items { id handle displayName followerCount }
    }
  }
`;

// Inside AppComponent:
creators$ = this.apollo
  .watchQuery<CreatorRosterResult>({ query: CREATORS })
  .valueChanges.pipe(map((result) => result.data?.creators.items ?? []));
```

This removes the temporary `any`. Phase 3 will replace this hand-written operation type with generated Apollo Angular client types.

---

## 15. Unit tests — services with mocked repositories

Keep your existing ESM preset. Split unit and integration configs so unit tests never require Docker.

Create **`apps/api/jest.unit.config.ts`**:

```ts
import type { Config } from 'jest';
import { createDefaultEsmPreset } from 'ts-jest';

const config: Config = {
  ...createDefaultEsmPreset(),
  testEnvironment: 'node',
  roots: ['<rootDir>/test/unit'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: ['src/services/**/*.ts'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};

export default config;
```

Write tests before filling in each service rule. Example **`apps/api/test/unit/creator.service.test.ts`**:

```ts
import { mock, type MockProxy } from 'jest-mock-extended';
import type { CreatorRepository } from '../../src/repositories/creator.repository.js';
import { CreatorService } from '../../src/services/creator.service.js';

describe('CreatorService', () => {
  let repository: MockProxy<CreatorRepository>;
  let service: CreatorService;

  beforeEach(() => {
    repository = mock<CreatorRepository>();
    service = new CreatorService(repository);
  });

  it('rejects engagement rates above 100%', async () => {
    await expect(service.create({
      handle: 'sample',
      displayName: 'Sample Creator',
      primaryPlatform: 'TIKTOK',
      followerCount: 1000,
      engagementRate: 1.01,
      ratePerPost: 5000,
    })).rejects.toMatchObject({ code: 'BAD_USER_INPUT' });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid ACTIVE to PROSPECT transition', async () => {
    repository.findById.mockResolvedValue({
      id: 'creator-1',
      handle: 'sample',
      displayName: 'Sample Creator',
      primaryPlatform: 'TIKTOK',
      followerCount: 1000,
      engagementRate: 0.05,
      ratePerPost: 5000,
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });

    await expect(service.updateStatus('creator-1', 'PROSPECT'))
      .rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });
});
```

Required unit-test groups:

- Creator validation and status transitions.
- Campaign date/budget validation and status transitions.
- Duplicate campaign assignment rejection.
- Deliverable requires a real campaign/creator assignment.
- Deliverable status transition rules and required posted URL.
- Metrics reject non-posted deliverables.
- Metrics reject any decreasing cumulative value.
- Not-found errors for singular reads.

Add scripts to **`apps/api/package.json`**:

```json
"test:unit": "NODE_OPTIONS=--experimental-vm-modules jest --config jest.unit.config.ts --runInBand",
"test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --config jest.unit.config.ts --runInBand --coverage"
```

Run:

```bash
npm run test:unit
npm run test:coverage
```

> **WHY coverage is scoped to services:** the rubric asks for at least 80% service coverage. A global number can be inflated by generated files, trivial resolvers, or seed code while business rules remain untested.

---

## 16. Integration tests — a real, separate PostgreSQL database

Never point integration tests at the development database. Add this service to **`nexus/docker-compose.yml`**:

```yaml
  test-db:
    image: postgres:16-alpine
    profiles: ["test"]
    environment:
      POSTGRES_USER: nexus_test
      POSTGRES_PASSWORD: nexus_test_pw
      POSTGRES_DB: nexus_test
    ports:
      - "5434:5432"
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nexus_test -d nexus_test"]
      interval: 2s
      timeout: 3s
      retries: 20
```

> **WHY port 5434:** port 5433 already belongs to the development database. A separate URL prevents an integration test cleanup from deleting your Phase 1 data.

Create **`apps/api/jest.integration.config.ts`**:

```ts
import type { Config } from 'jest';
import { createDefaultEsmPreset } from 'ts-jest';

const config: Config = {
  ...createDefaultEsmPreset(),
  testEnvironment: 'node',
  roots: ['<rootDir>/test/integration'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 30_000,
};

export default config;
```

Once both new configurations work, delete the old `apps/api/jest.config.ts`. Leaving three competing Jest configurations makes an accidental plain `npx jest` ambiguous and can run integration files without the protected test URL.

Add these scripts to **`apps/api/package.json`**:

```json
"test": "npm run test:unit && npm run test:integration",
"db:test:deploy": "prisma migrate deploy",
"test:db:up": "docker compose -f ../../docker-compose.yml --profile test up -d --wait test-db",
"test:db:down": "docker compose -f ../../docker-compose.yml --profile test rm -sf test-db",
"test:integration": "npm run test:db:up && cross-env DATABASE_URL=postgresql://nexus_test:nexus_test_pw@localhost:5434/nexus_test?schema=public NODE_ENV=test npm run db:test:deploy && cross-env DATABASE_URL=postgresql://nexus_test:nexus_test_pw@localhost:5434/nexus_test?schema=public NODE_ENV=test NODE_OPTIONS=--experimental-vm-modules jest --config jest.integration.config.ts --runInBand"
```

> **WHY `migrate deploy`, not `migrate dev`:** tests and CI apply existing committed migrations. They must never invent, edit, or prompt for a development migration.

### 16.1 Test database helper

Create **`apps/api/test/integration/helpers/database.ts`**:

```ts
import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient();

export async function resetTestDb() {
  await testDb.insight.deleteMany();
  await testDb.metricsSnapshot.deleteMany();
  await testDb.deliverable.deleteMany();
  await testDb.campaignCreator.deleteMany();
  await testDb.campaign.deleteMany();
  await testDb.creator.deleteMany();
  await testDb.brand.deleteMany();
}

export async function seedIntegrationFixture() {
  const brand = await testDb.brand.create({
    data: {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'Test Brand',
      industry: 'Testing',
      contactEmail: 'brand@example.com',
    },
  });
  const creator = await testDb.creator.create({
    data: {
      id: '20000000-0000-4000-8000-000000000001',
      handle: 'integration_creator',
      displayName: 'Integration Creator',
      primaryPlatform: 'TIKTOK',
      followerCount: 10_000,
      engagementRate: 0.05,
      ratePerPost: 50_000,
      status: 'ACTIVE',
    },
  });
  const campaign = await testDb.campaign.create({
    data: {
      id: '30000000-0000-4000-8000-000000000001',
      brandId: brand.id,
      name: 'Integration Campaign',
      budgetCents: 1_000_000,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-02-01T00:00:00Z'),
      status: 'ACTIVE',
    },
  });
  await testDb.campaignCreator.create({
    data: {
      campaignId: campaign.id,
      creatorId: creator.id,
      agreedRateCents: 50_000,
      role: 'PRIMARY',
    },
  });
  const deliverable = await testDb.deliverable.create({
    data: {
      id: '40000000-0000-4000-8000-000000000001',
      campaignId: campaign.id,
      creatorId: creator.id,
      type: 'VIDEO',
      dueDate: new Date('2026-01-15T00:00:00Z'),
      postedUrl: 'https://example.com/posts/1',
      status: 'POSTED',
    },
  });
  return { brand, creator, campaign, deliverable };
}
```

### 16.2 Integration tests to write

Move the Phase 0 smoke test to `test/integration/health.test.ts`, then add:

1. `graphql-read.test.ts`
   - Seed the fixture.
   - POST `/graphql` with `creators(page: { limit: 1 })`.
   - Assert the item and `pageInfo.totalCount`.
   - Query a missing creator and assert `extensions.code === "NOT_FOUND"` with no `stacktrace`.
2. `graphql-mutations.test.ts`
   - Create a campaign through GraphQL.
   - Assign a creator.
   - Create a deliverable.
   - Assert rows exist with Prisma.
3. `metrics-webhook.test.ts`
   - POST a valid snapshot to `/webhooks/metrics`; assert `201` and a database row.
   - POST decreasing metrics; assert `409` and no second row.
   - POST malformed JSON values; assert `400`.

Skeleton **`apps/api/test/integration/graphql-read.test.ts`**:

```ts
import request from 'supertest';
import { createServer } from '../../src/server.js';
import {
  resetTestDb,
  seedIntegrationFixture,
  testDb,
} from './helpers/database.js';

describe('GraphQL reads', () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedIntegrationFixture();
  });

  afterAll(async () => {
    await resetTestDb();
    await testDb.$disconnect();
  });

  it('returns a paginated creator roster', async () => {
    const app = await createServer(testDb);
    const response = await request(app)
      .post('/graphql')
      .send({
        query: `
          query {
            creators(page: { offset: 0, limit: 1 }) {
              items { id handle }
              pageInfo { totalCount hasNextPage }
            }
          }
        `,
      });

    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.creators.items).toHaveLength(1);
    expect(response.body.data.creators.pageInfo.totalCount).toBe(1);
  });
});
```

Run:

```bash
npm run test:integration
npm run test:db:down
```

`test:db:down` deletes only the disposable `test-db` container and its tmpfs data. It does not touch the development `db` service or named `pgdata` volume.

---

## 17. Demonstrate the N+1 before/after

Create **`apps/api/scripts/n-plus-one-demo.ts`**:

```ts
import 'dotenv/config';
import DataLoader from 'dataloader';
import { PrismaClient, type Deliverable } from '@prisma/client';

let queryCount = 0;
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (event) => {
  queryCount += 1;
  console.log(`${queryCount}. ${event.query.replace(/\s+/g, ' ').trim()}`);
});

const creators = await prisma.creator.findMany({
  orderBy: { id: 'asc' },
  take: 10,
});

console.log('\nNAIVE: one deliverable query per creator');
queryCount = 0;
for (const creator of creators) {
  await prisma.deliverable.findMany({ where: { creatorId: creator.id } });
}
console.log(`Naive child queries: ${queryCount}`);

console.log('\nBATCHED: all creator ids in one query');
queryCount = 0;
const loader = new DataLoader<string, Deliverable[]>(async (creatorIds) => {
  const rows = await prisma.deliverable.findMany({
    where: { creatorId: { in: [...creatorIds] } },
  });
  return creatorIds.map((id) => rows.filter((row) => row.creatorId === id));
});

await Promise.all(creators.map((creator) => loader.load(creator.id)));
console.log(`Batched child queries: ${queryCount}`);

await prisma.$disconnect();
```

Add:

```json
"demo:n-plus-one": "tsx scripts/n-plus-one-demo.ts"
```

Run against the Phase 1 seed:

```bash
npm run demo:n-plus-one
```

Expected shape:

```text
Naive child queries: 10
Batched child queries: 1
```

Save the terminal output or a screenshot for the Phase 2 demo.

> **WHY use creator → deliverables:** Prisma may internally batch some simultaneous `findUnique` calls. `findMany` child collections still demonstrate the N+1 clearly and match the dashboard’s nested read path.

---

## 18. ADR-003 — Pagination strategy

Create **`work-tasks/adr/NEXUS-3.md`**:

```markdown
# ADR-003: GraphQL Pagination Strategy

## Status
Accepted

## Context
Every GraphQL list must be paginated. Nexus currently serves a small internal
agency dashboard backed by deterministic local data. The Phase 3 UI benefits
from page numbers and total counts. Prisma supports both offset pagination
(`skip`/`take`) and cursor pagination.

Offset pagination is simple, supports direct jumps to any page, and makes a
`totalCount` response straightforward. Its costs are slower queries at very
large offsets and possible page movement when rows are inserted concurrently.

Cursor pagination scales better for continuously changing feeds, but it makes
arbitrary page jumps and exact page-number UI more complicated. It also requires
a stable unique ordering cursor.

## Decision
Use offset pagination for all Phase 2 list fields. Defaults are offset 0 and
limit 20; the server caps limit at 50. Every repository uses a deterministic
order with `id` as the final tie-breaker.

## Consequences
- Phase 3 can render page numbers and total counts simply.
- Repository code maps directly to Prisma `skip` and `take`.
- Clients cannot request an unbounded list.
- Very deep pages will become inefficient at large scale.
- Revisit cursor pagination if Nexus becomes a high-write feed or list sizes
  grow beyond the internal-dashboard use case. That change requires a new ADR
  and a versioned GraphQL schema transition.
```

This is ADR three of the minimum four due by Phase 4.

---

## 19. Document and exercise the API

Create **`nexus/docs/api/graphql.md`** with:

- The GraphQL endpoint: `POST /graphql`.
- The REST endpoint: `POST /webhooks/metrics`.
- Pagination defaults and maximum.
- Every public error code.
- One example query and one example mutation.
- The exact webhook JSON body.

Useful manual checks from `nexus/`:

```bash
npm run dev
```

Then in a second terminal:

```bash
curl http://localhost:3000/healthz

curl -X POST http://localhost:3000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ creators(page:{limit:2}) { items { id handle } pageInfo { totalCount hasNextPage } } }"}'
```

Use Apollo Sandbox for nested queries and lifecycle mutations. Do not test mutations against IDs you care about without resetting afterward; the Phase 1 database is deterministic, so `npm run db:reset` restores it.

### 19.1 Update the AI log

Add a Phase 2 entry to **`nexus/docs/ai-log.md`** covering:

- What you asked AI to scaffold or review.
- Which generated suggestions you rejected or rewrote.
- Why services depend on repository interfaces.
- What the N+1 before/after demonstrated.
- Why you chose offset pagination.
- Any Apollo 5/Express 5 or Prisma 6 compatibility issue you encountered.

This is valuable interview material because it shows design judgment, not merely prompt usage.

---

## 20. Full verification loop

From **`nexus/`**:

```bash
docker compose up -d
npm run db:reset
npm run db:verify
npm run build
npm run test --workspace=apps/api
npm run test:db:down --workspace=apps/api
npm run dev
```

In another terminal:

```bash
npm run dev:web
```

Confirm:

1. `/healthz` still returns `{"status":"ok"}`.
2. Apollo Sandbox can run every documented query and mutation.
3. The Angular Phase 0 roster still renders using the paginated response.
4. A webhook creates a real `metrics_snapshots` row.
5. Invalid transitions return a public typed code, not a stack trace.
6. Unit service coverage is at least 80%.
7. Integration tests use port 5434 and leave Phase 1 development data unchanged.
8. The N+1 demo shows many child queries becoming one.

---

## 21. Phase 2 exit checklist

- [ ] Phase 1 preflight is fully green; ADR-001 and ADR-002 are complete.
- [ ] Apollo Server 5 still uses `@as-integrations/express5`.
- [ ] Prisma 6 scripts that run directly begin with `import 'dotenv/config'`.
- [ ] GraphQL schema lives in `src/graphql/schema.graphql`, not an inline TypeScript string.
- [ ] `npm run codegen` produces typed resolver signatures and generated code is not hand-edited.
- [ ] All singular and list read paths in §1.1 work.
- [ ] Every GraphQL list field is paginated and capped at 50.
- [ ] Creator, campaign, assignment, and deliverable lifecycle mutations work.
- [ ] Resolvers/routes contain no business logic; services import no Prisma client.
- [ ] Typed GraphQL errors expose stable codes and never expose stack traces.
- [ ] `POST /webhooks/metrics` validates and persists a monotonic snapshot.
- [ ] DataLoader instances are created per request.
- [ ] N+1 demo shows the before/after query count.
- [ ] Unit tests cover service rules at ≥80%.
- [ ] Integration tests run against PostgreSQL on 5434 after `prisma migrate deploy`.
- [ ] Phase 1 `db:verify` and the original health check remain green.
- [ ] Temporary Angular roster works with the connection response and contains no `any`.
- [ ] API contract is documented in `nexus/docs/api/graphql.md`.
- [ ] `work-tasks/adr/NEXUS-3.md` and `nexus/docs/ai-log.md` are complete.
- [ ] Work is split into reviewable conventional commits (for example `feat: add paginated GraphQL read API`, `feat: add lifecycle mutations and metrics webhook`, `test: add backend integration suite`).

---

## 22. Common failure modes

| Symptom | Likely cause |
|---|---|
| `Package subpath './express4' is not defined` | An Apollo 4 tutorial import slipped in; use `@as-integrations/express5` |
| Codegen says a resolver return type is wrong | Schema changed without updating the service/repository contract, or a Prisma mapper is missing |
| `Cannot find schema.graphql` after `npm start` | Build script did not copy the schema into `dist/graphql` |
| `DATABASE_URL` is undefined in a script | Direct Prisma 6 script is missing `import 'dotenv/config'`, or test env was set after imports |
| Integration tests delete Phase 1 data | Test command used port 5433 instead of the isolated test URL on 5434—stop immediately and reset dev data |
| `P1001` during integration setup | `test-db` is not healthy; run `npm run test:db:up` and inspect `docker compose ps` |
| Jest reports ESM import errors | The ESM preset or `.js` `moduleNameMapper` was removed |
| A GraphQL list returns an array instead of `{ items, pageInfo }` | Resolver forgot `toConnection(...)` |
| N+1 demo still logs one query per creator | DataLoader was instantiated inside the field resolver instead of once in request context |
| DataLoader returns the wrong creator/brand | Batch result order was not realigned to key order |
| DataLoader cache leaks between requests | Loaders were created globally rather than in `createContext()` |
| `POSTED` mutation succeeds without a URL | Rule was placed only in the UI or resolver instead of `DeliverableService` |
| Webhook returns Prisma’s raw error | REST error middleware is registered before routes or not registered at all |
| Service coverage is below 80% | Terminal/invalid transitions and failure branches are missing tests |
| Angular roster becomes blank | Phase 0 query still expects `creators` to be an array instead of `creators.items` |

---

## 23. Official compatibility references

- Apollo Server Express middleware: <https://www.apollographql.com/docs/apollo-server/api/express-middleware>
- Express 5 migration and rejected-promise handling: <https://expressjs.com/en/guide/migrating-5/>
- GraphQL Code Generator TypeScript resolvers: <https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-resolvers>
- DataLoader batching and per-request caching: <https://github.com/graphql/dataloader>
- Prisma unit testing: <https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing>
- Prisma integration testing: <https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing>

**Next up (Phase 3 — Angular Dashboard):** replace the Phase 0 smoke component with the creator roster, campaign board, campaign detail/metrics chart, and insights panel. Configure generated Apollo Angular operation types, lazy feature routes, and loading/error/empty states against the Phase 2 contract.
