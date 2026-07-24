# 17 — Roadmap

← [16 Release Notes](./16-release-notes.md) · [Index](./00-README.md) · Next: [18 Deferred Features](./18-deferred-features.md)

This roadmap is organized around what actually gates the next milestone, not a wishlist. Auriva Professional Edition is **feature-complete**; the roadmap from here is (1) close the Release Candidate, (2) run a real pilot, (3) resume feature work only once the deferred register ([18](./18-deferred-features.md)) has been re-prioritized against pilot feedback.

## Near term — closing the Release Candidate

These are **infrastructure/ops gates**, not code defects (see [15-operations.md](./15-operations.md) for the full checklist):

1. Provision a production database + run `prisma migrate deploy`.
2. Configure automated recurring backups and **rehearse a restore** against production (not just configure — rehearse).
3. Wire a real production OTP/SMS provider (`SMS_PROVIDER`) and verify end-to-end — this is the single gate blocking a genuine patient-facing pilot, since patient login depends on OTP delivery.
4. Validate secrets/configuration in the actual production environment (the fail-fast config check must pass there, not just locally).
5. Point monitoring/alerting at `/api/health` and `/api/ready`.
6. Complete the manual Beta Acceptance Checklist (tablet layout review of the three flagged-dense screens, keyboard-only nav, screen-reader smoke test, modal focus-trap, 200% zoom, responsive inspection, perceived-performance walkthrough, full green Smoke Test Matrix).

## Near term — known limitations to communicate before pilot (not blockers, but must be disclosed)

| Limitation | Impact |
|---|---|
| Patient OTP is a dev echo (no real SMS provider yet) | Blocks any *real* external patient beta user until a provider is wired |
| Notifications are in-app only | Patients/staff will not get SMS/email/push about bookings, results, etc. |
| Rate limiting is in-memory/single-instance | Fine for a single server; must be revisited before horizontal scale |
| Reception awareness strip is informational only | No notify/capacity actions yet — by design for this release, not a bug |
| Two header conventions (compact bars vs content heroes) | Intentional and documented, but worth explaining to a new reviewer who might flag it as inconsistent |

## Mid term — the deferred Category-C register (once re-validated against pilot feedback)

The full table with rationale lives in [18-deferred-features.md](./18-deferred-features.md). Highlights, roughly ordered by how often they were raised across the PKG alignment passes:

- **Self-service password reset** (SEC-4) for staff — assisted (admin-initiated) reset exists today; full self-service (email/token flow) does not.
- **Grow Transition** screen — the celebratory first-hire lifecycle moment (functionally, the transition already *happens* automatically via `resolveSurfacePath`; only the celebratory UI moment is deferred).
- **"Needs your attention" View/Resolve/Dismiss actions** on the Command Center — today it's a read + per-item action-button surface; per-item state management (resolved/dismissed) is not persisted.
- **Doctor Patients facets** (Favourites/High-Risk/Follow-up-Due) and **Schedule "Requests" tab** — both need new persistence/classification, not just UI.
- **Nurse/Technician dedicated action surfaces** (vitals-capture UI, results-entry UI) — the underlying permissions and data model already support these; only the dedicated screens are missing.
- **Notify workflow + capacity thresholds** on the reception board — Front Desk Intelligence (auto-balancing, wait-time prediction, SMS-while-waiting, no-show prediction, queue heat maps) is an entire deferred future epic, kept out to preserve operational simplicity.
- **Multi-instance rate limiting** — a scale-readiness item, not a feature.

## Mid term — infrastructure/scale items

- Multi-instance rate limiting (move off in-memory counters once horizontal scaling is needed).
- A formal isolation CI gate (tests exist; whether the gate is fully wired into CI should be re-verified against the latest `docs/DELIVERY-DASHBOARD.md` before quoting as closed).
- Brand-color tokenization cleanup (listed as a Platform-level deferred cleanup item in the RC register).

## Mid term — product surfaces explicitly not yet real

- **Clinics tab** and **Plan tab** in the Owner cockpit nav — both shown as honest disabled "Soon" items, not hidden and not faked. Multi-clinic *plan management* UI (as opposed to the underlying Organization→Clinic data model, which already exists) is future work.
- **Multi-clinic patient experience** — a patient seeing their history across more than one clinic in one place is out of scope for this release even though the data model (Organization owning many Clinics) supports multiple branches operationally.

## Long term — directions consistent with the six pillars but not committed

See [20-future-ideas.md](./20-future-ideas.md) for the full, explicitly-speculative list (teleconsultation, deeper Command Center analytics, a future clinical-intelligence release for AI-assisted documentation, richer patient communication). None of these are roadmap commitments — they are logged so a future Product Office conversation has a starting point, not so an AI model treats them as pre-approved.

## The standing sequencing principle

A recurring instruction across this product's own working history is: reach a genuinely usable "first successful day" for a real workflow, **then stop building and run a pilot** before resuming feature work. Applied to today's state: Professional Edition's feature scope is done and UX is frozen — the correct next move is closing the RC gates and piloting, not adding more Category-C scope. Any proposal to add a feature "before the pilot" should be evaluated with the same rigor as any other Category-C request (see [02-product-constitution.md](./02-product-constitution.md)).
