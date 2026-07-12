# Architecture Decision Records (ADRs)

This folder holds Auriva's Architecture Decision Records. An ADR captures a
single significant architectural decision, the context that forced it, and its
consequences. ADRs are **immutable once Accepted** — we supersede, we do not
rewrite. To change a decision, add a new ADR that references and supersedes the
old one, and set the old one's status to `Superseded by ADR-XXXX`.

## When to write one

Write an ADR when a decision:

- changes a layer boundary, a cross-cutting invariant, or the data model shape;
- picks one option over viable alternatives with lasting consequences;
- would otherwise be re-litigated later because the reasoning lives only in a
  commit message or someone's memory.

Do **not** write an ADR for reversible, local implementation choices — those
belong in code and PR review.

## Relationship to other governance docs

- **`docs/technical-debt.md`** — the Technical Debt Register. Tracks *known
  compromises* (risks D1–D13, roadmap M1–M5). ADRs record *decisions*; the
  register records *debt we chose to carry*. An ADR may create a register entry.
- **`docs/architecture-audit.md`** — the file-level findings behind the register.

## Process

1. Copy `0000-template.md` to `NNNN-short-title.md` (next free number).
2. Fill it in. Keep it short — one decision, one page.
3. Open with status `Proposed`. On merge/acceptance, set `Accepted`.
4. Add a row to the index below.

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](0001-layered-architecture-and-invariants.md) | Layered architecture and preserved invariants | Accepted | 2026-07-08 |
| [0002](0002-batch1-auth-hardening.md) | Batch 1 auth hardening: real OTP and login gating | Accepted | 2026-07-08 |
| [0003](0003-adaptive-workspace-capability-model.md) | Adaptive Workspace: additive capability model | Accepted | 2026-07-08 |
| [0004](0004-public-booking-surface.md) | Public (unauthenticated) booking surface | Accepted | 2026-07-08 |
| [0005](0005-time-based-appointment-reminders.md) | Time-based appointment reminders (not event-driven) | Accepted | 2026-07-10 |
| [0006](0006-postgresql-migration.md) | PostgreSQL migration (replacing hardcoded SQLite) | Accepted | 2026-07-10 |
