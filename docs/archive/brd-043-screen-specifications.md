# BRD-043 — Screen Specifications (companion to the HTML prototype)

**Prototype:** `design/mockups/brd-043-team-management.html` — v1.1, pre-UX-Freeze refinement round. Open in any browser, static, no backend, no framework.

**Status:** This is explicitly framed as **the last conceptual review before UX Freeze**. After Product Office signs off on this round, further changes are bug fixes / implementation corrections only — not new conceptual changes.

**Framing decisions carried forward from v1.0, still true:**
- One adaptive **Dashboard**, not three separate workspace screens (BP-03) — no workspace switching.
- **Responsive = one fluid layout** — sidebar collapses to a bottom tab bar under 820px.
- **Prototype = design contract.** Once frozen, React implementation must reproduce this faithfully; any deviation to layout, workflow, navigation, or interaction pattern requires Product Office approval before implementation, not after.

---

## What changed in v1.1 (this refinement round)

| # | Change | Why |
|---|---|---|
| 1 | Dashboard rebuilt as **4 genuinely distinct layouts**, each answering its own primary question — not shared content with swapped labels. Doctor's dashboard now contains **zero** revenue/collection/subscription/team markup (verified by automated check — not just visually hidden). | Mandatory #1 |
| 2 | Archive is now a real **state machine**: no conflicts → immediate archive; future appointments/active consultations exist → **blocked**, reconciliation dialog requires every item reassigned to another active doctor before Archive enables. Auto-cancel and retain-assignment are not offered as options anywhere. | Mandatory #2, now a closed decision |
| 3 | Sidebar regrouped: **Settings → Practice · Team · Plan**, replacing flat top-level items. The standalone "Invite" nav item was removed — reached only via Team's "Invite member" button (fewer top-level items, per the cleaner-IA note). | Mandatory #3 (+ Priority 3 #11, same change) |
| 4 | Team member list is now **responsive cards** (avatar, name, role, status, overflow menu), not a table. | Mandatory #4 |
| 5 | **Team growth indicator** added to the Team screen: current plan, seats used, upgrade CTA with target headcounts. | Mandatory #5 |
| 6 | Invite form's mobile-number field now validates **live, while typing** (Available / Already invited / Already active) — submit is disabled until the number is clear, not just checked on submit. | Mandatory #6 |
| 7 | Financial privacy verified structurally: Doctor's role-block literally does not contain revenue/collection/subscription/team markup in the DOM. Receptionist's payment content is framed operationally ("pending payments to collect"), never as analytics. | Important #7 |
| 8 | Role names standardized everywhere: **Practice Owner · Managing Doctor · Doctor · Receptionist.** No "Owner + Doctor," no "Clinic Administrator" or similar synonyms anywhere in the file. | Important #8 |
| 9 | Empty states kept icon-based (no illustration assets exist in this codebase to embed honestly) but visually upgraded — warmer gradient badge, larger icon. Stated plainly here rather than overclaiming "illustrations." | Important #9 (partial — see note) |
| 10 | Status badge colors corrected to the frozen standard: 🟢 Active · 🟡 Pending/Invited · **🔴 Suspended (was incorrectly amber in v1.0 — fixed)** · ⚪ Archived. | Important #10 |
| 11 | Navigation grouping — same change as #3. | Nice #11 |
| 12 | Plan screen now shows **three tiers**: Solo, Professional, and a visibly disabled **Enterprise (Coming soon)** card with no functional CTA — pure roadmap communication. | Nice #12 |
| 13 | Role-switch now re-triggers a brief fade on the Dashboard content so content changes don't feel like a hard cut. Nav item visibility itself stays instant/non-animated — deliberately, to keep Adaptive Navigation's correctness (a Mandatory item) simple and reliable rather than risking it for a Nice-to-have. | Nice #13 (scoped) |

**Note on #9:** "Auriva illustrations" were requested; none exist as assets in this codebase, and generating original illustration artwork is out of scope for what this prototype format can produce well. What shipped instead is a more polished icon-based empty state. Flag if real illustration assets exist elsewhere and should be sourced in.

---

## Screen-by-screen (updated)

### 1. Welcome / Solo Onboarding
Unchanged from v1.0 except role copy ("Managing Doctor" instead of "Owner + Doctor"). Single state, no data to load/error/empty.

### 2. Dashboard — role-driven (rebuilt)

| Role | Primary question | Shows | Never shows |
|---|---|---|---|
| **Practice Owner** | How is my clinic performing today? | Today's appointments (all doctors), revenue, pending collections, team status, operational alerts | A personal consultation queue (Owner isn't clinical) |
| **Managing Doctor** | How are my patients and my practice doing today? | My consultation queue, today's appointments, team overview, practice performance/revenue, operational alerts | Nothing withheld — richest view, both hats |
| **Doctor** | Who is my next patient? | Next-patient hero, today's appointments, follow-ups, recent consultations | Revenue, collections, subscription, team management, business KPIs — **hard exclusion**, verified by automated content check, not CSS-hidden |
| **Receptionist** | Who is waiting and what needs attention? | Waiting queue, today's appointments, pending payments (operational framing), walk-ins | Clinical documentation, revenue analytics, team management |

**Interaction notes:** all four layouts live in the DOM simultaneously, gated by the same `data-roles` mechanism as navigation; switching **Preview as** swaps which is visible and briefly re-fades the container. **State variations not built:** KPI loading skeletons (would reuse the same skeleton pattern already defined for Team's loading state).

### 3. Settings → Practice (new placeholder)
Deliberately minimal — real Practice Setup (doctor photo, clinic logo/cover, hours, fees, gallery) is **already shipped, production code** (P3). This screen exists only to show where it sits in the new Settings grouping, not to re-design something already approved and built.

### 4. Settings → Team (substantially rebuilt)

| | |
|---|---|
| **User goal** | See who has access, act on it, and understand growth headroom, in one place. |
| **Components** | Growth indicator card (plan, seats used, upgrade CTA) · member cards (avatar, name, role, status pill, overflow menu) · Invite CTA. |
| **State variations** | Empty · Loading (card skeletons) · Populated · At seat limit — all Simulate-toggleable. |
| **Archive interaction — now fully specified:** | Clicking Archive checks for future appointments / active consultations. **None found** (e.g., Priya Sharma, a receptionist) → simple confirm, archives immediately. **Conflicts found** (e.g., Dr. Vikram Shah, 2 upcoming items) → **blocked**, opens a reconciliation dialog listing every conflicting item with a mandatory "Reassign to" dropdown per row; the Archive button stays disabled until every row is resolved. Verified: enabling only 1 of 2 keeps the button disabled; resolving both enables it. |

### 5. Invitation flow (validation upgraded)
Structure unchanged (3-step: form → generating → link ready, WhatsApp + Copy Link per ADR-003, 72h expiry). **New:** the mobile-number field checks live, on every keystroke, against known numbers and shows one of three inline states (Available / Already invited / Already active) — submit is disabled for the latter two. Verified via three seeded mock numbers reachable from the Simulate bar.

### 6. Invitation acceptance
Unchanged from v1.0 (valid + expired states).

### 7. Settings → Plan (extended)
Now three cards: **Solo** (current), **Professional** (Request upgrade, per ADR-004 — a request, not self-service payment), **Enterprise** (visibly disabled, "Coming soon," no functional CTA — roadmap communication only). The separate "Auriva Internal Admin" reference screen from v1.0 was dropped from the nav in this round to reduce screen count per the cleaner-IA note; the mechanism it illustrated (ADR-004's real toggle living outside the clinic product) is now stated as a caption line on this screen instead of a separate screen.

---

## Components reused across screens (updated inventory)

| Component | Used in | Notes |
|---|---|---|
| Status pill (Active/Suspended/Archived/Pending/Expired) | Dashboard, Team | Colors now match the frozen standard exactly: green/red/grey/amber. |
| Member card (`.mcard`) | Team | Replaces the v1.0 table entirely — mobile-first grid, auto-fits down to 1 column. |
| Reconciliation row (`.reconrow`) | Archive dialog | New — pairs a conflicting item with a mandatory reassignment select; a checkmark confirms once resolved. |
| Growth indicator | Team | New — reusable anywhere a seat-limit needs surfacing (e.g., could recur on Dashboard for Owner/Managing Doctor — not currently duplicated there to avoid redundancy). |
| Inline field note (`.fieldnote`) | Invite form | New — three tone variants (ok/warn/err); reusable for any future live-validated field. |
| Settings nav group | Sidebar | New — `Settings` label + `.nav-item.sub` — reusable if more grouped sections are needed later. |

## Explicitly still not designed
- **Owner account recovery** — remains undecided, remains unmocked.
- **Suspend confirmation** — still treated as lighter-weight/reversible, no modal (unlike Archive). Flag if Product Office wants this to also confirm.
- **Notification-center UI, audit/activity-log UI** — unchanged from v1.0, out of this round's named scope.

## Review checklist for Product Office (updated)

- [ ] Each role's Dashboard genuinely answers its own question — not a shared screen
- [ ] Doctor's dashboard has zero financial/business content (verified automatically, not just visually)
- [ ] Archive: no-conflict path is immediate; conflict path is blocked until fully reassigned
- [ ] Settings → Practice/Team/Plan grouping reads as one coherent section
- [ ] Team is cards on mobile, not a squeezed table
- [ ] Growth indicator communicates upgrade path without being pushy
- [ ] Invite phone field's live validation feels helpful, not naggy
- [ ] Role names read consistently as Practice Owner / Managing Doctor / Doctor / Receptionist throughout
- [ ] Status badge colors match: green/amber/red/grey
- [ ] Enterprise card reads clearly as "not available," not as a live option
- [ ] Responsive verified 320–1440px (automated: clean, no horizontal overflow at any width)

**If approved as-is:** this becomes UX Freeze v1.0. Next: Implementation Plan → Epic Breakdown → User Stories → Sprint Planning.
