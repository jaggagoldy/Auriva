# BRD-043 — Founder Demo Guide

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). One walkthrough per sprint, written now so engineers know exactly what "demoable" means for each sprint's deliverables before they start building. Update each section with real screenshots/notes as each sprint actually ships — this is the script, not a record.

**Test account:** solo clinic owner `+15550300123` / `password123` (existing seeded test clinic — see [[auriva-solo-first-build-focus]] memory). For BRD-043 demos, this account should be promoted to Managing Doctor role-state where noted, and a second seeded doctor + receptionist added once Sprint 2 (invitations) is demoable.

---

## Sprint 1 — Foundation (no user-visible demo)

Sprint 1 has **no UI** by design (see EEP-043 §14) — it's schema and platform hardening. There is no click-through demo. Instead, verify:

| Step | Action | Expected result |
|---|---|---|
| 1 | Query a pre-existing `StaffProfile` row | `membership_status = 'active'` present, no other field changed |
| 2 | Attempt to accept an invitation created >72h ago (seed one with a backdated `created_at`) | Rejected with a clear "expired" error, not a generic 500 |
| 3 | Fire 10 rapid invitation-creation requests from one IP | Requests beyond the configured limit return 429 |
| 4 | Seed a clinic with 2 active doctors, book appointments for each, load Today | Each doctor's appointments show correctly attributed — no cross-doctor bleed |

**Founder takeaway:** "nothing looks different, and that's correct — this sprint made the next 5 sprints possible without breaking anything that already works."

---

## Sprint 2 — Invitation System

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in as the solo owner (`+15550300123`) → Settings → Team → Invite member | Invite form opens: name, role (Doctor/Receptionist), specialty (if Doctor), mobile number |
| 2 | Type a mobile number that already belongs to an active team member | Inline red text: "Already active — this person is already on your team"; submit disabled |
| 3 | Clear it, type a fresh number | Inline green text: "Available"; submit enabled |
| 4 | Fill name, submit | Brief loading state, then a generated link with **Share on WhatsApp** and **Copy Link** buttons, and "expires in 72 hours" copy |
| 5 | Click Share on WhatsApp | WhatsApp opens (or the deep-link intent fires) with the invite message pre-filled, link included |
| 6 | Open the link in an incognito window | Acceptance page: clinic name, inviter, role, password field |
| 7 | Set a password, join | New account created, redirected appropriately |
| 8 | Attempt to open the same link again | Rejected — invitation already accepted |

**Founder takeaway:** "this is the whole invite loop, no email, no SMS — exactly the WhatsApp-first flow we decided on."

---

## Sprint 3 — Adaptive Dashboard

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in as the Managing Doctor (owner who is also the clinic's doctor) | Dashboard shows: consultation queue, today's appointments, team overview, practice performance/revenue, operational alerts — the richest view |
| 2 | Log in as a plain Doctor (the team member added in Sprint 2's demo) | Dashboard shows: next-patient hero, today's appointments, follow-ups, recent consultations. **Open dev tools → Network tab → inspect the dashboard API response** — confirm no `revenue`/`collections`/`subscription`/`team` keys exist in the JSON at all |
| 3 | Log in as the Receptionist | Dashboard shows: waiting queue, today's appointments, pending payments (framed as "to collect," not analytics), walk-ins |
| 4 | (If a non-doctor Owner account exists) Log in as Practice Owner | Dashboard shows: today's appointments across all doctors, revenue, pending collections, team status — no personal consultation queue |

**Founder takeaway:** "four people can be logged into the same clinic right now, looking at the same URL, and each one sees exactly what their job needs — nothing more, nothing less. Check the network tab on the Doctor login — the revenue data isn't just hidden, it was never sent."

---

## Sprint 4 — Team Membership Lifecycle

| Step | Action | Expected result |
|---|---|---|
| 1 | Log in as owner → Settings → Team | Member cards: Managing Doctor (you), the Doctor and Receptionist from Sprint 2, each with a status pill and (except your own) an overflow menu |
| 2 | Note the growth indicator card | Shows "Solo · 2/2 seats · Upgrade to Professional for 5 doctors, 15 members" |
| 3 | Open the Receptionist's overflow menu → Suspend | Status pill flips to red "Suspended," no confirmation needed |
| 4 | Open the same menu → Reactivate | Status pill flips back to green "Active" |
| 5 | Book a future appointment for the Doctor (via Today/booking), then try to Archive that Doctor | **Blocked** — a reconciliation dialog opens listing the conflicting appointment, with a "Reassign to" dropdown; the Archive button is visibly disabled |
| 6 | Select a reassignment target, confirm Archive is now enabled, click it | Archive succeeds; the appointment now shows the new doctor; the archived doctor's card greys out, status "Archived" |
| 7 | Try to archive a team member with no future appointments (e.g., the Receptionist) | Simple confirm dialog, no reconciliation step, archives immediately |
| 8 | Attempt to invite a 3rd member while at the 2/2 Solo seat limit | Rejected with a clear "upgrade to add more" message, linking to Plan |

**Founder takeaway:** "you cannot lose an appointment by archiving someone — the system physically won't let you until every conflict is resolved. That was the one rule we were firmest about."

---

## Sprint 5 — Plan, Upgrade & Settings IA

| Step | Action | Expected result |
|---|---|---|
| 1 | Settings sidebar | Now shows a "Settings" group containing Practice, Team, Plan — no more scattered top-level items, and no standalone "Invite" item (it's inside Team now) |
| 2 | Settings → Plan | Three cards: Solo (current, active pill), Professional (Request upgrade button), Enterprise (visibly greyed out, "Coming soon," button disabled) |
| 3 | Click Enterprise's button | Nothing happens — it's genuinely inert, not a dead link |
| 4 | Click "Request upgrade" on Professional | Brief loading, then "Upgrade requested — Auriva will confirm within 1 business day. Your team and data stay exactly as they are." The plan itself has NOT changed yet. |
| 5 | (Ops-only, separate internal tool, not the clinic product) Auriva admin changes the org's plan to Professional | Next time the owner loads Plan, Solo card is replaced by Professional as current, seat ceiling now shows 5 doctors / 15 members |
| 6 | Invite past the old 2-seat limit (now that Professional is active) | Succeeds |

**Founder takeaway:** "the upgrade path is exactly what we agreed — a request, not a self-checkout. No payment form anywhere in the clinic product."

---

## Sprint 6 — Release Candidate

No new demo content — this sprint re-runs every demo above end to end, back to back, on a staging build, as the final pre-launch walkthrough. See the [Product Verification Guide](./brd-043-product-verification-guide.md) for the exhaustive version Product Office can run independently.
