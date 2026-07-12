# Auriva — Phase 2 Handoff (continue the solo-clinic + patient work)

You are picking up an in-progress build. Everything below is self-contained — read it fully before writing code. The authoritative design source is the approved HTML mockups in **`design/mockups/`** (open them in a browser: `auriva-user.html` = patient app, `auriva-clinical.html` = consultation, `auriva-site.html` = marketing, etc.). Live scoreboard: [`docs/implementation-status.md`](./implementation-status.md).

---

## 0. FIRST — sync my work into your branch

My work is on `claude-code-work` (pushed to `origin`). Your branch `claude-web-work` was still at the shared checkpoint with **no commits of its own**, so syncing is a clean fast-forward. In your worktree (`/Users/goldy/Desktop/Auriva-web`):

```bash
git fetch origin
# You have no unique commits, so take my line wholesale:
git reset --hard origin/claude-code-work
# (If you DID make commits you want to keep, use: git rebase origin/claude-code-work instead.)
npm install         # lockfile may have moved
npx prisma generate # schema is unchanged, but regenerate to be safe
```

Then verify the dev DB + server (see §5) and you're ready.

**Parallel-work rule:** keep working in your own worktree. Commit small, coherent slices and **push each** (`git push origin claude-web-work`) so nothing is lost if a session drops. Do NOT rebase/force-push `claude-code-work`.

---

## 1. What is already DONE (do not rebuild)

**Patient app** — rebuilt mobile-first to `design/mockups/auriva-user.html`: centered phone shell + bottom nav **Home · Book · Records · Family · You** (`src/components/patient/patient-shell.tsx`, `src/app/patient/*`). One UX (phone centered on desktop, no separate desktop layout). Superseded routes redirect (find-care/doctors→book, profile→you, care→home). UI-only; all auth/session/API preserved.

**Solo clinic `/clinic`** (`src/app/clinic/page.tsx`):
- Today has a **Today · Upcoming · All** filter + in-clinic **Book a patient** dialog (`/api/clinic/book`, reuses `bookPublicAppointment` with `viaStaff`). Warm honey/pine UI. `<main>` has `min-w-0` (mobile overflow fixed).
- **Consultation workbench** (`src/components/clinic/consultation-workbench.tsx`) rebuilt to `auriva-clinical.html`: **full-width** + **left clinical rail** (Vitals live-capture, Allergies, Current medicines, Past visits) via `GET /api/clinic/consultation?appointment_id=` (`getConsultationContext`). Treatment & fee in the main column.
- **Booking lifecycle fixed**: Today remounts after a visit completes; completed visits show **"Payment due"** → **"Seen · Paid"** (invoice status on the today query). Flow verified: `scheduled → in_consultation → completed → paid`.
- **Lab worklist REMOVED** (clinics don't manage labs) — nav item, LabView, `/api/clinic/lab` all deleted.

---

## 2. THE MANDATE — remaining work, in strict priority order

Product Owner's Phase 2 corrections. Do them in order. **After finishing all: self-review, run builds + tests, verify every workflow end-to-end, then continue — do not wait for cosmetic approval.**

### P2 — Doctor Calendar & Availability
- **Doctor Settings** (in `/clinic` Settings): Working Days, Working Hours, **Break Times**, **Holidays**, **Slot Duration**, **Buffer Time**, **Maximum Patients**. (`DoctorAvailability` already exists — `configureQuickSetup` sets basic hours; extend it.)
- **Doctor Calendar**: Day / Week / Month views showing available / booked / blocked slots, leave, and **quick slot blocking**.
- **Patient booking must consume this calendar** (the patient Book flow + `/api/doctors/[id]/slots` should reflect breaks/holidays/slot-duration/max).

### P3 — Clinic Setup Completion (in `/clinic` Settings / Profile)
Doctor profile photo, clinic logo, clinic cover image, clinic gallery, clinic description, education, experience, registration number, specialities, languages, consultation fees, address, working hours, emergency contact, social links, reception contact. (Some fields exist on `StaffProfile`/`Clinic` — check the schema before adding columns; image upload may need a storage decision — raise it if so.)

### P4 — Multi-service Billing — **DEFERRED** (do NOT build yet)
Future: an invoice with multiple line items (consultation, treatment, injection, procedure, physio, x-ray, medicine, consumables, discount, tax, other) before payment. `setDraftInvoiceItems` already accepts an item array — the groundwork is there.

### P5 — Diagnostics (REPLACE the removed Labs) — recommendation only
Doctors only **recommend** tests. In the consultation, "Add Investigation" opens a **structured selector**:
- **Search** (CBC / MRI / USG / ECG / acronyms → full names).
- **Categories**: Pathology, Radiology, Cardiology, Microbiology, Biochemistry, Endocrinology.
- **Packages**: Fever Panel, Metabolic Panel, Antenatal Panel, etc.
- Selected tests → the patient's **Health Vault**: recommended tests + **preparation instructions** (e.g. fasting, full bladder, no metal) + **status** (Pending → Booked → Completed → Report Uploaded).
- This is a recommendation workflow, **NOT** lab management. A rich embeddable catalog + the exact UX spec is in the conversation the user will paste, and mirrored in `auriva-clinical.html`'s investigations section. The current `investigations[]` free-text field on the consult and its `LabOrder` records are the seam to replace/repurpose (patient side already lists them under Records → Reports).

### P6 — Clinical Templates
Reusable note templates (Physio Initial Assessment, Follow-up, Dental Cleaning, Root Canal, Diabetes Review, HTN Follow-up, Back/Neck Pain…). Insert **SOAP** (Subjective / Objective / Assessment / Plan) + Advice + Exercises + Follow-up into the consult. Doctor can **create / edit / delete / favourite**; share-across-clinic is future-ready (design the schema for it, don't build sharing UI).

---

## 3. SCOPE FREEZE — do NOT build
Multi-clinic, hospital workflows, laboratory management, insurance, enterprise modules, front-desk (`/staff/*`), command-center (`/admin/*`). These land only when the multi-clinic module's full UX is designed. The solo owner is a **`super_admin`** who does everything from **`/clinic`**; `/doctor` and `/staff` are dormant/future.

---

## 4. Conventions (match these)
- **Architecture (non-negotiable):** preserve the layered structure (`domain` / `services` / `repositories` / `api` / `app`); centralize auth in `src/domain/authorization.ts`; **no invented business rules; no fake/placeholder UI** — show real data or an honest empty state.
- **Design tokens** (`src/app/globals.css`) — never hardcode palette hex except the brand darks `#0B4A41` / `#083F37` and honey text `#4A3413`. Use `bg-honey / text-honey-deep / bg-honey-soft`, `bg-primary`(pine), `bg-accent`(pine tint), `bg-secondary`(sand), `text-muted-foreground`, `font-heading`. Warm "paper/pine/honey/ink" system.
- **Base UI Button** links: `<Button nativeButton={false} render={<Link href="…" />}>`.
- **Verify EVERY change in real headless Chrome** (`playwright-core`, `channel:'chrome'`): (a) 0 console/page errors, (b) intended content renders, (c) **no horizontal overflow at 390px and 1280px**. `curl` only sees SSR and lies. Run from inside the repo dir (scratchpad can't resolve `node_modules`). Also `npx tsc --noEmit` + `npx eslint <files>` clean, and `npx vitest run <touched service tests>`.
- **React strictness:** the `react-hooks/purity` + `set-state-in-effect` rules are enforced — no `Date.now()`/`new Date()` in render or `useMemo` (compute in effects/handlers/`.then` callbacks); don't call a setState synchronously in an effect body (use `.then(setX)` chains or derive from state).
- **Backend field names:** OTP `POST /api/auth/otp/{send,verify}` → `phone_number` (+`code`, optional `healthcare_profile_id`, dev-echoes `otp`). Provider login `POST /api/auth/login` → `email` OR `phone` + `password`. Solo onboarding `POST /api/onboarding/quick-setup` `{owner_name, mobile, password, code}`; `PATCH` names clinic + hours. In-clinic booking `POST /api/clinic/book` `{patient_name, patient_phone, scheduled_time, notes}`.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## 5. Local dev / test credentials (verified)
- Postgres 16, DB `auriva_dev`, seeded. `DATABASE_URL=postgresql://goldy@localhost:5432/auriva_dev`. Dev server on **:3000** (`npm run dev`).
- **Solo clinic (→ `/clinic`):** `+15550300123` / `password123` — "Test Solo Clinic" (super_admin), seeded with today + upcoming appointments. Other solo owners exist but seed data varies; prefer this one.
- **Patient (mobile app):** `+15550199999` (Alex Rivera, has appointments + 2 family) — OTP is shown on screen in dev.
- **Routing note:** solo owner = `super_admin` → `/clinic`. A plain `doctor` role → `/doctor` (multi-clinic, out of scope) and can't access `/clinic`. Don't use seeded `doctor` accounts (e.g. `+15550200001`) as solo creds.

---

## 6. Start here
1. Sync (§0). 2. Read `design/mockups/auriva-clinical.html` (target for the consult) and `docs/implementation-status.md`. 3. Begin **P2** (Doctor Calendar & Availability). 4. Commit + push each slice; update `docs/implementation-status.md` as you land screens.
