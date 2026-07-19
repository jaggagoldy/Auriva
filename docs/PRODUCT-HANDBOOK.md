# Auriva — Product Handbook

**Status:** UXS-043 Packages 1–6 implemented against the frozen prototypes and reconciled through the Phase 1/2 consistency audit. This is the single governed reference for what Auriva is, how each surface behaves, the canonical demo world, the shared component vocabulary, and the rules any new screen must satisfy.

**Supersedes for day-to-day use:** the scattered per-package notes. **Anchored by:** `AGENTS.md` (vision & guardrails), `PRODUCT_BASELINE.md` (PKG-1→6 baseline), `docs/prototype/*` (the frozen prototypes), `docs/RELEASE-CANDIDATE.md` (deferred register).

---

## 1. What Auriva Is

A **Healthcare Operating System** — it helps healthcare organizations deliver better care while running efficient, profitable practices. It is **not** an HRMS, ERP, payroll, recruitment, or accounting system.

Every feature must strengthen at least one of the **six product pillars**: Clinical Excellence · Practice Operations · Financial Operations · Patient Engagement · Organization Intelligence · Platform Foundation. (Pillar 2 explicitly excludes payroll/attendance/performance reviews.)

**Two tones, by design:** staff surfaces say *"Let's work"* (efficient, **pine** primary, desktop rail); the patient surface says *"You're being taken care of"* (reassuring, **honey** primary, mobile-first). This contrast is the brand — see §7.

---

## 2. The Surfaces (PKG-1→6)

Each surface answers **one question** and maps to a frozen prototype in `docs/prototype/`.

| PKG | Surface | The one question | Route | Key screens (implemented) |
|---|---|---|---|---|
| **1** | Identity & Foundation | "Who am I, and where do I work?" | `/login`, `/workspace` | Two-panel login, workspace selector, the shared app shell + `WorkspaceSwitcher` chip |
| **2** | Owner Cockpit | "What is my practice doing?" | `/admin` | Command Center, **Team** (live per-doctor activity), Clinics/Plan (Soon), Settings |
| **3** | Doctor | "Who's next, and what do they need?" | `/doctor` | **Today** (daybar → quick actions → waiting list), **Workbench** (queue · consult · context; progress stepper; read-only Clinical Safety chips), Schedule, Patients, Practice, Profile |
| **4** | Reception | "What's the room doing?" | `/staff` | **Front desk** board (3 lanes: Waiting · In consultation · Done·to collect; wait-aging; doctor strip), doctor-column **Calendar**, **Desk** (cash cycle), Lab Orders |
| **5** | Patient | 5 questions → 5 tabs | `/patient` | **Home** (Today summary · Next visit · For you today), **Book**, **Records** (visit timeline), **Family**, **You** — one centered phone shell everywhere |
| **6** | Experience Resilience | "How does it behave when reality isn't perfect?" | *cross-cutting* | `EmptyState`, `ErrorState` (3 tiers), `PermissionState`, `SuccessState`, `LoadingState`, `OfflineBanner`, `Skeleton`; reduced-motion honoured platform-wide |

**Patient's five questions → five tabs:** *What do I do today?* → Home · *Can I book?* → Book · *What happened at my visit?* → Records · *Who in my family needs care?* → Family · *Who am I?* → You.

---

## 3. Canonical Demo World + Credentials

One org, one world — the demo seed (`prisma/seed-demo-india.ts`). Reseed with `npx tsx prisma/seed-demo-india.ts`. Staff sign in at `/login` with **phone + `password123`** (enter the 10-digit number; `+91` is assumed). Patients sign in with **phone + OTP** (dev echo).

**Organization:** Sunrise Health Network · Sunrise Clinic — Koregaon Park, Pune · Professional plan.

**Staff**

| Person | Role | Phone | Lands on |
|---|---|---|---|
| Rajesh Sharma | Owner | 9876500001 | `/admin` |
| Priya Nair | Practice Manager | 9876500002 | `/admin` |
| Dr Ananya Iyer | Doctor · Cardiologist | 9876500003 | `/doctor` |
| Dr Vikram Reddy | Doctor · General Physician | 9876500004 | `/doctor` |
| Dr Arjun Deshmukh | Doctor · Dermatologist | 9876500008 | `/doctor` |
| Dr Meera Krishnan | Doctor · Pediatrician | 9876500009 | `/doctor` |
| Dr Sanjay Rao | Doctor · Orthopedician | 9876500010 | `/doctor` |
| Dr Neha Kapoor | Doctor · Gynecologist | 9876500011 | `/doctor` |
| Sunita Deshpande | Receptionist | 9876500005 | `/staff` |
| Anjali Verma | Receptionist | 9876500012 | `/staff` |
| Rahul Sharma | Receptionist | 9876500013 | `/staff` |
| Kavita Joshi | Nurse | 9876500006 | `/doctor` |
| Ramesh Gupta | Technician | 9876500007 | `/staff` |

**Patients** (phone + OTP → `/patient`): Amit Patel `…0101` (allergy + chronic + past visit w/ prescription — the fullest demo), Sneha Kulkarni `…0102`, Mohammed Farooq `…0103`, Lakshmi Menon `…0104`, plus Rohan/Priya/Aarav/Deepa/Kiran on the live board.

**Naming-collision rule:** no two *different* people share a first name in one walkthrough.

> Note: the prototype's Deliverable-A casting (Sunrise Health *Group*, Bengaluru, Dr Anjali Rao …) is the design-reference naming; the **implemented** demo world is the table above and is the source of truth for demos.

---

## 4. Global Product Glossary (three layers)

One entity, three vocabularies — kept explicitly separate. Engineering builds against the **domain model**; the UI shows the **display language**; component/prop names come from §5.

| Internal domain model | Display language (per surface) | Notes |
|---|---|---|
| `Appointment` | Patient: **visit** · Reception: **appointment** · Doctor: **consultation** | Same DB row; three human words by design |
| `StaffProfile` (= membership) | **team member**, **membership** | One person may hold several (multi-clinic) |
| `Organization` | **practice** / **health group** | owner-facing |
| `Clinic` | **clinic** / **location** / **branch** | |
| Reception surface | **Front desk** (nav) / Reception Workspace (spec) | one surface; "Front desk" is the in-product label |
| `super_admin` role | **Owner** | display label only |
| `Invoice` + `Payment` | **bill** (patient) · **collect** / **Desk** (reception) | |
| `PatientProfile` | **records** / **health vault** (patient) · **patient** (staff) | |

---

## 5. Shared UI Behaviour Standard (component vocabulary)

One canonical name → one implementation → one QA term. Build each **once**; reuse everywhere.

| Component | Where it lives | Behaviour |
|---|---|---|
| `WorkspaceSwitcher` chip | doctor-shell, staff-shell, admin/workspace | `[mark] Clinic · Role ▾` on **every** staff surface; single membership = static label |
| `EmptyState` | `components/ui/states.tsx` | reason + one next action; **empty ≠ error** |
| `ErrorState` (3 tiers) | `components/ui/states.tsx` | icon + plain cause + recovery — recoverable (Retry) · action (Try again) · critical (Contact support) |
| `PermissionState` | `components/ui/states.tsx` | explain in plain language + a path; never a 403 wall |
| `SuccessState` | `components/ui/states.tsx` | full-moment confirmation (booking/checkout); toasts cover the small wins |
| `LoadingState` / `Skeleton` | `components/ui/states.tsx`, `ui/skeleton.tsx` | skeletons match final layout; **never spinner-only** for content; reduced-motion aware |
| `OfflineBanner` | `components/ui/offline-banner.tsx` (mounted in root layout) | non-blocking; "sync automatically when back online" |
| `Toast` | `sonner` | transient confirm, auto-dismiss ~2.5s |

**Notifications taxonomy:** Toast (transient) · Banner (persistent context) · Inline (field/section) · Modal (blocking/destructive).

---

## 6. Experience Behaviour Matrix (the contract)

Any new screen must satisfy the relevant row **before it ships**.

| Situation | Rule (all surfaces) |
|---|---|
| **Loading** | Skeletons that match the final layout — never spinner-only; perceived-instant < 400 ms |
| **Empty** | Always a reason + one next action; never "No data". Empty is often good news — say so warmly |
| **Offline** | Non-blocking banner + auto-sync; reads stay from last sync; never a blocking wall |
| **Error** | Icon + plain cause + recovery action; never a raw/technical message |
| **Permission** | Explain + offer a path; capabilities are **absent, not greyed**; never a 403 wall |
| **Slow network** | Micro-state feedback ("Saving…" → "Saved"); optimistic where reversible |
| **Destructive** | Modal + explicit consequence, separated from the primary action |
| **Success** | Confirmation + optional next action; toast for most, a full screen only for booking/checkout |
| **Long-running** | Show progress · run in background · notify on completion · never freeze the UI |

**Motion:** page ≈200ms · card hover ≈120ms · modal ≈180ms · toast ≈250ms · skeleton shimmer ≈1.2s. **`prefers-reduced-motion` → 0ms, instant** (enforced globally in `globals.css`).

**Accessibility baseline (WCAG 2.1 AA):** keyboard reachable; visible focus ring; touch targets ≥44px; icon-only buttons carry `aria-label`; status never by colour alone (always icon/label too).

---

## 7. Intentional Variances (documented rules — do not "fix")

| Variance | Rule |
|---|---|
| **Primary colour:** staff = **pine**, patient = **honey** | Efficiency vs warmth. Deliberate brand contrast — never unify. |
| **Navigation:** staff = left **rail**, patient = **bottom-tab** | Desktop-first operator vs mobile-first consumer. |
| **Role label:** UI says **"Owner"**, DB stores `super_admin` | Display label only. |

---

## 8. UX Traceability (starter)

| UX interaction | Component | Business rule / spec |
|---|---|---|
| Login → >1 membership → selector | `WorkspaceSwitcher` | APS-044 §9/§10 |
| Switch clinic → content re-scopes | `WorkspaceSwitcher` | APS-044 §13a isolation |
| Sign & complete → auto-advance | (status machine) | `appointment-status.ts` |
| Checkout collect → receipt | `Modal` + `Toast` | Invoice/Payment (billing) |
| Any list with no data | `EmptyState` | §6 Empty row |
| Any content load | `Skeleton` | §6 Loading row |
| Connection lost | `OfflineBanner` | §6 Offline row |

---

## 9. Governance — adding a screen

1. **Which PKG does it belong to?** Reference the frozen prototype before building.
2. **Reuse the vocabulary** in §5 — do not hand-roll empty/error/loading/permission blocks.
3. **Satisfy the §6 matrix** for every state the screen can be in.
4. **Use the display language** in §4; build against the domain model.
5. **Honour §7** — don't "correct" the intentional variances.
6. **New functionality (Category C)** — stop and get Product Office direction; log deferrals in `docs/RELEASE-CANDIDATE.md`.

**Deferred (Category C, documented):** medication-adherence tracking · insurance · AI "Suggested protocol" · capacity/room alerts · self-service password reset · online payments. See the deferred register for the full list.
