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
