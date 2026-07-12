# ADR-0006 — PostgreSQL migration (replacing hardcoded SQLite)

- **Status:** Accepted
- **Date:** 2026-07-10
- **Deciders:** Engineering Execution Office (Release 1.2 / Batch 4, Founder MVP Blocker B1)
- **Release / Sprint:** Release 1.2 / Batch 4

## Context

`prisma/schema.prisma` hardcoded `provider = "sqlite"`, `url = "file:./dev.db"`
— correct for early development, named as Founder MVP Blocker B1 ("cannot run
a real production instance at all") and Release Governance blocker #1
(`docs/deployment-guide.md` §3, `docs/technical-debt.md` §0). Unlike B2
(Twilio), this is fully engineering-executable: a real local PostgreSQL 16
instance is available in this environment, so the migration could be
performed and its correctness actually verified, not just configured on
faith.

## Decision

1. **Provider switched to `postgresql`, connection env-driven** via
   `DATABASE_URL` (never hardcoded — required in every environment,
   including local dev, so dev/staging/production differ only by connection
   string).
2. **Migration history reset, not translated.** The 27 existing migration
   files are SQLite-dialect SQL (some using SQLite's table-rebuild pattern
   for column changes, which has no Postgres equivalent). Rather than
   hand-translate 27 files across a schema that has evolved substantially,
   a single fresh baseline migration was generated from the current
   `schema.prisma` state against a real, empty Postgres database. This is
   the standard, low-risk approach specifically because **no production
   data exists yet** — there is nothing a migration-by-migration replay
   would need to preserve that a baseline snapshot doesn't already capture.
3. **Old migrations archived, not deleted.** Moved to
   `prisma/migrations-sqlite-archive/` (a sibling directory Prisma does not
   scan) rather than discarded — consistent with this repo's existing
   `docs/archive/`/`design/archive/` convention of preserving history rather
   than erasing it, and because none of this migration history was ever
   committed to git (verified via `git log -- prisma/migrations`), so
   deletion would have been genuinely unrecoverable, not just inconvenient.
4. **Verified for real, not asserted.** `prisma migrate dev` against a real
   local Postgres 16 database, `prisma db seed`, and the full 360-test
   integration suite (`vitest run`) were all actually executed against it —
   not just planned. The three H5 hot-path indexes
   (`h5_hotpath_indexes` migration) were confirmed structurally usable via
   `EXPLAIN ANALYZE` (see `docs/deployment-guide.md` §3 for the specific
   evidence, including the honest caveat that current seed-data volume is
   too small for the planner to prefer the index unprompted — expected,
   not a defect).

## Alternatives considered

- **Hand-translate all 27 SQLite migrations to Postgres dialect** —
  rejected. Higher effort, higher risk (SQLite's table-rebuild pattern for
  ALTER-equivalent changes has no direct Postgres translation), and no
  benefit over a baseline snapshot given there's no production data to
  replay history for.
- **Keep SQLite for local dev, Postgres only in production** — rejected.
  Prisma's `datasource` block supports exactly one `provider` per schema;
  running dev against a different engine than production would silently
  reintroduce the exact class of behavior gap this migration exists to
  close (SQLite is single-writer with no advisory locks; several existing
  code comments — `queue-service.ts`, `patient-service.ts`,
  `rate-limit.ts` — document application-level workarounds for exactly
  those SQLite limitations). Testing against the real production engine is
  strictly more correct.
- **Delete the old migration files outright** — rejected; see decision
  point 3 above.

## Consequences

- Positive: the database is now genuinely production-capable (multi-writer,
  advisory locks, real constraint enforcement), closing Founder Blocker B1.
  Dev/test now run against the same engine as production will, closing a
  real behavioral gap, not just a deployment one.
- Negative / cost: local development now requires a running Postgres
  instance (previously zero-setup via a SQLite file) — a one-time
  environment-setup cost, documented in `docs/deployment-guide.md`.
- **Not addressed by this batch, left as disclosed debt:** the SQLite-era
  application-level workarounds noted above (health-id collision retry
  instead of a real unique-constraint-driven approach stays as retry logic;
  queue-number assignment stays application-enforced; the in-memory rate
  limiter stays in-memory) are **still correct on Postgres** — nothing
  breaks — but are no longer strictly necessary given Postgres's real
  concurrency primitives. Replacing them with native Postgres mechanisms
  (advisory locks, `SELECT ... FOR UPDATE`, a real shared-store rate
  limiter) is a genuine improvement opportunity, not a defect, and is out
  of this batch's scope ("preserve existing domain behavior," not optimize
  it). Tracked as new debt (TD-B4-1).
