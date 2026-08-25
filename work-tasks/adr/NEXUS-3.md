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
order with a unique final tie-breaker.

## Consequences
- Phase 3 can render page numbers and total counts simply.
- Repository code maps directly to Prisma `skip` and `take`.
- Clients cannot request an unbounded list.
- Very deep pages will become inefficient at large scale.
- Revisit cursor pagination if Nexus becomes a high-write feed or list sizes
  grow beyond the internal-dashboard use case. That change requires a new ADR
  and a versioned GraphQL schema transition.
