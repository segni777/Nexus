# AI Assistance Log

## Phase 1 — Schema and deterministic mock data

AI assistance was used to review the Prisma schema, migration history,
deterministic seed design, database verification checks, and documentation
requirements. Suggestions were checked against the installed Prisma 6 behavior
and the working PostgreSQL ports rather than copied from older examples.

The project retained the two applied campaign-role migrations instead of
rewriting migration history. Direct Prisma scripts explicitly load dotenv, and
the seed uses a fixed random seed and fixed date window so database verification
is repeatable.

## Phase 2 — Backend API

AI assistance was used to scaffold and review repository contracts, service
rules, schema-first GraphQL types, request-scoped DataLoaders, typed resolvers,
REST error handling, and unit and integration tests. The generated resolver file
was never hand-edited.

Several suggestions required adjustment for the installed toolchain:

- GraphQL Code Generator 7 required `mapperTypeSuffix: 'Model'` to prevent
  Prisma model imports from colliding with generated GraphQL type names.
- The NodeNext configuration used the callable named `pinoHttp` export.
- Apollo Angular's partial result typing required optional access to both
  `data` and `creators`.
- The integration read test was expanded beyond the minimal skeleton to verify
  `NOT_FOUND` and the absence of a public stack trace.

Services depend on small repository interfaces so their business rules can be
tested with mocks and reused by GraphQL and REST. Prisma queries remain in the
repository layer, while transports handle parsing and response formatting.

The N+1 demonstration showed ten creator-to-deliverable child queries in the
naive path and one `creatorId IN (...)` query through DataLoader. Loaders are
created per request so their cache cannot leak across requests.

Offset pagination was chosen because this internal dashboard needs total counts
and direct page navigation. Lists default to 20 rows and are capped at 50. The
trade-off is weaker performance and possible row movement on very deep or
high-write result sets.

Compatibility work retained Apollo Server 5 with the separate Express 5
adapter, Express 5 async error forwarding, Prisma 6 explicit environment
loading, Jest 30 ESM presets, and separate PostgreSQL ports for development and
integration tests.
