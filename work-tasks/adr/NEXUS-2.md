# ADR-002: Native PostgreSQL Enums

## Status
Accepted

## Context
The domain has several closed sets: platform, creator/campaign/deliverable
statuses, deliverable type, and campaign role. Prisma enum types compile to
native PostgreSQL enum types. Native enums provide database-enforced validity,
compact storage, and end-to-end type safety, but changing them requires care.

Adding a value to an existing enum should be isolated from data changes.
Removing a value requires replacing the enum type after existing rows have been
repointed. Renaming a value is safer than dropping and recreating it.

Alternatives considered were string columns validated at the application
boundary and lookup tables referenced by foreign keys. Strings are easier to
change but weaken database enforcement. Lookup tables are flexible and can hold
metadata, but add joins and do not produce a compile-time union automatically.

## Decision
Keep native Prisma/PostgreSQL enums for the current closed sets and adopt an
additive-first migration policy:

1. Add values to an existing enum in a dedicated migration.
2. Do not hard-delete values until data has been repointed in an earlier
   migration.
3. Prefer renaming over drop-and-add when the concept is unchanged.
4. Move a set to a lookup table if it begins requiring per-value metadata or
   frequent changes.

## Consequences
- PostgreSQL rejects invalid values independently of application validation.
- Prisma, services, and clients share strongly typed values.
- Removing enum values is deliberately a multi-step breaking change.
- Frequently changing sets may later require a lookup-table migration and a
  new ADR.
