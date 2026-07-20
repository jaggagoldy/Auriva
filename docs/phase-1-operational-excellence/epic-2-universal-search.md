# Epic 2 — Universal Search

**Goal:** one consistent way to *find anything* across Reception, Doctor, Patient, and Admin — built on the search backend that **already exists** before anything new is proposed.
**Source audit:** [Doc 5](../product-office-audit/05-search-and-filtering-audit.md) (the whole document).
**Guardrail:** **leverage existing backend first.** The identity-resolution API is richer than any current UI.

> **Key existing asset:** `GET /api/patients?phone=&health_id=&name=&dob=` already resolves a patient by phone, **health ID**, name, or DOB. No UI uses `health_id`. The admin ⌘K command palette already does server-side patient lookup. Universal Search is mostly *surfacing* what's there.

---

## 2.1 — Global patient search on Reception & Doctor surfaces

- **Business problem:** There is **no way to find a returning patient's full record** from the reception board or doctor surface. Board search is name/blood-group only and **today-only**. Staff resort to the Book/Walk-in identity flow just to look someone up.
- **User story:** *As a receptionist (or doctor), I want to search any patient by name/phone/health-id and open their record, regardless of whether they're on today's board.*
- **Current workflow:** Board search filters today's queue by name; to find a past patient, open Walk-in/Book and run identity resolution, or use ⌘K on the admin surface only.
- **Proposed workflow:** A **persistent global search** (top bar / ⌘K) on reception and doctor surfaces that calls the existing `/api/patients` resolution and opens the patient's record/timeline. Reuse the admin command-palette pattern.
- **UX rationale:** One obvious "find a patient" entry point on every staff surface; matches the mental model "I need to look someone up."
- **Business impact:** High — removes a daily friction; enables balance-collection, history lookup, and re-booking without detours.
- **Engineering complexity:** **Medium** — reuse the palette component + existing API; add a result → patient-record route.
- **Dependencies:** `/api/patients` (exists), `/api/patients/[id]/timeline` (exists), the command-palette component (exists on admin).
- **Recommended priority:** **P0.**
- **Acceptance criteria:**
  - Reception and Doctor surfaces expose a global patient search (keyboard-accessible, e.g. ⌘K).
  - Search matches by name and phone (and health-id per 2.2), across all time (not just today).
  - A result opens the patient's record/timeline.
  - Tenant-scoped; no cross-clinic leakage.
  - Empty/loading/error states use the shared components.

---

## 2.2 — Surface health-id search (backend already supports it)

- **Business problem:** The backend resolves by `health_id` (`AUR-XXXXXX`), the stable, shareable patient key — but **no UI lets a user search by it.** Patients carry their health ID; staff can't use it.
- **User story:** *As a receptionist, I want to type a patient's Auriva Health ID to pull them up instantly and unambiguously.*
- **Current workflow:** Only phone/name/dob are exposed in modals; health-id search is unreachable.
- **Proposed workflow:** Accept `AUR-…` in the global search and the Walk-in/Book identity inputs; route it to the existing `health_id` param.
- **UX rationale:** Unambiguous lookup (no family-phone collisions); rewards the identity system already built.
- **Business impact:** Medium — faster, error-free identification, especially for shared-phone families.
- **Engineering complexity:** **Low** — wire an existing API param to the input; detect the `AUR-` pattern.
- **Dependencies:** 2.1 (or the existing modals); `/api/patients?health_id=`.
- **Recommended priority:** **P0.**
- **Acceptance criteria:**
  - Entering a valid `AUR-…` returns the exact profile.
  - Works in global search and the Walk-in/Book identity step.
  - Invalid IDs fall through to name/phone matching gracefully.

---

## 2.3 — One consistent search component across surfaces

- **Business problem:** Search is implemented differently everywhere (board search box, ⌘K palette, modal identity inputs, doctor patient search) — different placement, behaviour, and results.
- **User story:** *As any staff user, I want search to look and behave the same everywhere so I don't relearn it per screen.*
- **Current workflow:** 5+ bespoke search UIs (see Doc 5 master table), each client-side and name-centric.
- **Proposed workflow:** A single **`UniversalSearch`** pattern (one component, consistent trigger, result types: patients, and later doctors/invoices) adopted across Reception, Doctor, Admin.
- **UX rationale:** Consistency lowers cognitive load; one vocabulary for QA, docs, and PRS ([Deliverable C](../knowledge-base/00-README.md)).
- **Business impact:** Medium — compounding usability + lower maintenance.
- **Engineering complexity:** **Medium** — consolidate patterns; incremental adoption.
- **Dependencies:** 2.1/2.2; the shared component library.
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - One search component is used on ≥3 surfaces.
  - Consistent trigger (⌘K), result grouping, keyboard nav, and empty/loading states.
  - Result types are extensible (patients now; doctors/invoices later).

---

## 2.4 — Server-side doctor search

- **Business problem:** Patient doctor discovery filters the **entire `/api/doctors` list in the browser** (name+specialty+clinic). It works at demo scale but won't scale, and there's no specialty/location filter.
- **User story:** *As a patient, I want to search and filter doctors by name, specialty, and clinic and get fast, relevant results.*
- **Current workflow:** Fetch all doctors → client-side substring filter.
- **Proposed workflow:** Add a server search/filter to the doctor directory (query + specialty + clinic), returning paged results. *(This is the one place a new API param is justified — flagged per the "existing-first" rule.)*
- **UX rationale:** Fast, scalable discovery; the front door to booking.
- **Business impact:** Medium — booking conversion at scale.
- **Engineering complexity:** **Medium** — a search/filter param + pagination on `/api/doctors`.
- **Dependencies:** `/api/doctors` (needs a search param — new); overlaps Epic 3's filter model.
- **Recommended priority:** **P1.**
- **Acceptance criteria:**
  - Doctor search returns server-filtered results by name/specialty/clinic.
  - Paged; performant beyond a handful of doctors.
  - Consistent filter vocabulary with Epic 3.

---

## 2.5 — Search within a patient's own records

- **Business problem:** Patients navigate records by tabs (Timeline/Rx/Bills/Tests) with **no search** — finding an old visit/report means scrolling.
- **User story:** *As a patient, I want to search my records so I can find a specific visit, prescription, or bill quickly.*
- **Current workflow:** Tab filters only.
- **Proposed workflow:** A search box over the patient's already-loaded timeline/records (client-side to start).
- **UX rationale:** Reassurance + control over one's own history.
- **Business impact:** Low/Medium — retention/self-service; fewer "resend my report" calls.
- **Engineering complexity:** **Low** — client-side filter over loaded records.
- **Dependencies:** Records timeline data (exists).
- **Recommended priority:** **P2.**
- **Acceptance criteria:**
  - A search box filters records by visit/doctor/diagnosis/medicine text.
  - Works within the phone shell; reassuring empty state.

---

## Epic 2 summary

| ID | Improvement | Complexity | Priority | New API? |
|---|---|---|---|---|
| 2.1 | Global patient search | M | **P0** | No (reuse) |
| 2.2 | Health-id search | L | **P0** | No (reuse) |
| 2.3 | One search component | M | **P1** | No |
| 2.4 | Server-side doctor search | M | **P1** | Yes (justified) |
| 2.5 | Records search | L | **P2** | No |

**The principle honoured:** 4 of 5 items ship on the **existing backend** — only doctor search (2.4) needs a new param, and only because client-side won't scale.
