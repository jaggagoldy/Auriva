# Document 5 — Search & Filtering Audit

**Type:** Current-state inventory of **every** search and filter surface. **No proposed solutions — documentation only.**
**Verified against:** the search/filter components across `src/components/{staff,doctor,patient,admin}` and the relevant API routes.

Legend for backend: **Server** = filtering happens via API query params · **Client** = filtering happens in the browser over an already-fetched list.

---

## 1. Master table

| # | Module | Search fields | Filters | Sorting | Backend | Key UI limitation |
|---|---|---|---|---|---|---|
| 1 | **Reception board** (`/staff/queue`) | name, blood group | Doctor (all/one) | priority within Waiting lane | Search+doctor = **Server** (`?search=`, `?doctor_id=`); lane grouping = Client | Search is name/blood-group only, **today-only**; no phone/health-id |
| 2 | **Reception Desk** (`/staff/billing`) | — (no text search) | Today · Open · Paid · All | created_at desc | Today/Paid = **Server** (`?today`, `?status=paid`); Open = Client | No patient/invoice-number search box |
| 3 | **Reception Lab** (`/staff/lab`) | — | Ordered · Resulted · All | — | **Server** (`?status=`) | No patient/test search |
| 4 | **Reception Calendar** (`/staff/calendar`) | — | (implicit: selected day) | slot time | Client (per-doctor fetch, same-day filter) | Day-only; no search; fixed 09:00–20:00 |
| 5 | **Walk-in modal** | phone, name, dob | — | — | **Server** identity resolution (`/api/patients`) | Requires ≥1 of phone/name; family disambiguation weak |
| 6 | **Book dialog** (reception) | phone, name | — | — | **Server** (`/api/patients`) | phone/name only (no dob here) |
| 7 | **Reception dashboard** (orphaned `/staff/dashboard`) | name or phone | — | — | Redirects to board `?search=` | Unlinked from nav |
| 8 | **Doctor Today** waiting list | — | (waiting statuses) | scheduled_time | Client | No search/filter on the landing |
| 9 | **Doctor Workbench** queue sidebar | name, blood group | Today · All (scope) | scheduled_time | Client (over `?doctor_id=` fetch) | Name/blood-group only |
| 10 | **Doctor Patients** (`/doctor/patients`) | name only | — | (list order) | Client | UI states: *"Advanced patient filters … future release"* |
| 11 | **Doctor Schedule** | — | Day · Week · Month | date | Server (`/api/clinic/schedule?start=&days=`) | No search; availability view |
| 12 | **Patient Book** (doctor discovery) | name, specialty, clinic | — | (list order) | Client over `/api/doctors` | No server search; no specialty/location/availability filter |
| 13 | **Patient Records** | — (no text search) | Tabs: Timeline · Rx · Bills · Tests | timeline: newest first | Client (tab switch) | No search within records |
| 14 | **Patient Family** | — | — | — | — | List only |
| 15 | **Staff patient timeline** (`patient-timeline.tsx`) | — | kind: All · (appointment/…)  | chronological | Client | Filter by entry kind only |
| 16 | **Admin Command Palette** (⌘K) | patients / jump-to | — | relevance (cmdk) | **Server** patient lookup | Admin surface only; not on reception/doctor |
| 17 | **Admin Team** (`staff-table.tsx`) | — | (role badges shown, not filtered) | roster order | — | No search/filter on the team list |

---

## 2. Backend search capabilities that exist

| Endpoint | Query params | Notes |
|---|---|---|
| `GET /api/patients` | `phone`, `health_id`, `name`, `dob` | **Identity resolution** — the richest search backend; requires ≥1 of phone/health_id/name; returns matching Healthcare Profiles |
| `GET /api/reception/queue` | `doctor_id`, `search` | Today's queue; `search` matches name |
| `GET /api/appointments` | `patient_id`, `doctor_id`, `clinic_id` | Scoped list; **no** text/date-range search params |
| `GET /api/billing/invoices` | `today`, `status` | Status/day filter only |
| `GET /api/lab-orders` | `patient_id`, `doctor_id`, `status` | — |
| `GET /api/clinic/schedule` | `start`, `days` | Date-window read model |
| `GET /api/doctors` | (directory) | Returns the cross-org doctor list; **no server-side name/specialty search param** |
| `GET /api/patients/[id]/timeline` | — | Full timeline for one patient |

---

## 3. Sorting — current state

- **Queues / appointments:** sorted by `scheduled_time` (and `priority` within the Waiting lane). Sorting is **not user-adjustable** anywhere.
- **Invoices:** `created_at` desc (service default).
- **Everything else:** natural list order; **no column-sort, no sort controls** exposed in any list.

---

## 4. Current gaps (documented, not solved)

| Gap | Where it bites |
|---|---|
| **No global patient search** on reception/doctor surfaces | Finding a returning patient's full record requires the Book/Walk-in identity flow or the admin ⌘K palette |
| **Search is name-centric and client-side** | Board/sidebar/patients/doctor-discovery all filter a pre-fetched list by name; no phone/health-id/specialty/location search |
| **No date-range / historical search** on appointments | `GET /api/appointments` has no date-range param; board is today-only |
| **No server-side doctor search** | Patient doctor discovery filters the whole `/api/doctors` list in the browser (won't scale) |
| **No search on Records** | Patient records are tab-filtered only |
| **No sort controls** anywhere | Order is fixed by the backend/default |
| **No pagination** (TD-10) | Any search/filter returns the full list; degrades with data volume |
| **No advanced/faceted filters** | Doctor Patients explicitly says advanced filters are a future release; no favourites/high-risk/follow-up-due facets (deferred) |
| **Billing/Lab lack text search** | Filter tabs only; no patient/invoice-number/test lookup |
| **Team list has no search/filter** | Roster is a flat list |

---

## 5. Existing backend support vs UI exposure (the mismatch)

| Capability the backend *has* | Is it surfaced in the UI? |
|---|---|
| Identity resolution by **health_id** | ❌ No UI uses the health_id field (only phone/name/dob in modals) |
| Identity resolution by **dob** | ✅ Walk-in only (not book, not board) |
| Queue `search` param | ✅ Board (name only) |
| Invoice `status` filter | ✅ Desk tabs |
| Lab `status` filter | ✅ Worklist tabs |
| Appointment `patient_id`/`doctor_id` scoping | ✅ (used for lists, not as user-facing filters) |
| Schedule date-window | ✅ Doctor schedule; ✅ reception calendar (client) |

**Headline:** the **identity-resolution backend is richer than any single UI exposes** (health_id search exists but is never surfaced), while **most list UIs do client-side name-only filtering** with no server search, no sorting, and no pagination.

---

*End of the five audit documents. Per the Product Office instruction, no solutions are proposed here — these findings are the input to the Phase 1 Product Polish roadmap.*
