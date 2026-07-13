# Sprint 1 — Founder Verification Guide

Companion to the [Sprint 1 Completion Report](./brd-043-sprint1-completion-report.md). Sprint 1 shipped **no UI** by design — it's schema and platform hardening (see [EEP-043 §14](./eep-043-engineering-execution-plan.md)). So unlike Sprints 2–5's guides, this one can't say "click here, expect that." Every check below is a request against the running app using its existing API — reproducible by anyone with the dev server running and a terminal (or a tool like Postman), no code-reading required.

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

---

## 3. US-103 — Rate limiting on invite create + accept

**Check:** repeated rapid invitation attempts get throttled; a single legitimate one does not.

Run the create-invitation `curl` command from step 2 twenty-one times in a row (a quick shell loop: `for i in $(seq 1 21); do curl ...; done`, varying the email each time so it's not rejected as a duplicate).

**Expected:** the first 20 succeed (`201`); the 21st returns `429` with a `Retry-After` header and the message "Too many invitations sent. Please try again later."

A single invitation sent on its own, without the loop, always succeeds normally — the limit only engages under rapid repetition.

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

**Check B — everything else keeps working normally for a solo clinic:** repeat the exact same request against a clinic that still has only one doctor.

**Expected:** a `201` success — booking behavior for every existing solo clinic (the entire install base today) is completely unchanged.

---

## 5. US-501 — Organization plan field exists and defaults correctly

Open Prisma Studio, go to the `Organizations` table, and look at the `plan` column.

**Expected:** every existing organization reads `solo`. Nothing else about any organization row changed. This field does nothing yet — the Plan screen and seat enforcement that read it ship in Sprints 2 and 5.

---

## Sign-off

Sprint 1 is verified when all 5 sections above behave exactly as described. None of this sprint's changes are visible in the product's UI — that is expected and correct for a foundation sprint. The next thing you should be able to see and click is Sprint 2's Invite screen.
