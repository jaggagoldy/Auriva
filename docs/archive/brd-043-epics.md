# BRD-043 — Epic Breakdown

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). Six epics, directly derived from the approved prototype's screens and the frozen business rules — no epic exists that isn't traceable to a specific prototype screen or BRD business rule.

---

## EPIC-1 — Foundation & Platform Hardening

**Business objective:** none directly visible to users — this is the load-bearing infrastructure every other epic depends on.
**Technical objective:** introduce the membership-status model, invitation expiry, and close the pre-existing rate-limiting gap on the invitation surface, without touching any shipped P1–P6 behavior.
**Scope:** `StaffProfile.membership_status`, `Invitation.expires_at`, rate limiting on invite create/accept, the P0 single-doctor-assumption fix in Today/overview/booking-page resolution.
**Dependencies:** none — this is Sprint 1, the root of the dependency graph.
**Deliverables:** migration(s), updated `requireStaffContext` membership gate, rate-limited invitation endpoints, corrected multi-doctor-aware query helpers.
**Acceptance criteria:** existing 385-test suite passes unmodified; a staff member with `membership_status='suspended'` resolves zero capabilities regardless of role/grants; an expired invitation is rejected server-side on accept, not just hidden in the UI; Today/overview correctly attributes appointments to the specific doctor, never an arbitrary `findFirst`.
**Success metrics:** zero regressions in the existing suite; zero P0 defects reopened after Sprint 2 begins.

---

## EPIC-2 — Invitation System

**Business objective:** BR-001 (invite team members), frozen ADR-003 (WhatsApp + copy-link, no email/SMS).
**Technical objective:** extend the existing, real `Invitation`/`createInvitation`/`acceptInvitation` machinery with expiry, live duplicate-checking, and seat-limit enforcement — do not replace it.
**Scope:** invite-creation form (name, role, specialty, mobile), live phone validation (Available/Already invited/Already active), generated-link screen (WhatsApp share + copy link), 72h expiry messaging, acceptance flow (valid + expired states), duplicate-active-member rejection.
**Dependencies:** EPIC-1 (expiry field, rate limiting).
**Deliverables:** live-check endpoint, updated invite-creation endpoint (seat-limit gate), React screens matching the prototype's Invite flow exactly.
**Acceptance criteria:** typing a known-active member's number shows "Already active" inline and disables submit before any server round-trip on blur; typing a pending invite's number shows "Already invited"; an invite link expires at exactly 72h and is rejected server-side; WhatsApp share opens with a pre-filled message containing the link; no email or SMS is ever sent.
**Success metrics:** invitation acceptance rate (named in BRD §12); time from "Invite" click to link generated (target <2s, matches prototype's simulated ~900ms).

---

## EPIC-3 — Adaptive Role-Driven Dashboard

**Business objective:** BR-003 (adaptive experience), the frozen dashboard philosophy — every role answers its own primary operational question.
**Technical objective:** one Dashboard route serving four structurally distinct content trees, gated by `effectiveCapabilities()` + `membership_status`, with financial content **excluded at the data-fetching layer** for the Doctor role, not merely hidden in the UI.
**Scope:** Practice Owner layout, Managing Doctor layout, Doctor layout, Receptionist layout — exactly as specified in the approved prototype, including the hard exclusion of revenue/collections/subscription/team content from the Doctor role's API response, not just its render tree.
**Dependencies:** EPIC-1 (P0 multi-doctor fix — the Managing Doctor and Owner layouts show all-doctors data and are wrong without it).
**Deliverables:** one dashboard data endpoint returning a role-appropriate payload shape (server decides what's includable, not the client hiding fields), four React content components sharing one route.
**Acceptance criteria:** a Doctor-role API response contains no revenue/collection/subscription/team fields at all (verified by contract test, not just UI snapshot); a Practice Owner sees aggregate today's-appointments across all doctors, not a personal queue; a Managing Doctor sees both their own queue and practice-wide revenue; a Receptionist's payment content is framed as "pending to collect," never as analytics.
**Success metrics:** dashboard load time; zero incidents of financial data appearing in a Doctor session (this is a security/privacy metric, not just UX).

---

## EPIC-4 — Team Membership Lifecycle

**Business objective:** BR-001, the frozen membership states (Active→Suspended→Archived), the frozen archive rule (mandatory reassignment, no auto-cancel, no retain-assignment).
**Technical objective:** a real state machine for membership transitions, with the archive path gated by a genuine conflict check against future appointments and active consultations.
**Scope:** Team screen (member cards, growth indicator), Suspend/Reactivate actions, the reconciliation-gated Archive flow exactly as prototyped (simple immediate archive when no conflicts; blocked + mandatory per-item reassignment dialog when conflicts exist).
**Dependencies:** EPIC-1 (membership_status field), EPIC-3 (shares the Team-status mini-list shown on Owner/Managing-Doctor dashboards).
**Deliverables:** membership-service (suspend/reactivate/archive + conflict-check + reassignment), Team screen, reconciliation dialog.
**Acceptance criteria:** archiving a doctor with zero future appointments/active consultations succeeds immediately; archiving one with conflicts is rejected server-side (not just UI-disabled) until every conflicting item carries a new, active, valid doctor assignment; the Owner (single, un-archivable, un-suspendable per frozen BR) never shows an overflow menu at all, on the server-rendered payload, not just hidden by CSS.
**Success metrics:** zero incidents of an appointment left orphaned on an archived doctor.

---

## EPIC-5 — Subscription & Plan (Solo→Professional)

**Business objective:** BR-004 (grow without migration), frozen ADR-004 (administrative plan management, no payment gateway).
**Technical objective:** a plan/seat model on `Organization`, a live (never cached) seat-count check gating invitation creation, and a request-only upgrade flow whose actual toggle lives outside the clinic product.
**Scope:** Plan screen (Solo/Professional/Enterprise-disabled), Team screen's growth indicator, "Request upgrade" flow, the admin-side plan-toggle mechanism (Auriva-internal, not the clinic product's own UI).
**Dependencies:** EPIC-1 (foundation), EPIC-4 (seat count depends on live `StaffProfile.membership_status='active'` counts).
**Deliverables:** `Organization` plan fields + migration (default `'solo'` for every existing org, zero-downtime), plan-read endpoint, upgrade-request endpoint, seat-limit guard inside `createInvitation`.
**Acceptance criteria:** every pre-existing organization reads as Solo with no backfill script required beyond the column default; requesting an upgrade never mutates the plan itself (only the admin-side toggle does); attempting to invite past the seat ceiling is rejected server-side with the exact BRD-frozen headcounts (Solo: 1 owner + 1 doctor + 1 receptionist; Professional: 5 doctors, 15 total); the Enterprise card is genuinely inert — its CTA has no handler, not just a disabled style.
**Success metrics:** Solo→Professional upgrade request rate (BRD §12 metric).

---

## EPIC-6 — Settings Information Architecture

**Business objective:** the frozen Settings regroup (Practice/Team/Plan under one section), removing the standalone top-level Invite nav item.
**Technical objective:** restructure `/clinic`'s existing sidebar/bottom-nav without touching any of the screens it points to.
**Scope:** sidebar `Settings` group label + `Practice`/`Team`/`Plan` sub-items; mobile bottom-nav updated to match; Invite reachable only via Team's "Invite member" button.
**Dependencies:** EPIC-4 (Team screen must exist), EPIC-5 (Plan screen must exist) — this epic is the connective tissue, sequenced last among the UI epics.
**Deliverables:** updated `/clinic` navigation shell (sidebar + bottom nav), no new routes.
**Acceptance criteria:** matches the prototype's nav structure exactly — a Doctor or Receptionist sees no Settings group at all (not a greyed-out one); Practice Setup's existing, already-shipped screen is reachable at the new location with zero changes to its own internals.
**Success metrics:** none distinct from EPIC-3/4/5 — this epic is purely structural and is verified as part of their acceptance.

---

## Explicit non-epics (do not create these)

No epic exists for: Departments, custom permissions/RBAC, Nurse/Lab Technician/Accountant roles, multi-clinic, self-service billing, email/SMS delivery infrastructure, Owner account recovery (still undecided by Product Office — do not build a recovery flow speculatively), Enterprise tier functionality (the card is UI-only by design, see EPIC-5).
