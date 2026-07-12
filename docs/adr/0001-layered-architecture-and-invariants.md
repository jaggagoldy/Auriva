# ADR-0001 — Layered architecture and preserved invariants

- **Status:** Accepted
- **Date:** 2026-07-08
- **Deciders:** Head of Engineering (Batch 0 validation)
- **Release / Sprint:** Release 1.2 / Sprint 2 — Front-Desk Efficiency & Unified Operations

## Context

Sprint 2 (AEO-001) is an execution sprint on an existing codebase, not a
greenfield build. Before implementing Batch 1+, Batch 0 requires validating the
architecture already in place so subsequent batches extend it rather than
reinvent it (Engineering Principle: *Extend Existing Systems before Creating New
Ones*). The layering was introduced by the pre-Sprint-1 refactor (commits
`a1601b7` → `33f0554`) and is documented in `docs/architecture-audit.md` and
`docs/technical-debt.md §1`. This ADR ratifies that layering as the accepted
baseline for Sprint 2 so the boundaries and invariants are a decision of record,
not tribal knowledge.

## Decision

We will build all Sprint 2 work on the existing layered structure and preserve
its boundaries and invariants:

```
src/app/**          UI routes (patient, doctor, admin, staff, marketing, login)
src/app/api/**      Route handlers — thin controllers: parse/validate, auth
                    guard, call a service/repository, map errors
src/api/            HTTP boundary: session guard, response builders, logger,
                    validation utilities
src/services/       Business logic (transactional)
src/repositories/   Prisma data access
src/domain/         Pure business rules — no Prisma, no Next (status state
                    machines, authorization predicates, Organization model,
                    invoice/lab/release status, health-id, semver, geo)
src/shared/         Client-safe view-model types/helpers
src/lib/            Infrastructure only (prisma singleton, events, audit,
                    rate-limit, password, config, cn)
```

**Layering rule:** `app/api → api / services / repositories → domain`.
`domain` and `shared` import nothing above them. Services may use Prisma
directly inside transactions (deliberate — see technical-debt D7).

**Invariants to preserve (do not regress):**

1. Every appointment status change goes through `transitionStatus()` and the
   `src/domain/appointment-status.ts` table.
2. Every appointment mutation writes an `AppointmentEvent` in the same
   transaction.
3. Every authorization decision goes through `src/domain/authorization.ts`
   (capability over role).
4. Reception endpoints never trust a client-supplied `clinic_id` for
   receptionists; tenancy is resolved server-side.
5. All events are published through the shared Event Platform (`src/lib/events.ts`),
   not ad-hoc.

## Alternatives considered

- **Reorganize layers for Sprint 2** — rejected. The current layering is sound,
  test-covered (233 tests), and re-slicing mid-release adds risk with no
  customer value. Any boundary problems are logged as debt (D7, D12), not
  reworked pre-emptively.
- **Introduce a new module/package boundary now** — rejected as premature
  optimization; the folder layering already enforces the direction we need.

## Consequences

- Positive: Batch 1+ authors have an explicit, enforceable target for where
  code belongs; reviews (and the Auriva Verification Office) can check against a
  written contract. The five invariants give a concrete regression checklist.
- Negative / cost: Services querying Prisma directly (D7) and hand-maintained
  client types (D12) remain as accepted debt; this ADR does not resolve them.
- This ADR establishes the boundaries that ADR supersessions must justify
  departing from.
