# ADR-001: Repository Interfaces and Dependency Injection

## Status
Accepted

## Context
The Phase 0 API called Prisma directly from GraphQL resolvers. That path was
small, but it coupled transport code to persistence and made business rules
difficult to unit test without PostgreSQL. Phase 2 also introduces a REST
metrics webhook that must share the same rules as GraphQL.

The options considered were:

1. Continue calling Prisma directly from resolvers and route handlers.
2. Introduce thin repository interfaces and inject them into service classes.
3. Build a generic CRUD repository or hide Prisma behind a larger ORM
   abstraction.

Direct Prisma access is initially concise but duplicates rules across
transports and forces database-backed service tests. A generic abstraction adds
API surface without representing Nexus-specific queries well.

## Decision
Use thin, aggregate-specific repository interfaces with constructor dependency
injection. Prisma implementations live in `src/repositories`; business rules
live in `src/services`; GraphQL resolvers and REST handlers translate transport
input and call services.

Repositories expose only the methods required by current use cases. Services
may use Prisma-generated domain types, but they do not receive or call a
`PrismaClient`.

## Consequences
- Service unit tests can use small repository mocks without PostgreSQL.
- GraphQL and REST share the same business rules.
- Integration tests can inject a Prisma client connected to the isolated test
  database.
- Repository interfaces add files and composition code.
- New queries require an explicit repository method instead of arbitrary ORM
  access from services.
