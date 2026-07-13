# BRD-043 — Screen Specifications (companion to the HTML prototype)

**Prototype:** `design/mockups/brd-043-team-management.html` — open in any browser, static, no backend, no framework. Use the **Preview as** selector (top-right) to see Adaptive Navigation change live per role.

**Status:** Draft for Product Office review. Nothing here is implemented — per the approved roadmap, no React/backend/API work begins until this is reviewed and frozen.

**Framing decisions made while building this (stated, not silent):**
- Per **BP-03 (One Product)**, "Doctor Workspace / Receptionist Workspace / Owner Workspace" are **not three screens** — they are one **Dashboard** that adapts by role. Building three redundant screens would itself violate the frozen principle.
- **Responsive = one fluid layout**, not three static exports per breakpoint — sidebar collapses to a bottom tab bar under 820px, consistent with how the rest of Auriva's approved mockups already work.
- The **Professional plan toggle** is shown as two screens on purpose: a clinic-facing "Request upgrade" (Owner) and a separately-labeled "Auriva Internal Admin" reference screen — because ADR-004 puts the real control outside the clinic product entirely.

---

## 1. Welcome / Solo Onboarding

| | |
|---|---|
| **User goal** | Understand what the Solo plan includes and optionally start building a team, right after first login. |
| **Screen purpose** | Confirm plan (Solo, free forever) and give a soft, dismissible nudge toward Team — never a blocking step (BP-02 Progressive Disclosure). |
| **Components** | Plan confirmation card, feature list, two CTAs ("Go to my clinic" primary, "Invite my team" secondary/optional). |
| **Interaction notes** | Neither CTA is mandatory to proceed — a solo practitioner using only themselves must reach their clinic in one tap. |
| **Navigation** | Entry point only, shown once after onboarding; reachable afterward only indirectly (not a persistent nav item). |
| **State variations** | Single state — this screen has no data to load, error, or leave empty. |

## 2. Dashboard (Adaptive)

| | |
|---|---|
| **User goal** | See what matters *to my role* the moment I log in, without navigating past irrelevant content. |
| **Screen purpose** | The single home screen for every role — content and available actions change, the URL/shell does not (BP-03, BP-04). |
| **Components** | Greeting, role-appropriate KPIs, one contextual callout per role (Owner/Owner+Doctor: seat usage + upgrade nudge; Doctor: "your schedule only" framing; Receptionist: front-desk queue framing). |
| **Interaction notes** | The role-conditional callout is the primary demonstration of Adaptive Navigation — switching **Preview as** must visibly change this section without a page reload. |
| **Navigation** | Always the first/default nav item for every role; bottom-tab "Home" on mobile. |
| **State variations** | Not built in this pass: loading skeleton for KPIs (same skeleton pattern as Team's loading state — reusable component, not a new one). |

## 3. Team Management

| | |
|---|---|
| **User goal** | See who has access to my clinic and act on it (suspend, archive, invite more) in one place. |
| **Screen purpose** | The operational home for BR-001 (invite/suspend/archive) and the membership-lifecycle business rules. |
| **Components** | Seat-usage indicator (sidebar, persistent), member table (avatar, name, role, status pill, joined date, row action menu), Invite CTA. |
| **Interaction notes** | Row menu (⋯) opens Suspend/Reactivate/Archive depending on current status — never shows an action that isn't a valid forward transition (mirrors the frozen Active→Suspended→Archived model). Archive always opens a confirmation modal. |
| **Navigation** | Owner / Owner+Doctor only — not shown to Doctor or Receptionist. |
| **State variations** | **Empty** (brand-new Solo clinic, owner-only) · **Loading** (skeleton rows) · **Populated** (mixed statuses shown, including an Archived row to demonstrate records-preserved) · **At seat limit** (adds an inline upsell note pointing to Plan). All four are live-toggleable in the prototype via the "Simulate" bar. |
| **Open item surfaced, not resolved** | The Archive confirmation modal explicitly displays the **doctor-reassignment-on-archive** open question (future appointments: stay assigned / require reassignment / auto-cancel) rather than silently picking a behavior. This must be answered before Archive can be built for real. |

## 4. Invitation Flow (create side)

| | |
|---|---|
| **User goal** | Get a new doctor or receptionist into the clinic with the least possible friction. |
| **Screen purpose** | Implements ADR-003 exactly: generate a secure link, then the owner shares it themselves — no automated delivery. |
| **Components** | 3-step flow (form → generating → link-ready) with a step indicator; role picker (Doctor/Receptionist) with a conditional Specialty field; generated-link display; **Share on WhatsApp** and **Copy Link** actions (in that order — WhatsApp is the primary path per the India-market decision). |
| **Interaction notes** | Form validates name + a plausible mobile number before allowing "Generate invite link" (mobile number is required specifically because it's what WhatsApp share needs — not incidental). The 72-hour expiry is stated on the link-ready screen so the owner sets expectations with the invitee. |
| **Navigation** | Owner / Owner+Doctor only, reachable from Team's Invite CTA or directly from the sidebar. |
| **State variations** | **Form (idle)** · **Generating (loading)** · **Link ready (success)** · **Validation error** (empty/invalid fields, inline) · **Duplicate-active-member error** (the frozen business rule — "duplicate invitations for the same active member are not permitted" — shown as a dismissible inline error, toggleable via Simulate). |

## 5. Invitation Acceptance (the invited person's view)

| | |
|---|---|
| **User goal** | Join the clinic quickly, or understand clearly why I can't. |
| **Screen purpose** | The other half of ADR-003 — what the invitee sees when they open the shared link. |
| **Components** | Clinic + inviter + role confirmation, password field, "Join clinic" CTA. |
| **Interaction notes** | This screen is reached from *outside* the authenticated shell (the invitee has no account yet) — in the prototype it's reachable via Simulate buttons on the Invite screen for review purposes only. |
| **Navigation** | Not part of the authenticated nav at all — a standalone landing page in the real product. |
| **State variations** | **Valid, pending invite** (form shown) · **Expired invite** (72h elapsed — blocks the form entirely, points back to the owner to resend). Revoked would render identically to Expired from the invitee's perspective (no distinct copy needed — both mean "this link no longer works"). |

## 6. Plan & Professional Upgrade

| | |
|---|---|
| **User goal** | Understand what I get on Professional and ask for it, without being sold a payment flow I wasn't promised. |
| **Screen purpose** | Implements ADR-004 — plan comparison + a *request*, not a self-service purchase. |
| **Components** | Two plan cards (Solo — current, Professional — target) with exact BRD headcounts, "Request upgrade" CTA, disclosure line clarifying Auriva applies the change (sets expectations honestly rather than implying instant self-service). |
| **Interaction notes** | After requesting, the CTA shows a brief loading state then a persistent confirmation card — reinforces BP-05 (no data loss messaging) by stating explicitly that team/data stay unchanged. |
| **Navigation** | Owner / Owner+Doctor only. |
| **State variations** | **Idle** (both plans shown) · **Requesting (loading)** · **Requested (success, persistent until page reload in this prototype)**. An "already Professional" state is not designed — same card, Professional side would just show "Active" instead of "Request upgrade" (reuses the Active pill component already defined for Team). |

## 7. Auriva Internal Admin (reference only)

| | |
|---|---|
| **User goal** | *(Not a clinic-product user goal — this belongs to Auriva ops, not the clinic owner.)* |
| **Screen purpose** | Shown only so the actual plan-toggle mechanism named in ADR-004 is visible somewhere in this review, clearly labeled as out-of-product. |
| **Components** | Minimal plan-tier selector + apply action. |
| **Interaction notes** | Deliberately unstyled/minimal relative to the rest of the prototype — signals "not the same product surface" visually, not just via the disclaimer banner. |
| **Navigation** | Not linked from the clinic shell at all in the real product; included here only via the prototype's own screen index. |
| **State variations** | Not designed further — this is a placeholder acknowledging the mechanism exists, not a spec for Auriva's internal tooling (out of this BRD's scope). |

---

## Components reused across screens (design-system inventory)

| Component | Used in | Notes |
|---|---|---|
| Status pill (Active/Suspended/Archived/Pending/Expired) | Team, Invitation states | One component, five color tokens — do not invent new status colors elsewhere. |
| Row action menu (⋯) | Team | Reusable for any future list requiring per-row actions. |
| Step indicator (dot rail) | Invitation flow | Reusable for any future multi-step flow (e.g., a future onboarding wizard). |
| Skeleton loader | Team (loading state) | One pattern for every loading state — do not design bespoke skeletons per screen. |
| Empty state (icon + message + primary CTA) | Team (empty) | Reusable shape for any future empty list. |
| "Simulate" bar | Prototype-only | Not a real product component — a review affordance, remove before any real build. |

## Explicitly not designed in this pass

- **Owner account recovery** — no screen, per the open ADR. Do not infer one from the login/auth screens elsewhere in the product.
- **Suspend confirmation** — Suspend is treated as a lighter-weight, reversible action (no modal, unlike Archive) in this draft; flag if Product Office wants it to also confirm.
- **Notification-center UI** — the notification-architecture guidance (recipient-agnostic interface, implementation may still be separate) is a backend/service concern, not a new screen in this round.
- **Audit/activity log screen** — the audit *data* shape (who/what/target/when/where/result) was specified for backend design; whether Owners get a visible activity log UI was not requested in the BRD's named journeys, so none is mocked. Flag if wanted.

## Review checklist for Product Office

- [ ] Adaptive Navigation behaves as expected across all 4 roles (use Preview as)
- [ ] Team Management states (empty/loading/populated/at-limit) match expectations
- [ ] Invitation flow — WhatsApp-first framing reads correctly, 72h expiry messaging is clear
- [ ] Archive flow's open-question framing is acceptable as a placeholder, or needs the ADR answered first
- [ ] Plan/Upgrade "request, not purchase" framing matches ADR-004 intent
- [ ] Mobile layout (bottom nav, collapsed sidebar) — reviewed on an actual phone-width window
