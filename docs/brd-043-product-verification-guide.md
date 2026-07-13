# BRD-043 — Product Verification Guide

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). Written so Product Office can independently verify every implemented feature **without reading code**. Organized by feature area (matching the Epics); each block covers navigation path, test steps, expected behaviour, success criteria, failure behaviour, and edge cases.

---

## 1. Adaptive Dashboard (Epic 3)

**Navigation path:** log in → land on Dashboard (default view).

| Test | Steps | Expected | Success criteria | Failure behaviour | Edge cases |
|---|---|---|---|---|---|
| Role-correct content | Log in as each of the 4 roles in turn | Each shows its own primary question and content set (see [Founder Demo Guide](./brd-043-founder-demo-guide.md) Sprint 3) | Content matches the approved prototype exactly for each role | If a Doctor sees any revenue/collection/subscription/team content, this is a **P0 defect**, not a cosmetic bug | A clinic with only one person (Owner=Doctor, no team yet) still renders the Managing Doctor layout correctly with empty team-overview state |
| Financial privacy | As Doctor, open browser dev tools → Network tab → find the dashboard request | Response JSON has no revenue/collection/subscription/team keys | Confirmed by inspecting the raw response, not just the rendered page | If the data is present in the response but hidden by CSS, this fails verification even though it "looks" correct | N/A |

---

## 2. Team Management & Membership Lifecycle (Epic 4)

**Navigation path:** Settings → Team.

| Test | Steps | Expected | Success criteria | Failure behaviour | Edge cases |
|---|---|---|---|---|---|
| Suspend | Open a member's overflow menu → Suspend | Status pill turns red "Suspended" immediately, no confirmation dialog | Member can no longer log in / access any clinic function afterward | If a suspended member retains access, this is a P0 security defect | Suspending, then immediately re-inviting the same phone number should show "Already active" — not allow a duplicate |
| Reactivate | Suspended member → Reactivate | Pill returns to green "Active," access restored | Member regains exactly their role-default access (no more, no less) | — | — |
| Archive, no conflicts | Archive a receptionist (or a doctor with no future appointments) | Simple confirm dialog → immediate archive | Historical records visibly preserved (past visits/notes still viewable elsewhere in the product) | — | Archiving twice should be impossible (already-archived members show no Archive action) |
| Archive, WITH conflicts | Book a future appointment for a doctor, then try to archive them | **Blocked.** Reconciliation dialog lists every conflicting appointment/consultation | Archive button stays disabled until every listed item has a reassignment selected | If Archive succeeds while any row is unresolved, this is a **P0 defect** — it directly violates the frozen archive rule | Try selecting a reassignment, then changing your mind and clearing it — Archive button must re-disable |
| Archive rejects auto-cancel/retain | Attempt to find any UI path that cancels the conflicting appointment instead of reassigning it, or that archives while leaving the appointment on the archived doctor | No such path should exist anywhere | Confirmed absent by attempting to find it, not just by its absence in the happy path | If found, this is a P0 defect — those two behaviours are explicitly forbidden by the frozen business rule | — |
| Owner protection | Look for a Suspend/Archive option on your own (Owner) row | None exists | The Owner's row has no overflow menu at all | If any Suspend/Archive control appears on the Owner's own row, this is a P0 defect (Owner cannot be suspended or archived per frozen BR) | — |

---

## 3. Invitation System (Epic 2)

**Navigation path:** Settings → Team → Invite member.

| Test | Steps | Expected | Success criteria | Failure behaviour | Edge cases |
|---|---|---|---|---|---|
| Live validation | Type a known-active member's phone number | Inline red "Already active," submit disabled | Feedback appears while typing, not only after clicking submit | If validation only fires on submit, this fails — the frozen requirement is explicitly "inline, live" | Typing quickly then deleting should not show a flash of the wrong state (debounce should feel smooth) |
| WhatsApp share | Complete the form, generate link, click Share on WhatsApp | WhatsApp opens with the link pre-filled in a message | Works on both mobile and desktop WhatsApp (Web or app) | If it opens a blank compose or fails silently, this fails | — |
| No email/SMS | Complete an invite, check whether any email or SMS was sent | None sent | Confirmed by checking there is no delivery mechanism at all in this release — not just "none sent this time" | If any email/SMS integration exists anywhere in this flow, it's out of scope and should be flagged, not silently allowed | — |
| 72h expiry | Generate an invite, wait (or use a backdated test fixture) past 72 hours, then try to accept it | Rejected with a clear "this invite has expired" message | Enforced even if the acceptance page was already open before expiry (server-checked, not just client-checked) | If an expired link still works, this is a P0 defect | Resending an invite should reset the 72h window |
| Seat limit | At the plan's seat ceiling, attempt to invite one more | Rejected with a message pointing to Plan/Upgrade | Enforced server-side (test by attempting the same action twice quickly, or via a direct tool if available) | If the limit can be bypassed, this is a P0 defect tied directly to the commercial model | Suspended/archived members should NOT count toward the seat total — verify by suspending someone at the limit and confirming a new invite is now possible |

---

## 4. Plan & Professional Upgrade (Epic 5)

**Navigation path:** Settings → Plan.

| Test | Steps | Expected | Success criteria | Failure behaviour | Edge cases |
|---|---|---|---|---|---|
| Three tiers shown | Open Plan | Solo (current), Professional, Enterprise (visibly disabled) | Enterprise's button does nothing when clicked — not a dead link, not an error, simply inert | If Enterprise triggers any action, flag as scope creep | — |
| Request, not purchase | Click "Request upgrade" | Success message stating Auriva will confirm; **plan does not change immediately** | Re-check the Plan screen afterward — still shows Solo as current until Auriva applies it | If clicking Request upgrade immediately flips the plan, this is a P0 defect — it violates the frozen "administrative plan management, no self-service" decision | — |
| No payment UI anywhere | Search the entire Plan/Upgrade flow for any card-entry field, payment provider branding, or pricing-checkout language | None exists | Confirmed absent | If any payment collection UI appears anywhere in this flow, it is explicitly out of scope for this release | — |

---

## 5. Settings Information Architecture (Epic 6)

**Navigation path:** the sidebar itself.

| Test | Steps | Expected | Success criteria | Failure behaviour | Edge cases |
|---|---|---|---|---|---|
| Grouping | View the sidebar as Owner/Managing Doctor | A "Settings" section header, with Practice/Team/Plan nested under it | Matches the approved prototype's grouping exactly | — | — |
| Role hiding | Log in as Doctor or Receptionist, view the sidebar | No "Settings" section appears at all | Confirmed by inspecting the page (view source / dev tools), not just visually — the section should not be merely hidden by CSS | If a Doctor can navigate directly to a Settings URL and reach Team/Plan, this is a P0 access-control defect, not just a nav-polish issue | Directly typing a Settings URL as a Doctor should be blocked server-side, independent of whether the nav link is shown |

---

## 6. Cross-cutting: Role Naming & Badge Colors

| Test | Steps | Expected | Success criteria |
|---|---|---|---|
| Role naming | Read every screen's copy referring to roles | Only "Practice Owner," "Managing Doctor," "Doctor," "Receptionist" appear — never "Clinic Administrator," "Business Admin," "System Admin," or "Owner + Doctor" | Zero occurrences of forbidden terms anywhere in the shipped UI |
| Badge colors | Check status pills across Team and Dashboard | 🟢 Active, 🟡 Pending/Invited, 🔴 Suspended, ⚪ Archived | Suspended is specifically verified as red, not amber — this was an actual bug caught and fixed during prototyping, worth re-checking in the real build |

---

## Sign-off

This guide is considered satisfied when every row above has been independently verified by Product Office (not just Engineering's own QA pass) against a staging build, with all P0 items resolved. This is the gate for the Release Candidate sprint's exit criteria.
