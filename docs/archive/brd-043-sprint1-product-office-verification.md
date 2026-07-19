# Sprint 1 — Product Office Verification Guide

Companion to the [Sprint 1 Completion Report](./brd-043-sprint1-completion-report.md). This is the browser/UI-only version, written for a non-technical Product Office reviewer. For the technical version (curl, Prisma Studio, SQL), see the [Engineering Verification Guide](./brd-043-sprint1-engineering-verification.md).

> **Sprint 1 is invisible infrastructure — it deliberately ships no new screens.** Most of it is verified by the automated test suite (403/403 passing) and by the Engineering Verification guide. This guide covers the one behavior a non-technical reviewer can see in the browser, and explains in plain words what the rest does.

---

## The one thing you can see: US-104, doctor safety on booking

**What it does:** before this sprint, if a clinic ever ended up with two or more doctors, the booking screen could silently assign a patient to the wrong doctor without telling anyone. Now, if that ambiguous situation exists, the system safely refuses and shows an error instead of guessing.

**How to check it, if a multi-doctor clinic is available in your seeded data:** open the `/clinic` workspace for that clinic and try to book a new patient the normal way. You should see an error asking to specify a doctor, rather than the booking silently going through.

This is framed conditionally because there is no invite UI yet (that ships in Sprint 2) to create a multi-doctor clinic through the browser alone — so whether you can exercise this check today depends on whether one already exists in your seed data.

**For every normal, single-doctor clinic (the entire install base today):** booking works exactly as it did before. Try the everyday booking flow on any ordinary clinic — you should see no difference at all. That "no difference" is itself the confirmation that this fix didn't disturb the existing flow.

---

## The other four stories: no browser surface yet

These four stories are schema/platform changes with no screen to click through this sprint. Each is verified via the automated test suite and the Engineering Verification guide, not the browser.

**US-101 — Membership status.** Every staff member now has a status field (defaulting to "active") behind the scenes, laying the groundwork for the suspend/archive lifecycle Sprint 2+ will surface on screen.

**US-102 — Invitation expiry.** Invitations now automatically expire 72 hours after being sent, and the server enforces that even if someone tries to use an old link.

> One legitimate browser check does exist here: the invite-accept page at `/join/[token]` is already real. If you visit an *already-expired* invite link, the page shows an "expired" error. (Creating that expired link in the first place still requires the Engineering Verification guide, since there's no Sprint-1 UI to send an invite yet.)

**US-103 — Rate limiting.** Sending invitations or accepting them too many times, too quickly, is now automatically throttled to prevent abuse.

**US-501 — Organization plan field.** Every organization now has a "plan" field (defaulting to "solo") behind the scenes, laying the groundwork for the Plan/Upgrade screens Sprints 2 and 5 will build.

---

## Sign-off

If the booking-safety check above behaves as described (safe refusal when ambiguous, unchanged for every normal clinic), and you're comfortable relying on the automated 403/403 passing test suite plus the Engineering Verification guide for the other four stories, Sprint 1 is verified from a Product Office perspective.

For deeper/technical verification, see [docs/brd-043-sprint1-engineering-verification.md](./brd-043-sprint1-engineering-verification.md).
