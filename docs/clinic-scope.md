# Auriva `/clinic` — Scope Document (Solo Clinic Workspace)

**Purpose:** the locked design + current functionality for the all-in-one solo clinic workspace, for design/functionality review. Visual companion: **`docs/clinic-flow-review.html`** (open in a browser).

**Principle:** a solo clinic is one person who does everything from `/clinic`. Every screen answers one question; every screen offers one obvious next action. `/doctor`, `/staff`, `/admin` are dormant until the multi-clinic module is designed.

---

## 1. Access & identity
- Owner = a `super_admin` User (caps `reception` + `doctor_workspace` + `admin_portal`), created by `/start` Quick Setup → lands on `/clinic`.
- Sign in: `POST /api/auth/login` with `phone` (or `email`) + `password`.
- A plain `doctor` role cannot access `/clinic` (multi-clinic, out of scope).

## 2. Navigation (6 tabs — sidebar on desktop, bottom bar on mobile)

| Tab | Question | What it does |
|---|---|---|
| **My Clinic** | Am I ready? | Clinic-Ready % ring + guided checklist (first treatment, first patient, first payment, share page, complete profile); flips to a patient goal at 100%; live booking-page link (copy / WhatsApp / preview). |
| **Today** | What do I do next? | Next-patient hero + Start consultation; day summary (seen/remaining/follow-ups/₹ collected/outstanding); **Today · Upcoming · All** filter; **Book a patient** dialog; completed visits show *Payment due* → *Seen · Paid*. |
| **Calendar** | When am I free? | Day / Week / Month of appointments + time blocks; status-coloured dots; **Block time** quick action. |
| **Treatments** | What do I offer? | Services (name, duration, price, active) — drives the visit fee/invoice. |
| **Payments** | What have I collected? | Today’s recorded payments + totals. Records money received (Auriva doesn’t process money). |
| **Settings** | How do I run my clinic? | **Practice Setup** (§4), online-bookings toggle, **Availability** (§5), **Time-off/Holidays**, grow-to-multi-clinic path. |

## 3. Consultation journey (the defining loop)
`Today → Start consultation → full-screen workbench → Review & complete → Payment`

**Booking lifecycle:** `Booked (scheduled)` → `In consultation` → `Consultation completed` → `Payment pending` → `Paid` → `Visit completed`. Today refreshes on completion so a seen patient never lingers as scheduled.

**Workbench — left clinical rail (real data, no fake vitals):** Vitals (live capture, folded into the note), Allergies + conditions, Current medicines, Past visits.

**Workbench — main column:** Templates bar (P6) · Chief complaint · Examination & notes · Diagnosis (chips) · Prescription builder (medicine/dosage/frequency/duration + templates) · Investigations = Diagnostics selector (P5) · Follow-up & advice · Treatment & fee. → **Signed printable visit summary** → **Payment** (cash/UPI/card).

Everything captured surfaces on the patient portal timeline + Health Vault.

## 4. Practice Setup (Settings → Profile) — **LIVE**
Media via a **StorageService abstraction** (local disk today, swappable to S3/R2/Azure with no UI change; the app only holds opaque URLs — `POST /api/clinic/uploads`, `GET /api/files/[key]`).
- **Doctor:** photo, name, specialty, qualifications/education, years experience, languages, registration no., consultation fee, follow-up fee, bio.
- **Clinic:** logo, cover, name, about, address, public phone, reception contact, email, website.
- **Working & media:** working days, open/close, facilities, photo gallery, documents/certificates, social links.

## 5. Availability & calendar — **LIVE**
- Settings → Availability: working days, hours, break times, slot duration, buffer, max patients/day; Time-off/Holidays.
- Doctor Calendar: Day/Week/Month + quick Block time.
- **Patient booking consumes availability** — `getBookableSlots` honours breaks, time-blocks, per-day cap, slot length + buffer.

## 6. Diagnostics (P5, replaces removed Labs) — **LIVE, recommendation only**
Auriva does not run labs. Consult “Investigations” = structured selector (acronym search; categories Pathology/Biochemistry/Endocrinology/Microbiology/Radiology/Cardiology; packages Fever/Metabolic/Antenatal/Thyroid; prep notes). Selected tests → patient **Health Vault** (Records → Tests): prep instructions + status (Pending → Booked → Completed → Report uploaded) + report upload.

## 7. Clinical templates (P6) — **LIVE**
Reusable SOAP notes (Subjective→complaint, Objective→exam, Assessment→diagnosis, Plan/Advice/Exercises→advice, Follow-up days, favourite). Consult Templates bar: quick-apply, save-current, manage (edit/favourite/delete). Apply fills empty fields, appends to non-empty. Stored per doctor within the clinic (share-across-clinic = future flag).

## 8. Backend contracts (clinic-scoped, reception-capable)
`overview` · `today?scope=` · `book` · `booking-status` · `booking-shared` · `consultation` (GET context, POST start/complete) · `payment` · `payments` · `schedule?start=&days=` · `profile` (GET/PATCH) · `uploads` · `templates` (+ `/[id]`) — all under `/api/clinic/*`. Availability under `/api/doctors/[id]/{availability,time-blocks,slots}`. Patient vault under `/api/patient/{recommendations,uploads}`. Media under `/api/files/[key]`.

## 9. Scope status

| Capability | Status |
|---|---|
| Consultation + booking lifecycle | ✅ Locked |
| Today · in-clinic booking · schedule filter | ✅ Locked |
| Calendar + availability + time-off | ✅ Locked |
| Practice Setup + StorageService | ✅ Locked |
| Diagnostics recommend-tests + Health Vault | ✅ Locked |
| Clinical templates (SOAP) | ✅ Locked |
| Multi-service billing (invoice line items) | ⏸ **Deferred** (single treatment fee today) |
| Multi-clinic / hospital / front-desk / command-centre | ⛔ Out of scope |
| Lab management / insurance / enterprise | ⛔ Out of scope |

**Quality bar:** whole-project TypeScript clean · full test suite **385/385** · every screen browser-verified at 390px + 1280px (no overflow, no console errors).

## 10. Review it live
- **Solo clinic:** `http://localhost:3000/login` → `+15550300123` / `password123` → `/clinic` (seeded with today + upcoming appointments).
- **Patient (other side):** `http://localhost:3000/login?as=patient` → `+15550199999` (OTP shown on screen) → Records → Tests.
