# Phase 3 Guide - Angular Dashboard

**Companion to:** `PROJECT_GUIDELINES.md` (Sections 4.3, 7 Phase 3, 8, and 9)

**Follows:** Phase 2 backend API

**Goal:** Replace the temporary Angular smoke page with a typed, routed dashboard
containing a creator roster, campaign board, campaign detail view with a correct
cumulative metrics chart, and an insights panel.

**Estimated effort:** 12-16 hours across five reviewable slices.

> Work one numbered section at a time. Run the checkpoint at the end of each
> section before continuing. Generated files must never be edited manually.

---

## 0. Repository-specific baseline

This guide targets the versions currently installed in the repository:

| Concern | Installed | Phase 3 rule |
|---|---:|---|
| Angular | 22 | Use standalone components, signals, `input()`, `output()`, `@if`, and `@for` |
| Change detection | Zoneless | State read by templates must notify Angular; prefer signals and `AsyncPipe` |
| Apollo Angular | 14.1 | Keep the existing `provideApollo()` configuration |
| Apollo Client | 4.x | Read query failures from `result.error`, not an Observable `error` callback |
| Unit tests | Angular unit-test builder with Vitest | Use `ng test --watch=false` for a one-shot run |
| TypeScript | 6.0 in web, 5.9 in API | Do not align versions during feature work |
| Styling | Plain SCSS | Use a small token system; no UI kit is required |

Angular 21 and later are zoneless by default. The current project does not load
Zone.js and does not call `provideZoneChangeDetection`.

### 0.1 Phase 2 hand-off

From `nexus/`:

```bash
docker compose up -d
npm run db:verify
npm run build --workspace=apps/api
npm run test --workspace=apps/api
npm run test:db:down --workspace=apps/api
```

Do not reset the development database unless you intend to restore the
deterministic Phase 1 seed:

```bash
npm run db:reset
```

Confirm that Phase 2 has been committed or otherwise saved before starting a
large frontend change:

```bash
git status --short
```

### 0.2 Remove only the dead Angular scaffold

`main.ts` bootstraps `AppComponent`. The following Angular CLI scaffold files
belong to a different, unused `App` component and should be deleted:

```text
apps/web/src/app/app.ts
apps/web/src/app/app.html
apps/web/src/app/app.scss
apps/web/src/app/app.spec.ts
```

Keep these active files:

```text
apps/web/src/app/app.component.ts
apps/web/src/app/app.config.ts
apps/web/src/app/app.routes.ts
```

`nexus/.gitignore` already ignores `coverage/`. The existing local coverage
directory is generated output and is not tracked; no `git rm` command is needed.

Checkpoint:

```bash
cd nexus/apps/web
npm run build
```

---

## 1. Required views and architecture

### 1.1 Routes

| Route | View | Required behavior |
|---|---|---|
| `/creators` | Creator roster | Filter, current-page sort, pagination, status chips, detail drawer |
| `/campaigns` | Campaign board | Group by status, show budget vs. committed spend |
| `/campaigns/:id` | Campaign detail | Creators, deliverables, correct cumulative metrics chart |
| `/insights` | Insights panel | Render seeded insight rows and safely validated JSON fields |

### 1.2 Frontend boundaries

```text
lazy route component
        |
        v
feature-scoped facade
  - owns Apollo operations
  - exposes signals
  - handles loading/error/empty/ready
        |
        v
presentational components
  - receive input()
  - emit output()
  - never inject Apollo
```

Feature components may inject their facade and trigger user actions. Shared
presentational components must not fetch data.

### 1.3 Target structure

```text
apps/web/src/app/
|-- app.component.ts
|-- app.config.ts
|-- app.routes.ts
|-- core/
|   `-- graphql/
|       |-- generated/
|       `-- query-state.ts
|-- shared/
|   |-- line-chart/
|   |-- query-state/
|   |-- status-chip/
|   `-- money.pipe.ts
`-- features/
    |-- creators/
    |-- campaigns/
    `-- insights/
```

---

## 2. Work in five reviewable slices

Five slices are more realistic than three for the guideline target of fewer
than 400 changed lines per pull request.

| Slice | Suggested branch | Deliverable |
|---|---|---|
| A | `feat/phase3-spend-api` | Batched `spentCents` field and tests |
| B | `feat/phase3-frontend-foundation` | Client codegen, shell, lazy routes, shared components |
| C | `feat/phase3-creator-roster` | Roster, filters, pagination, sorting, detail drawer |
| D | `feat/phase3-campaigns` | Board, detail, deliverables, cumulative chart |
| E | `feat/phase3-insights-tests` | Insights, component tests, ADR-004, AI log |

Use the repository's required branch prefix if your tooling creates branches.

---

## 3. Backend addition - batched campaign spend

The campaign board needs committed spend:

```text
spentCents = sum(campaign_creators.agreedRateCents)
```

Do not calculate this from `campaign.creators.items` in Angular. That list is
paginated, so the value becomes wrong when assignments exceed its page limit.

Do not issue one aggregate query from each `Campaign.spentCents` resolver. That
would introduce a new N+1 problem on the campaign board.

### 3.1 Schema

Add this field inside `type Campaign` in
`apps/api/src/graphql/schema.graphql`:

```graphql
spentCents: Int!
```

### 3.2 Repository batch method

Add these types and methods to `campaign.repository.ts`:

```ts
export type CampaignSpend = {
  campaignId: string;
  spentCents: number;
};

export interface CampaignRepository {
  // Existing methods remain.
  findSpendByCampaignIds(
    campaignIds: readonly string[],
  ): Promise<CampaignSpend[]>;
}
```

Implement the method with one grouped Prisma query:

```ts
async findSpendByCampaignIds(
  campaignIds: readonly string[],
): Promise<CampaignSpend[]> {
  const rows = await this.db.campaignCreator.groupBy({
    by: ['campaignId'],
    where: {
      campaignId: { in: [...campaignIds] },
    },
    _sum: {
      agreedRateCents: true,
    },
  });

  return rows.map((row) => ({
    campaignId: row.campaignId,
    spentCents: row._sum.agreedRateCents ?? 0,
  }));
}
```

Campaigns with no assignments do not appear in `groupBy`; the DataLoader will
restore those missing keys as zero.

### 3.3 Service batch seam

Add to `CampaignService`:

```ts
findSpendByCampaignIds(ids: readonly string[]) {
  return this.campaigns.findSpendByCampaignIds(ids);
}
```

This method adds no business rule. It preserves the service/repository boundary.

### 3.4 Request-scoped DataLoader

Add this loader inside `createLoaders()`:

```ts
spentCentsByCampaignId: new DataLoader<string, number>(
  async (campaignIds) => {
    const rows =
      await services.campaigns.findSpendByCampaignIds(campaignIds);
    const byCampaign = new Map(
      rows.map((row) => [row.campaignId, row.spentCents]),
    );

    return campaignIds.map((id) => byCampaign.get(id) ?? 0);
  },
),
```

The returned array must have exactly one number per input key and preserve key
order.

### 3.5 Resolver

Inside the `Campaign` resolver map:

```ts
spentCents: (campaign, _args, { loaders }) =>
  loaders.spentCentsByCampaignId.load(campaign.id),
```

### 3.6 Tests

Add integration coverage for both cases:

1. A campaign with an assignment returns the summed agreed rate.
2. A campaign with no assignments returns `0`.

Also add a loader-focused unit test that loads two campaign IDs concurrently
and asserts `findSpendByCampaignIds` is called once with both IDs.

Checkpoint from `apps/api/`:

```bash
npm run codegen
npm run build
npm run test:unit
npm run test:integration
npm run test:db:down
```

---

## 4. Typed frontend operations

### 4.1 Install only the client codegen packages

From `nexus/apps/web`:

```bash
npm i -D @graphql-codegen/cli \
  @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations \
  @graphql-codegen/typed-document-node
```

This guide uses `typed-document-node` directly because it produces a transparent
single generated file and does not generate Angular service wrappers. The
GraphQL Code Generator client preset is also valid, but do not mix both
approaches in one phase.

### 4.2 Codegen configuration

Create `apps/web/codegen.ts`:

```ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/src/graphql/schema.graphql',
  documents: ['src/**/*.graphql'],
  generates: {
    './src/app/core/graphql/generated/operations.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        strictScalars: true,
        useTypeImports: true,
        scalars: {
          DateTime: {
            input: 'string',
            output: 'string',
          },
          JSON: {
            input: 'unknown',
            output: 'unknown',
          },
        },
      },
    },
  },
};

export default config;
```

`DateTime` is a string in browser JSON, not a JavaScript `Date`. Parse it
explicitly at the point where date arithmetic is required.

Add to `apps/web/package.json`:

```json
"codegen": "graphql-codegen --config codegen.ts"
```

### 4.3 Colocate operations

Create one or more `.graphql` files beside each feature.

`features/creators/creators.graphql`:

```graphql
query CreatorRoster(
  $page: PaginationInput
  $filter: CreatorFilter
) {
  creators(page: $page, filter: $filter) {
    items {
      id
      handle
      displayName
      primaryPlatform
      followerCount
      engagementRate
      ratePerPost
      status
      createdAt
    }
    pageInfo {
      offset
      limit
      totalCount
      hasNextPage
    }
  }
}

query CreatorDetail($id: ID!) {
  creator(id: $id) {
    id
    handle
    displayName
    primaryPlatform
    followerCount
    engagementRate
    ratePerPost
    status
    createdAt
    campaigns(page: { limit: 10 }) {
      items {
        id
        name
        status
        budgetCents
      }
      pageInfo {
        totalCount
      }
    }
  }
}
```

Create equivalent operations for:

- `CampaignBoard`
- `CampaignDetail`
- `InsightsPanel`

Checkpoint:

```bash
npm run codegen
```

Confirm that `operations.ts` exports the documents, result types, and variable
types. Commit generated output, but never hand-edit it.

---

## 5. Reactive query-state architecture

### 5.1 Shared state type

Create `core/graphql/query-state.ts`:

```ts
export type QueryState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; data: T };
```

Do not represent loading, error, and data as three unrelated booleans. A
discriminated union prevents impossible combinations.

### 5.2 Apollo Client 4 behavior

Apollo Client 4 keeps `ObservableQuery` alive after query and network errors.
Errors are emitted through `result.error` in the `next` result. Therefore:

```ts
if (!result || result.loading) {
  return { status: 'loading' };
}

if (result.error) {
  return {
    status: 'error',
    message: result.error.message,
  };
}
```

Do not depend on the Observable subscription's `error` callback for normal
Apollo query failures.

### 5.3 Avoid duplicate subscriptions

Do not call `watchQuery(...).subscribe()` every time the user filters, changes
page, or retries. That accumulates live subscriptions and duplicate requests.

Use a variables signal, `switchMap`, and `toSignal`. `switchMap` unsubscribes
the previous query whenever request variables change.

The corrected creator facade pattern:

```ts
import {
  computed,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import {
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  CreatorRosterDocument,
  type CreatorFilter,
  type CreatorRosterQuery,
  type CreatorRosterQueryVariables,
} from '../../core/graphql/generated/operations';
import type { QueryState } from '../../core/graphql/query-state';

export type CreatorRow =
  CreatorRosterQuery['creators']['items'][number];

@Injectable()
export class CreatorsFacade {
  private readonly apollo = inject(Apollo);

  readonly offset = signal(0);
  readonly limit = signal(20);
  readonly filter = signal<CreatorFilter>({});
  readonly sort = signal<{
    key: keyof CreatorRow;
    direction: 'asc' | 'desc';
  }>({
    key: 'followerCount',
    direction: 'desc',
  });

  private readonly refreshKey = signal(0);

  private readonly request = computed(() => ({
    refreshKey: this.refreshKey(),
    variables: {
      page: {
        offset: this.offset(),
        limit: this.limit(),
      },
      filter: this.filter(),
    } satisfies CreatorRosterQueryVariables,
  }));

  private readonly result = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ variables }) =>
        this.apollo.watchQuery<
          CreatorRosterQuery,
          CreatorRosterQueryVariables
        >({
          query: CreatorRosterDocument,
          variables,
          fetchPolicy: 'cache-and-network',
          notifyOnNetworkStatusChange: true,
        }).valueChanges,
      ),
    ),
    { initialValue: null },
  );

  readonly state = computed<QueryState<CreatorRow[]>>(() => {
    const result = this.result();

    if (!result || result.loading) {
      return { status: 'loading' };
    }

    if (result.error) {
      return {
        status: 'error',
        message: result.error.message,
      };
    }

    const items = result.data?.creators?.items ?? [];

    return items.length === 0
      ? { status: 'empty' }
      : { status: 'ready', data: items };
  });

  readonly pageInfo = computed(
    () => this.result()?.data?.creators?.pageInfo ?? null,
  );

  readonly rows = computed(() => {
    const current = this.state();
    if (current.status !== 'ready') return [];

    const { key, direction } = this.sort();
    return [...current.data].sort((left, right) => {
      const a = left[key];
      const b = right[key];
      const comparison =
        typeof a === 'number' && typeof b === 'number'
          ? a - b
          : String(a).localeCompare(String(b));

      return direction === 'asc'
        ? comparison
        : -comparison;
    });
  });

  setFilter(filter: CreatorFilter): void {
    this.filter.set(filter);
    this.offset.set(0);
  }

  toggleSort(key: keyof CreatorRow): void {
    const current = this.sort();
    this.sort.set({
      key,
      direction:
        current.key === key && current.direction === 'desc'
          ? 'asc'
          : 'desc',
    });
  }

  nextPage(): void {
    if (this.pageInfo()?.hasNextPage) {
      this.offset.update((value) => value + this.limit());
    }
  }

  previousPage(): void {
    this.offset.update((value) =>
      Math.max(0, value - this.limit()),
    );
  }

  retry(): void {
    this.refreshKey.update((value) => value + 1);
  }
}
```

Provide each facade at the feature component:

```ts
@Component({
  // ...
  providers: [CreatorsFacade],
})
export class CreatorRosterComponent {}
```

Feature-scoped providers prevent stale UI state from living forever in the root
injector. `toSignal` owns and cleans up its subscription with that injection
context.

### 5.4 Honest sorting and pagination

The roster has 80 seeded creators, but the API caps one page at 50. The UI must
not claim to render all 80 at once.

Provide:

- Previous and Next buttons
- "Showing X-Y of totalCount"
- Offset reset when filters change
- Disabled Previous at offset 0
- Disabled Next when `hasNextPage` is false

Client-side sorting reorders the current page only. Explain that limitation in
the demo. Sorting the full result set requires an API `orderBy` input and should
be a deliberate future schema change.

---

## 6. Shared presentation foundation

### 6.1 Design tokens

Create `src/app/shared/_tokens.scss` and load it from `src/styles.scss` with:

```scss
@use 'app/shared/tokens';
```

Start with a small accessible palette:

```scss
:root {
  --nx-bg: #0f1115;
  --nx-surface: #171a21;
  --nx-surface-raised: #1d222b;
  --nx-border: #303846;
  --nx-text: #f1f5f9;
  --nx-muted: #a8b3c2;
  --nx-accent: #78a9ff;
  --nx-success: #56d364;
  --nx-warning: #e3b341;
  --nx-danger: #f47067;
  --nx-radius: 10px;
  --nx-gap: 12px;
}
```

Verify text and interactive controls have visible focus states and sufficient
contrast.

### 6.2 Status chip

Create one `StatusChipComponent` accepting:

```ts
readonly status = input.required<string>();
```

It should:

- Convert underscores to spaces
- Use a readable label rather than raw enum formatting
- Map positive, warning, terminal, and neutral states to token colors
- Include a default color for campaign roles and future values

Reuse it in at least creators and campaigns; deliverables should reuse it too.

### 6.3 Query-state component

Create `QueryStateComponent` with:

```ts
readonly state = input.required<QueryState<unknown>>();
readonly emptyMessage = input('Nothing to show yet.');
readonly retry = output<void>();
```

It renders:

- Loading with `role="status"` and `aria-live="polite"`
- Error with `role="alert"` and a Retry button
- Empty with a feature-specific message
- Nothing for `ready`; the feature component renders ready content

Every route must use this component.

### 6.4 Money pipe

Database money values are integer cents. Create:

```ts
import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    return ((cents ?? 0) / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
```

Do not divide cents inside templates.

---

## 7. Routed shell and lazy loading

Replace `app.routes.ts` with four lazy routes:

```ts
import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'creators',
  },
  {
    path: 'creators',
    title: 'Creator Roster - Nexus',
    loadComponent: () =>
      import(
        './features/creators/creator-roster.component'
      ).then((module) => module.CreatorRosterComponent),
  },
  {
    path: 'campaigns',
    title: 'Campaign Board - Nexus',
    loadComponent: () =>
      import(
        './features/campaigns/campaign-board.component'
      ).then((module) => module.CampaignBoardComponent),
  },
  {
    path: 'campaigns/:id',
    title: 'Campaign Detail - Nexus',
    loadComponent: () =>
      import(
        './features/campaigns/campaign-detail.component'
      ).then((module) => module.CampaignDetailComponent),
  },
  {
    path: 'insights',
    title: 'Insights - Nexus',
    loadComponent: () =>
      import(
        './features/insights/insights-panel.component'
      ).then((module) => module.InsightsPanelComponent),
  },
  {
    path: '**',
    redirectTo: 'creators',
  },
];
```

Replace the temporary smoke-test `AppComponent` with a shell containing:

- Product name
- Navigation links
- `RouterLinkActive`
- `<router-outlet />`
- A keyboard-visible focus treatment

Checkpoint:

```bash
npm run codegen
npm run build
```

The production build should list multiple lazy chunk files.

---

## 8. Creator roster and detail drawer

### 8.1 Roster requirements

The roster must contain:

1. Status and platform filters
2. Sortable follower-count, engagement-rate, and rate columns
3. `@for (row of facade.rows(); track row.id)`
4. Status chips
5. Previous/Next controls and count text
6. Loading, error, and empty states
7. A button or row action that opens the detail drawer

Do not track by `$index`; sorting would then associate DOM state with the wrong
creator.

### 8.2 Detail is a separate query

The roster row does not contain campaign details. Opening the drawer must run
`CreatorDetailDocument`.

Implement a feature-scoped `CreatorDetailFacade` with:

- `selectedId: Signal<string | null>`
- `state: Signal<QueryState<CreatorDetail | null>>`
- The same `toObservable` plus `switchMap` pattern
- `of(null)` when no creator is selected
- `open(id)`, `close()`, and `retry()` methods

The drawer must independently display:

- Detail loading state
- Detail error with Retry
- Creator profile fields
- Up to ten campaigns and their total count
- Close button
- Escape-key handling
- Dialog or complementary-region semantics and a readable label

Do not display campaigns from `CreatorRow`; they are not part of that operation.

Checkpoint:

```bash
npm run build
```

Manual check:

- Filter combinations update total counts
- Pagination never requests more than 50
- Sorting affects only the visible page
- Drawer content changes correctly after rows are reordered

---

## 9. Campaign board

`features/campaigns/campaigns.graphql`:

```graphql
query CampaignBoard($page: PaginationInput) {
  campaigns(page: $page) {
    items {
      id
      name
      status
      budgetCents
      spentCents
      startDate
      endDate
      brand {
        id
        name
        industry
      }
    }
    pageInfo {
      offset
      limit
      totalCount
      hasNextPage
    }
  }
}
```

Requirements:

- Fetch up to 50 campaigns; the seed currently has fewer than 50
- Group campaigns into DRAFT, ACTIVE, COMPLETED, and CANCELLED columns
- Compute grouping once with `computed()`
- Show campaign, brand, dates, status, budget, and spend
- Link cards to `/campaigns/:id`
- Handle loading, error, and empty states

Keep spend percentage in TypeScript:

```ts
export function spendPercent(
  spentCents: number,
  budgetCents: number,
): number {
  if (budgetCents <= 0) return 0;
  return Math.min(
    100,
    Math.round((spentCents / budgetCents) * 100),
  );
}
```

The service prevents non-positive campaign budgets, but the UI still guards
against invalid external data.

---

## 10. Campaign detail and cumulative metrics

### 10.1 Detail operation

```graphql
query CampaignDetail($id: ID!) {
  campaign(id: $id) {
    id
    name
    status
    budgetCents
    spentCents
    startDate
    endDate
    brand {
      id
      name
    }
    creators(page: { limit: 50 }) {
      items {
        creatorId
        agreedRateCents
        role
        creator {
          id
          handle
          displayName
          primaryPlatform
          status
        }
      }
      pageInfo {
        totalCount
      }
    }
    deliverables(page: { limit: 50 }) {
      items {
        id
        type
        status
        dueDate
        postedUrl
        creator {
          id
          handle
        }
        metrics(page: { limit: 50 }) {
          items {
            capturedAt
            views
            likes
            comments
            shares
          }
          pageInfo {
            totalCount
          }
        }
      }
      pageInfo {
        totalCount
      }
    }
  }
}
```

This nested query demonstrates the value of the Phase 2 DataLoaders.

### 10.2 Correct campaign total series

Each deliverable's metrics are cumulative and captured on its own schedule.
Summing only rows captured on the same day is incorrect and can create false
drops.

For every chart day, carry forward the latest snapshot at or before that day
for every deliverable, then sum those latest values.

```ts
export type SeriesPoint = {
  t: number;
  value: number;
};

type DeliverableMetrics = {
  metrics: {
    items: Array<{
      capturedAt: string;
      views: number;
    }>;
  };
};

const DAY_MS = 86_400_000;

function utcDay(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid capturedAt value: ${value}`);
  }
  return Math.floor(timestamp / DAY_MS) * DAY_MS;
}

export function toCampaignViewsSeries(
  deliverables: readonly DeliverableMetrics[],
): SeriesPoint[] {
  const seriesByDeliverable = deliverables.map((deliverable) =>
    deliverable.metrics.items
      .map((metric) => ({
        t: utcDay(metric.capturedAt),
        value: metric.views,
      }))
      .sort((left, right) => left.t - right.t),
  );

  const days = [
    ...new Set(
      seriesByDeliverable.flatMap((series) =>
        series.map((point) => point.t),
      ),
    ),
  ].sort((left, right) => left - right);

  const indexes = seriesByDeliverable.map(() => 0);
  const latest = seriesByDeliverable.map(() => 0);

  return days.map((day) => {
    for (
      let index = 0;
      index < seriesByDeliverable.length;
      index += 1
    ) {
      const series = seriesByDeliverable[index];

      while (
        indexes[index] < series.length &&
        series[indexes[index]].t <= day
      ) {
        latest[index] = series[indexes[index]].value;
        indexes[index] += 1;
      }
    }

    return {
      t: day,
      value: latest.reduce(
        (total, value) => total + value,
        0,
      ),
    };
  });
}
```

With monotonic deliverable metrics, this produces a monotonic campaign-total
series.

### 10.3 SVG chart

A small SVG line chart is sufficient for Phase 3. Keep it behind:

```ts
readonly points = input.required<SeriesPoint[]>();
readonly label = input('Time series');
```

Requirements:

- Render an informative empty state for fewer than two points
- Guard zero X span
- Guard zero Y maximum
- Use an accessible `role="img"` and label
- Render first and last dates
- Never produce `NaN` or `Infinity`

The component interface allows a later chart-library replacement without
changing feature code.

### 10.4 Remaining detail content

Render:

- Campaign and brand summary
- Assigned creators with role and agreed rate
- Deliverable checklist with creator, type, due date, and status
- Safe external links for `postedUrl`
- Campaign views line chart
- Loading, error, empty, and not-found handling

Use `rel="noopener noreferrer"` on external links opened in a new tab.

---

## 11. Insights panel and safe JSON

Operation:

```graphql
query InsightsPanel(
  $page: PaginationInput
  $scope: InsightScope
  $scopeId: ID
) {
  insights(
    page: $page
    scope: $scope
    scopeId: $scopeId
  ) {
    items {
      id
      scope
      scopeId
      generatedAt
      model
      summaryText
      payloadJson
    }
    pageInfo {
      totalCount
    }
  }
}
```

`payloadJson` is `unknown`. Validate every field before rendering:

```ts
export type InsightPayload = {
  sentiment?: string;
  confidence?: number;
  highlights?: string[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function readInsightPayload(
  value: unknown,
): InsightPayload {
  if (!isRecord(value)) return {};

  const result: InsightPayload = {};

  if (typeof value.sentiment === 'string') {
    result.sentiment = value.sentiment;
  }

  if (
    typeof value.confidence === 'number' &&
    Number.isFinite(value.confidence)
  ) {
    result.confidence = value.confidence;
  }

  if (
    Array.isArray(value.highlights) &&
    value.highlights.every(
      (item): item is string => typeof item === 'string',
    )
  ) {
    result.highlights = value.highlights;
  }

  return result;
}
```

Do not replace validation with `value as InsightPayload`.

Render each insight as a card with:

- Scope and model
- Generated date
- Summary
- Valid sentiment and confidence when present
- Highlight list when valid

Include filtering so an empty-state combination can be demonstrated.

---

## 12. Component tests

The installed test target is Angular's Vitest-based unit-test builder.

Use:

```bash
npm test -- --watch=false
npm test -- --watch=false --coverage
```

Do not use `--run`; it is not an option exposed by the installed Angular CLI.

Test the two genuinely complex areas:

1. Creator roster and drawer interaction
2. Campaign series reshaping plus line-chart geometry

### 12.1 No `any` in test doubles

Use real generated types:

```ts
const state = signal<QueryState<CreatorRow[]>>({
  status: 'ready',
  data: [creatorFixture],
});
```

Do not use `signal<any>`.

### 12.2 Required creator tests

- Renders a creator and status chip
- Calls filter and pagination actions
- Opens the correct detail after sorting
- Closes with the close button and Escape
- Displays loading, error, and empty states
- Retry calls the facade retry method

### 12.3 Required series/chart tests

- Carries a deliverable's latest cumulative views forward
- Sums multiple deliverables correctly
- Output stays non-decreasing for monotonic input
- Invalid dates are rejected
- One point shows the chart empty message
- Equal timestamps never generate `NaN`
- Polyline contains one coordinate per point

Prefer pure unit tests for `toCampaignViewsSeries` and Angular component tests
for DOM behavior.

Checkpoint:

```bash
npm run codegen
npm run build
npm test -- --watch=false
```

---

## 13. ADR-004 - Client state management

Create `work-tasks/adr/NEXUS-4.md`:

```markdown
# ADR-004: Client State Management and Component Architecture

## Status
Accepted

## Context
The dashboard reads normalized server data through Apollo and holds small
amounts of UI-only state such as filters, pagination, sorting, and an open
drawer. Angular 22 is zoneless, so rendering must be notified through signals,
AsyncPipe, inputs, or explicit change-detector APIs.

Options considered:

1. Apollo cache for server state, feature-scoped facades with Angular signals
   for view state.
2. NgRx or SignalStore for both server and client state.
3. Components call Apollo directly.

## Decision
Use Apollo's cache for server state and one feature-scoped facade per routed
feature. Facades own typed Apollo operations and expose QueryState signals.
Shared presentational components receive input() values and emit output()
events. Query variables are signals transformed with switchMap so changing
filters, pages, or retry state replaces the previous observable query.

## Consequences
- Components are testable with typed facade doubles and no Apollo harness.
- Signals render correctly under zoneless change detection.
- Apollo remains the only normalized server cache.
- Feature-scoped providers prevent stale UI state from living indefinitely.
- Current-page sorting does not sort the full server result set.
- Cross-feature workflows may eventually justify a dedicated store.
- The SVG chart can later be replaced behind the same points input.
```

---

## 14. AI log

Add a Phase 3 entry to `nexus/docs/ai-log.md` covering:

- What AI helped scaffold or review
- Which original guide suggestions were corrected
- Why campaign spend is batched instead of resolved one query per campaign
- Why Apollo Client 4 errors are read from `result.error`
- Why facades use signal-driven query variables and `switchMap`
- Why the roster paginates instead of claiming to render all 80 creators
- Why chart totals carry cumulative values forward
- Why JSON fields are validated rather than asserted
- Why direct TypedDocumentNode generation was chosen

The log should document judgment, not merely say that AI generated files.

---

## 15. Full verification

### 15.1 Automated checks

From `nexus/`:

```bash
docker compose up -d
npm run db:verify
npm run build --workspace=apps/api
npm run test --workspace=apps/api
npm run test:db:down --workspace=apps/api
npm run build --workspace=apps/web
npm test --workspace=apps/web -- --watch=false
```

If you intentionally want to restore deterministic development data first:

```bash
npm run db:reset
```

### 15.2 Manual demo

Run:

```bash
npm run dev
```

In another terminal:

```bash
npm run dev:web
```

Confirm:

1. `/creators` shows a paginated count such as 1-20 of 80.
2. Status and platform filters reset to page one.
3. Sorting changes only the current page and is described honestly.
4. Creator detail loads separately and displays campaigns.
5. `/campaigns` shows four status groups and batched spend values.
6. `/campaigns/:id` shows creators, deliverables, and a non-decreasing chart.
7. `/insights` safely renders all three seeded rows.
8. Stop the API and reload each route; every route shows Error, not Empty.
9. Retry works after the API restarts.
10. A no-match filter shows Empty.
11. Network throttling makes Loading visible.
12. The production build contains separate lazy chunks.

Save screenshots of loading, error, empty, and ready states for the demo.

---

## 16. Phase 3 exit checklist

- [ ] Phase 2 preflight remains green.
- [ ] Dead Phase 0 Angular scaffold files are removed.
- [ ] Campaign spend is computed server-side and batched per request.
- [ ] A no-assignment campaign returns `spentCents: 0`.
- [ ] Frontend codegen produces typed documents and types.
- [ ] Generated output is committed and never hand-edited.
- [ ] No unjustified `any` exists in Phase 3 source or tests.
- [ ] All four feature routes use `loadComponent`.
- [ ] Creator roster supports filters, current-page sorting, and pagination.
- [ ] Creator detail runs a separate query and handles its own states.
- [ ] Campaign board groups statuses and shows budget vs. spend.
- [ ] Campaign detail shows creators and deliverables.
- [ ] Chart uses carry-forward cumulative totals.
- [ ] Insights JSON is validated field by field.
- [ ] Loading, error, empty, and ready states work on every route.
- [ ] Shared status and query-state components are reused.
- [ ] Two complex component areas have meaningful tests.
- [ ] `npm test -- --watch=false` passes.
- [ ] ADR-004 and the Phase 3 AI-log entry are complete.
- [ ] Work is split into reviewable conventional commits.

---

## 17. Common failure modes

| Symptom | Likely cause |
|---|---|
| API is down but UI displays Empty | Facade ignored `result.error` from Apollo Client 4 |
| Requests multiply after filtering | `load()` created a new subscription without replacing the old one |
| Roster claims 80 rows but shows 50 | API limit cap was ignored; add pagination controls |
| Drawer has no campaigns | Roster data was used instead of executing `CreatorDetail` |
| Campaign board causes many aggregate queries | `spentCents` was resolved without a batch DataLoader |
| Spend is wrong for large campaigns | Browser summed a paginated assignment page |
| Chart rises and falls unexpectedly | Snapshots were summed only on their capture day instead of carried forward |
| Insights template fails on highlights | `payloadJson` was cast instead of validated |
| Test command rejects `--run` | Use `--watch=false` with the Angular unit-test builder |
| Money values lose cents | Money pipe uses zero maximum fraction digits |
| All routes appear in the initial bundle | Routes use `component` instead of dynamic `loadComponent` |
| Generated types lack a new field | Run codegen after changing the backend schema and frontend operations |

---

## 18. Primary references

- Angular zoneless change detection:
  https://angular.dev/guide/zoneless
- Angular signals and RxJS interop:
  https://angular.dev/ecosystem/rxjs-interop
- Angular routing and lazy loading:
  https://angular.dev/guide/routing
- Angular unit testing:
  https://angular.dev/guide/testing
- Apollo Client 4 migration and error handling:
  https://www.apollographql.com/docs/react/migrating/apollo-client-4-migration
- Apollo Angular:
  https://the-guild.dev/graphql/apollo-angular
- GraphQL Code Generator TypedDocumentNode:
  https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node

