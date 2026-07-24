# BRD-043 — User Story Catalogue

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md) and [Epic Breakdown](./brd-043-epics.md). 25 implementation-ready stories across 6 epics. Estimates in story points (Fibonacci, team-relative, not hours). File paths cite the real, current codebase — a story's Backend/Frontend tasks are the actual files to touch, not placeholders.

---

## EPIC-1 — Foundation & Platform Hardening

### US-101 — Add `membership_status` to StaffProfile
| | |
|---|---|
| **Actor** | System (no direct user-facing UI in this story) |
| **Description** | Add a `membership_status` field (`active`\|`suspended`\|`archived`) to `StaffProfile`, distinct from the existing `is_active` boolean. Every existing row defaults to `active`. |
| **Business value** | Unblocks the frozen 3-state membership model (BR + final PO review) — the current boolean cannot express "Suspended." |
| **Preconditions** | None — this is the first story in the plan. |
| **Acceptance criteria** | Migration applies with zero downtime; every pre-existing `StaffProfile` row reads `active`; `effectiveCapabilities()` returns an empty set for any non-`active` status regardless of role/grants (new predicate, additive to `src/domain/authorization.ts`); existing `is_active` behavior is completely unchanged. |
| **Backend tasks** | `prisma/schema.prisma`: add field; new migration; `src/domain/authorization.ts`: add `isMembershipActive()`; `src/api/session.ts`: `requireStaffContext` consults it alongside capability check. |
| **Frontend tasks** | None — invisible until Epic 4's UI ships. |
| **Database tasks** | New migration, additive column, default `'active'`, no backfill script needed. |
| **QA tasks** | Unit test: suspended/archived staff resolve zero capabilities; regression: full existing suite (385 tests) green. |
| **Estimate** | 3 |
| **Dependencies** | None |

### US-102 — Invitation expiry (72h)
| | |
|---|---|
| **Actor** | System / Owner / invitee |
| **Description** | Add `Invitation.expires_at`, set to `created_at + 72h` at creation. `acceptInvitation` rejects an expired token server-side, not just via UI hiding. |
| **Business value** | Frozen business rule — "invitations expire after 72 hours." |
| **Preconditions** | None. |
| **Acceptance criteria** | A token accepted after 72h is rejected with a clear error, even if the UI state was stale; a token accepted within 72h succeeds unchanged from today's behavior. |
| **Backend tasks** | `prisma/schema.prisma`: add `expires_at`; migration; `src/services/onboarding-service.ts`: set on create, check in `acceptInvitation` (throw a new `InvitationExpiredError`, mapped in `src/api/http.ts`'s `mapDomainError`). |
| **Frontend tasks** | None yet — the expired-state screen ships in US-204. |
| **Database tasks** | New migration; backfill existing pending invitations (if any) with `created_at + 72h`, or treat as immediately expired — Engineering Manager call at migration time, not a Product decision. |
| **QA tasks** | Unit test: accept succeeds at 71h59m, fails at 72h01m (fake-timer test); regression suite green. |
| **Estimate** | 3 |
| **Dependencies** | None |

### US-103 — Rate limit invitation create + accept
| | |
|---|---|
| **Actor** | System (security hardening, no direct UI) |
| **Description** | Apply the existing `checkRateLimit`/`clientIp` utilities (already used by `/api/onboarding/quick-setup`) to `/api/organizations/[id]/invitations` (POST) and the invitation-accept endpoint. |
| **Business value** | Closes a pre-existing security gap the Feasibility Report flagged as mandatory — an invite token is a bearer credential to create a staff account. |
| **Preconditions** | None. |
| **Acceptance criteria** | Repeated invite-creation attempts from one IP/org are throttled per the same limits already proven on quick-setup; legitimate single-invite flows are unaffected. |
| **Backend tasks** | `src/app/api/organizations/[id]/invitations/route.ts`: add `checkRateLimit` call mirroring `src/app/api/onboarding/quick-setup/route.ts`'s pattern; same for the accept-invitation route. |
| **Frontend tasks** | Surface a friendly "too many attempts, try again shortly" toast on 429. |
| **Database tasks** | None (rate limiting is in-memory/existing infra). |
| **QA tasks** | Unit test asserting the Nth rapid request 429s; manual verification the legitimate path still works. |
| **Estimate** | 2 |
| **Dependencies** | None |

### US-104 — Fix single-doctor-assumption (P0, blocking)
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor (indirect — data-correctness story) |
| **Description** | `getClinicOverview`'s doctor-resolution fallback (`staffProfile.findFirst({where:{clinic_id}})` when no `user_id` match) and any similar implicit single-doctor assumption in Today/booking-page resolution must become explicit and multi-doctor-correct. |
| **Business value** | Without this, Professional-tier clinics (2+ doctors) silently misattribute data — the Feasibility Report and final PO review both flag this as launch-blocking for Professional. |
| **Preconditions** | US-101 (membership_status exists, so "active doctor" is well-defined). |
| **Acceptance criteria** | With 2+ active doctors in a clinic, Today/overview/booking-page never silently substitutes the wrong doctor; every appointment is attributed to its actual `doctor_id`, never inferred. |
| **Backend tasks** | Audit and fix `src/services/clinic-workspace-service.ts` (`getClinicOverview`), booking-page doctor resolution in `src/services/booking-service.ts`, and any other `findFirst`-without-explicit-doctor pattern found during the audit. |
| **Frontend tasks** | None directly — this is a data-correctness fix beneath existing UI. |
| **Database tasks** | None. |
| **QA tasks** | New test: a clinic with 2 active doctors returns correct per-doctor data from every affected query; regression suite green. |
| **Estimate** | 5 |
| **Dependencies** | US-101 |

---

## EPIC-2 — Invitation System

### US-201 — Invite-creation form
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | Build the Invite screen exactly as prototyped: name, role radio (Doctor/Receptionist), conditional specialty field, mobile number field. |
| **Business value** | BR-001. |
| **Preconditions** | None (can start in parallel with Epic 1). |
| **Acceptance criteria** | Matches `design/mockups/brd-043-team-management.html`'s Invite step 1 pixel-for-pixel per the design-contract rule; Specialty field only shows for Doctor role. |
| **Backend tasks** | None new — reuses existing `createInvitation` contract, extended by US-102/US-205/US-503. |
| **Frontend tasks** | New React form component inside `/clinic` Settings→Team, reachable via Team's "Invite member" button (no standalone top-level nav item, per Epic 6). |
| **Database tasks** | None. |
| **QA tasks** | Browser-verified 390/1280px, 0 console errors, form validation matches prototype. |
| **Estimate** | 3 |
| **Dependencies** | None |

### US-202 — Live duplicate-phone validation
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | As the mobile-number field is typed, check against active members and pending invitations; show inline Available/Already invited/Already active; disable submit accordingly. |
| **Business value** | Frozen requirement — validation must be inline/live, not deferred to submit. |
| **Preconditions** | US-101 (need `membership_status='active'` to define "active member"). |
| **Acceptance criteria** | Matches the prototype's three-state inline behavior exactly; the check is debounced (not a request per keystroke) but still feels live; server-side re-validates at submit regardless of client state (never trust the client). |
| **Backend tasks** | New lightweight endpoint `GET /api/organizations/[id]/invitations/check?phone=` — queries active `StaffProfile` + pending `Invitation` by phone. |
| **Frontend tasks** | Debounced `oninput` handler wired to the new endpoint; three `fieldnote` states matching the prototype's CSS classes/copy exactly. |
| **Database tasks** | None (read-only query against existing tables). |
| **QA tasks** | Unit test for the endpoint's three outcomes; browser test for debounce timing and correct inline copy. |
| **Estimate** | 3 |
| **Dependencies** | US-101, US-201 |

### US-203 — Generate link + WhatsApp/Copy-link screen
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | On submit, create the invitation server-side, then show the link-ready screen with Share-on-WhatsApp (deep link, pre-filled message) and Copy-link actions. No email/SMS is ever triggered. |
| **Business value** | ADR-003, frozen. |
| **Preconditions** | US-201, US-102 (expiry), US-503 (seat check — story can land before US-503 merges but must gate before this ships to production). |
| **Acceptance criteria** | WhatsApp deep link (`https://wa.me/?text=...` or `whatsapp://send?text=...`) pre-fills a message containing the real invite URL; Copy-link copies the exact same URL; the 72h expiry is stated in the UI copy. |
| **Backend tasks** | `createInvitation` call wired to the real endpoint (already exists, extended by earlier stories). |
| **Frontend tasks** | Link-ready screen matching the prototype; WhatsApp deep-link construction; clipboard copy. |
| **Database tasks** | None new. |
| **QA tasks** | Manual verification WhatsApp deep link opens correctly on mobile Safari/Chrome; browser-verified 390/1280px. |
| **Estimate** | 3 |
| **Dependencies** | US-201, US-102 |

### US-204 — Invitation acceptance (valid + expired)
| | |
|---|---|
| **Actor** | Invited doctor/receptionist (unauthenticated, outside the clinic shell) |
| **Description** | Standalone landing page for the invite link: valid token shows clinic/inviter/role + password creation; expired/revoked token shows a clear blocked state. |
| **Business value** | The other half of the invitation flow — completes BR-001. |
| **Preconditions** | US-102 (expiry). |
| **Acceptance criteria** | Matches the prototype's two states exactly; a revoked invitation renders identically to expired (no distinct copy needed, per the spec doc's own note); successful acceptance creates the `User` + `StaffProfile` + `OrganizationMember` exactly as `acceptInvitation` already does today (no change to that transaction's shape). |
| **Backend tasks** | Wire to existing `acceptInvitation`, now expiry-aware (US-102). |
| **Frontend tasks** | New standalone (non-`/clinic`-shell) page. |
| **Database tasks** | None new. |
| **QA tasks** | Browser-verified both states, 390/1280px. |
| **Estimate** | 3 |
| **Dependencies** | US-102 |

### US-205 — Reject duplicate-active-member invitation (server-side)
| | |
|---|---|
| **Actor** | System |
| **Description** | Server-side enforcement (not just the inline UI check from US-202) that an active member cannot be invited again. |
| **Business value** | Frozen business rule — belt-and-suspenders with US-202's client-side UX. |
| **Preconditions** | US-101. |
| **Acceptance criteria** | A request that bypasses the UI (direct API call) with a duplicate-active phone is rejected with a clear domain error, mapped through the existing `mapDomainError` convention. |
| **Backend tasks** | `createInvitation`: add the check, throw `DuplicateActiveMemberError`. |
| **Frontend tasks** | Surface the server error if the inline check was somehow stale (race condition safety net). |
| **Database tasks** | None. |
| **QA tasks** | Unit test: direct service call with a duplicate-active phone throws. |
| **Estimate** | 2 |
| **Dependencies** | US-101 |

---

## EPIC-3 — Adaptive Role-Driven Dashboard

### US-301 — Dashboard data endpoint (role-shaped payload)
| | |
|---|---|
| **Actor** | System |
| **Description** | One endpoint, `GET /api/clinic/dashboard`, returns a payload whose *shape* depends on the caller's role — a Doctor's response contains no revenue/collection/subscription/team fields at all, enforced server-side. |
| **Business value** | Financial privacy (frozen) must be a security property, not a UI convention. |
| **Preconditions** | US-104 (P0 multi-doctor fix) — Owner/Managing-Doctor payloads are wrong without it. |
| **Acceptance criteria** | A contract test asserts the Doctor-role response JSON has no keys named `revenue`, `collections`, `subscription`, `team*`, `pending_collections`; Owner/Managing-Doctor responses include them; Receptionist's payment field is named/shaped as "pending to collect" (operational), never "revenue." |
| **Backend tasks** | New route + service composing existing data (today's appointments, queue, team status, billing summary) into four distinct response builders keyed by role. |
| **Frontend tasks** | None yet (consumed by US-302–305). |
| **Database tasks** | None new — reads existing tables. |
| **QA tasks** | Contract test per role (the financial-exclusion test is the highest-priority test in this entire epic). |
| **Estimate** | 5 |
| **Dependencies** | US-104 |

### US-302 — Practice Owner dashboard layout
| | |
|---|---|
| **Actor** | Practice Owner |
| **Description** | "How is my clinic performing today?" — today's appointments (all doctors), revenue, pending collections, team status, operational alerts. |
| **Preconditions** | US-301. |
| **Acceptance criteria** | Matches the prototype's Owner block exactly; no personal consultation queue is rendered (Owner isn't clinical). |
| **Backend tasks** | None beyond US-301. |
| **Frontend tasks** | React component consuming the role-shaped payload. |
| **Database tasks** | None. |
| **QA tasks** | Browser-verified 390/1280px against the prototype. |
| **Estimate** | 3 |
| **Dependencies** | US-301 |

### US-303 — Managing Doctor dashboard layout
| | |
|---|---|
| **Actor** | Managing Doctor |
| **Description** | "How are my patients and my practice doing today?" — richest layout: consultation queue, today's appointments, team overview, practice performance/revenue, operational alerts. |
| **Preconditions** | US-301. |
| **Acceptance criteria** | Matches the prototype exactly; both clinical and business content present, nothing withheld. |
| **Backend/Frontend/DB/QA** | Same pattern as US-302. |
| **Estimate** | 3 |
| **Dependencies** | US-301 |

### US-304 — Doctor dashboard layout (financial exclusion)
| | |
|---|---|
| **Actor** | Doctor |
| **Description** | "Who is my next patient?" — next-patient hero, today's appointments, follow-ups, recent consultations. Zero financial/business content. |
| **Preconditions** | US-301 (the contract test from that story is what makes this story's acceptance criterion enforceable). |
| **Acceptance criteria** | Matches the prototype exactly; **the API contract test from US-301 passing is a hard release gate for this story**, not just a nice-to-have. |
| **Backend/Frontend/DB/QA** | Same pattern; QA explicitly re-runs the US-301 contract test as part of this story's Definition of Done. |
| **Estimate** | 3 |
| **Dependencies** | US-301 |

### US-305 — Receptionist dashboard layout
| | |
|---|---|
| **Actor** | Receptionist |
| **Description** | "Who is waiting and what needs attention?" — check-ins, waiting queue, today's appointments, pending payments (operational), walk-ins. No clinical/business analytics. |
| **Preconditions** | US-301. |
| **Acceptance criteria** | Matches the prototype exactly; payment content framed operationally, never as analytics. |
| **Backend/Frontend/DB/QA** | Same pattern as US-302. |
| **Estimate** | 3 |
| **Dependencies** | US-301 |

---

## EPIC-4 — Team Membership Lifecycle

### US-401 — Team screen: member cards + growth indicator
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | Responsive member-card grid (avatar, name, role, status, overflow menu) + growth indicator (plan, seats used, upgrade CTA). Replaces any table-based approach. |
| **Preconditions** | US-101, US-501 (plan/seat model, for the growth indicator's numbers). |
| **Acceptance criteria** | Matches the prototype's `.mcard` grid exactly, mobile-first (1 column at narrow widths); growth indicator shows live seat counts, not cached. |
| **Backend tasks** | `GET /api/clinic/team` — list members with `membership_status`, role, joined date. |
| **Frontend tasks** | Card grid component, growth indicator component (reusable, per the prototype spec's component inventory). |
| **Database tasks** | None new. |
| **QA tasks** | Browser-verified 390/1280px; empty/loading/populated/at-limit states all covered (matches prototype's Simulate states, now real data-driven). |
| **Estimate** | 5 |
| **Dependencies** | US-101, US-501 |

### US-402 — Suspend / Reactivate
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | Toggle a member between Active and Suspended. No confirmation modal (lighter-weight, reversible action, per the prototype's design — flagged to Product Office as a deliberate choice, not an oversight). |
| **Preconditions** | US-101. |
| **Acceptance criteria** | Suspending immediately zeroes the member's effective capabilities (via US-101's predicate); reactivating restores role-default capabilities; the Owner's own row never shows this action (Owner cannot be suspended, frozen BR). |
| **Backend tasks** | `PATCH /api/organizations/[id]/staff/[staffId]` extended to accept `membership_status` transitions `active↔suspended` (builds on the existing endpoint, does not replace it). |
| **Frontend tasks** | Overflow-menu actions wired to the endpoint; optimistic UI update + toast, matching the prototype. |
| **Database tasks** | None new. |
| **QA tasks** | Unit test: suspending revokes access on the next request; the Owner row's menu is absent server-side (not just hidden by CSS) — verify via API response, not just DOM. |
| **Estimate** | 3 |
| **Dependencies** | US-101 |

### US-403 — Archive conflict-check service
| | |
|---|---|
| **Actor** | System |
| **Description** | Given a doctor being archived, determine whether they have future scheduled appointments or an active consultation. Return the conflict list if any exist. |
| **Business value** | The frozen archive rule's enforcement mechanism. |
| **Preconditions** | US-101. |
| **Acceptance criteria** | Correctly identifies every future appointment (`scheduled_time` in the future, status not cancelled/completed) and any `in_consultation` appointment for the target doctor; a receptionist (no appointments owned) always returns zero conflicts. |
| **Backend tasks** | New membership-service function `getArchiveConflicts(staffId)`. |
| **Frontend tasks** | None yet (consumed by US-404/405). |
| **Database tasks** | None new — reads existing `Appointment` table. |
| **QA tasks** | Unit tests: doctor with future appointments returns them; doctor with none returns empty; active consultation is included; receptionist always empty. |
| **Estimate** | 3 |
| **Dependencies** | US-101 |

### US-404 — Reconciliation-gated archive dialog
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | When conflicts exist, block Archive and require every conflicting item to be reassigned to another active doctor before it's enabled. Auto-cancel and retain-assignment are never offered. |
| **Preconditions** | US-403. |
| **Acceptance criteria** | Matches the prototype's reconciliation dialog exactly — per-row "Reassign to" select, Archive button disabled until every row resolved, both client-disabled AND server-rejected if bypassed; the actual archive+reassignment happens as one atomic transaction. |
| **Backend tasks** | `POST /api/clinic/team/[staffId]/archive` — accepts a reassignment map, validates every conflict is covered, performs reassignment + status change to `archived` in one transaction; rejects if any conflict is uncovered. |
| **Frontend tasks** | Reconciliation dialog component matching the prototype exactly (per-row select, disabled-until-complete button). |
| **Database tasks** | None new — updates existing `Appointment.doctor_id` + `StaffProfile.membership_status`. |
| **QA tasks** | Unit test: archive request with 1-of-2 conflicts reassigned is rejected; 2-of-2 succeeds atomically; browser test replicating the prototype's step-by-step gating (verified pattern already proven in the prototype's own test suite — reuse the same scenario). |
| **Estimate** | 5 |
| **Dependencies** | US-403 |

### US-405 — Simple immediate archive (no conflicts)
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | When `getArchiveConflicts` returns empty (e.g., archiving a receptionist, or a doctor with no future/active items), archive proceeds immediately with a lightweight confirm — no reconciliation UI shown. |
| **Preconditions** | US-403. |
| **Acceptance criteria** | Matches the prototype's simple confirm modal exactly; historical records are explicitly stated as preserved (BP-05) in the confirm copy. |
| **Backend tasks** | Same endpoint as US-404, short-circuits when the conflict list is empty. |
| **Frontend tasks** | Simple confirm modal (already prototyped, reused). |
| **Database tasks** | None new. |
| **QA tasks** | Unit + browser test for the zero-conflict path. |
| **Estimate** | 2 |
| **Dependencies** | US-403 |

---

## EPIC-5 — Subscription & Plan

### US-501 — Organization plan/seat schema
| | |
|---|---|
| **Actor** | System |
| **Description** | Add plan fields to `Organization` (e.g., `plan: 'solo'|'professional'`), default `'solo'` for every existing org. |
| **Preconditions** | None — can start alongside Epic 1. |
| **Acceptance criteria** | Zero-downtime migration; every pre-existing org reads Solo with no manual backfill. |
| **Backend tasks** | `prisma/schema.prisma` + migration. |
| **Frontend tasks** | None yet. |
| **Database tasks** | New migration, additive, default-backed. |
| **QA tasks** | Migration dry-run against a copy of production-shaped data; regression suite green. |
| **Estimate** | 2 |
| **Dependencies** | None |

### US-502 — Plan screen (Solo / Professional / Enterprise-disabled)
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | Three-card plan display matching the prototype exactly, including the visibly inert Enterprise card. |
| **Preconditions** | US-501. |
| **Acceptance criteria** | Enterprise's CTA has no click handler at all (not just `disabled` styling with a dead handler underneath) — genuinely inert, matching the "pure roadmap communication" requirement. |
| **Backend tasks** | `GET /api/clinic/plan` — current plan + live seat usage. |
| **Frontend tasks** | Plan screen component. |
| **Database tasks** | None new. |
| **QA tasks** | Browser-verified 390/1280px. |
| **Estimate** | 2 |
| **Dependencies** | US-501 |

### US-503 — Seat-limit guard in invitation creation
| | |
|---|---|
| **Actor** | System |
| **Description** | `createInvitation` computes the live count of `active` `StaffProfile` rows for the clinic and rejects invitation creation past the plan's ceiling. |
| **Business value** | Frozen headcounts (Solo: owner+1 doctor+1 receptionist; Professional: 5 doctors/15 total) must be enforced, not just displayed. |
| **Preconditions** | US-101, US-501. |
| **Acceptance criteria** | The count is computed at request time (`StaffProfile.count()`), never cached or stored redundantly; a Solo org at 2/2 seats cannot create a 3rd invitation; the error is a typed domain error mapped through the existing convention. |
| **Backend tasks** | `src/services/onboarding-service.ts` `createInvitation`: add the guard. |
| **Frontend tasks** | Surface the seat-limit error; the Team screen's "at limit" state (already prototyped) becomes data-driven. |
| **Database tasks** | None new. |
| **QA tasks** | Unit test: exactly-at-limit rejects; one-under succeeds; count reflects suspended/archived members correctly excluded. |
| **Estimate** | 3 |
| **Dependencies** | US-101, US-501 |

### US-504 — Request-upgrade flow (clinic-side)
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | "Request upgrade" button records a request; does not itself change the plan (ADR-004 — the real toggle is admin-side, US-505). |
| **Preconditions** | US-501. |
| **Acceptance criteria** | Matches the prototype's request/success flow exactly; the org's `plan` field is unchanged by this action alone. |
| **Backend tasks** | `POST /api/clinic/plan/upgrade-request` — records the request (new lightweight table or reuse `AuditLog`-style pattern), publishes `subscription.upgrade_requested`. |
| **Frontend tasks** | Request button + success state, matching the prototype. |
| **Database tasks** | Minimal — a request record (could be a new small table or an event-log entry; Engineering Manager's call at design time, not Product's). |
| **QA tasks** | Unit test: request does not mutate `plan`; browser-verified UI. |
| **Estimate** | 2 |
| **Dependencies** | US-501 |

### US-505 — Admin-side plan toggle (Auriva-internal)
| | |
|---|---|
| **Actor** | Auriva ops (not a clinic-product user) |
| **Description** | The actual plan-change control, outside the clinic product entirely — per ADR-004. |
| **Preconditions** | US-501. |
| **Acceptance criteria** | Changing plan here is the only way `Organization.plan` changes; not reachable from any clinic-facing nav. |
| **Backend tasks** | Internal-only endpoint, gated by `is_platform_admin` (existing flag on `User`, already reserved for exactly this kind of Auriva-internal capability per its own schema comment). |
| **Frontend tasks** | Minimal internal tool screen — explicitly out of the `/clinic` shell, lowest design priority in this entire plan. |
| **Database tasks** | None new. |
| **QA tasks** | Access-control test: a clinic Owner session cannot reach this endpoint. |
| **Estimate** | 2 |
| **Dependencies** | US-501 |

---

## EPIC-6 — Settings Information Architecture

### US-601 — Sidebar/bottom-nav regroup
| | |
|---|---|
| **Actor** | Practice Owner, Managing Doctor |
| **Description** | Restructure `/clinic`'s navigation: `Settings` group containing `Practice`/`Team`/`Plan`; remove the standalone `Invite` nav item (reachable only via Team's button). |
| **Preconditions** | US-401 (Team screen), US-502 (Plan screen) must exist to link to. |
| **Acceptance criteria** | Matches the prototype's nav exactly; a Doctor or Receptionist sees no `Settings` group at all — verified via the rendered DOM having no such element for those roles, not merely `display:none`. |
| **Backend tasks** | None. |
| **Frontend tasks** | `/clinic` sidebar + mobile bottom-nav components. |
| **Database tasks** | None. |
| **QA tasks** | Browser-verified per-role nav visibility, 390/1280px, matching the prototype's automated role-switch tests. |
| **Estimate** | 3 |
| **Dependencies** | US-401, US-502 |

---

## Estimate summary

| Epic | Stories | Points |
|---|---|---|
| EPIC-1 Foundation | 4 | 13 |
| EPIC-2 Invitation | 5 | 14 |
| EPIC-3 Dashboard | 5 | 17 |
| EPIC-4 Team Lifecycle | 5 | 18 |
| EPIC-5 Subscription/Plan | 5 | 11 |
| EPIC-6 Settings IA | 1 | 3 |
| **Total** | **25** | **76** |
