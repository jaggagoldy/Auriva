# Sprint 1 — Engineering Verification Guide

Companion to the [Sprint 1 Completion Report](./brd-043-sprint1-completion-report.md). Sprint 1 shipped **no UI** by design — it's schema and platform hardening (see [EEP-043 §14](./eep-043-engineering-execution-plan.md)). This is the technical version of the verification steps, for engineers/QA: curl, Prisma Studio, SQL, and session cookies. For a non-technical, browser-only walkthrough, see the companion [Product Office Verification Guide](./brd-043-sprint1-product-office-verification.md).

Assumes the local dev environment from [[auriva-solo-first-build-focus]]: `npm run dev`, seeded Postgres, a logged-in owner session cookie (sign in at `/login` with `+15550300123` / `password123`, then copy the `auriva_staff_session` cookie from your browser's dev tools — Application → Cookies — for use in the `curl` commands below).

---

## 1. US-101 — Membership status exists and defaults correctly

**Check:** every existing staff member now has a status, and nothing else about them changed.

Open Prisma Studio (`npx prisma studio`), go to the `Staff_Profiles` table, and look at the `membership_status` column.

**Expected:** every row reads `active`. No row is blank, no row reads anything else. Every other column (name, specialty, fee, etc.) is exactly what it was before.

---

## 2. US-102 — Invitations expire after 72 hours, enforced by the server

Sprint 2 builds the Invite screen; for now, create an invitation directly via the API as the logged-in owner:

```bash
curl -s -X POST http://localhost:3000/api/organizations/<your-org-id>/invitations \
  -H "Content-Type: application/json" \
  -b "auriva_staff_session=<your-session-cookie>" \
  -d '{"clinic_id":"<your-clinic-id>","email":"test-verify@example.com","full_name":"Verify Test","role":"receptionist"}'
```

**Expected:** a `201` response with an `expires_at` field roughly 72 hours in the future.

Now open Prisma Studio, find that row in `Invitations`, and manually edit `expires_at` to a time in the past (e.g. yesterday). Then try to accept it:

```bash
curl -s -X POST http://localhost:3000/api/invitations/<the-token>/accept \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}'
```

**Expected:** a `409` response with the message "This invitation has expired." — not a success, not a generic error. Reload the row in Prisma Studio: its `status` should now read `expired`.

A non-technical reviewer can observe a related, simpler signal of this same behavior in a browser — see the Product Office Verification Guide's US-102 section (visiting an already-expired `/join/[token]` link shows an "expired" error page).

---

## 3. US-103 — Rate limiting on invite create + accept

**Check:** repeated rapid invitation attempts get throttled; a single legitimate one does not.

### Exact rate-limit configuration

Two endpoints, each with two independent limits (whichever is hit first wins), mirroring the existing quick-setup route's two-dimension (identity + IP) pattern:

**Invitation CREATE** (`POST /api/organizations/[id]/invitations`):
- 20 requests per 60 minutes, per organization
- 30 requests per 60 minutes, per IP

**Invitation ACCEPT** (`POST /api/invitations/[token]/accept`):
- 5 requests per 60 minutes, per invitation token
- 10 requests per 60 minutes, per IP

The counters are in-memory (reset on process restart) — a known limitation shared with the existing rate limiter, documented in `src/lib/rate-limit.ts`.

### Reproduction

Run the create-invitation `curl` command from step 2 twenty-one times in a row (a quick shell loop: `for i in $(seq 1 21); do curl ...; done`, varying the email each time so it's not rejected as a duplicate).

**Expected:** the first 20 succeed (`201`); the 21st returns `429` with a `Retry-After` header and the message "Too many invitations sent. Please try again later."

A single invitation sent on its own, without the loop, always succeeds normally — the limit only engages under rapid repetition.

The same pattern applies to the accept endpoint at its own (lower) thresholds (5 per token / 10 per IP, per 60 minutes) — a loop of 6+ accept attempts against the same token should trip the token-scoped limit first.

---

## 4. US-104 (P0) — A clinic with 2+ doctors never gets the wrong one

This is the most important check in this sprint — the Feasibility Report flagged it launch-blocking.

**Setup:** using Prisma Studio, find a clinic that currently has exactly one doctor (any seeded solo clinic). Duplicate that doctor's `Staff_Profiles` row as a second doctor at the same clinic (give the copy a different `user_id` pointing at any other user, and make sure `specialty` is filled in — that's what marks a profile as "a doctor" in this system).

**Check A — booking:** as a receptionist at that clinic (or the owner, if they aren't one of the two doctors), try to book a patient:

```bash
curl -s -X POST http://localhost:3000/api/clinic/book \
  -H "Content-Type: application/json" \
  -b "auriva_staff_session=<receptionist-session-cookie>" \
  -d '{"patient_name":"Test Patient","patient_phone":"9999999999","scheduled_time":"2026-07-20T10:00:00.000Z"}'
```

**Expected:** a `409` response — **not** a successful booking. Before this sprint, this request would have silently booked the patient onto whichever doctor happened to come back first from the database — sometimes not even a doctor at all, possibly a receptionist's own profile.

**Check A2 — disambiguation via `doctor_id`:** repeat the same request, this time including the optional `doctor_id` field with one of the two doctors' `Staff_Profiles` IDs:

```bash
curl -s -X POST http://localhost:3000/api/clinic/book \
  -H "Content-Type: application/json" \
  -b "auriva_staff_session=<receptionist-session-cookie>" \
  -d '{"patient_name":"Test Patient","patient_phone":"9999999999","scheduled_time":"2026-07-20T10:00:00.000Z","doctor_id":"<staff-profile-id>"}'
```

**Expected:** a `201` success, booked onto the specified doctor. This confirms the new optional field (dormant for every existing Sprint-1 caller, since none send it) correctly resolves ambiguity when supplied.

**Check B — everything else keeps working normally for a solo clinic:** repeat the exact same request (without `doctor_id`) against a clinic that still has only one doctor.

**Expected:** a `201` success — booking behavior for every existing solo clinic (the entire install base today) is completely unchanged.

**Check C — read-path degrade:** call `/api/clinic/overview` or `/api/clinic/schedule` for the now-ambiguous clinic.

**Expected:** a `200` response with no doctor selected (degrades safely to "no doctor," not a 500, not a guess) — logged as a `warn`, not surfaced to the UI yet (tracked as Technical Debt #1 in the completion report).

---

## 5. US-501 — Organization plan field exists and defaults correctly

Open Prisma Studio, go to the `Organizations` table, and look at the `plan` column.

**Expected:** every existing organization reads `solo`. Nothing else about any organization row changed. This field does nothing yet — the Plan screen and seat enforcement that read it ship in Sprints 2 and 5.

---

## Sign-off

Sprint 1 is verified when all 5 sections above behave exactly as described. None of this sprint's changes are visible in the product's UI — that is expected and correct for a foundation sprint. The next thing you should be able to see and click is Sprint 2's Invite screen.
