# Milestone 3B · Checkpoint B1b — /doctor Consultation Parity — Completion Report

**Directive (PO):** bring the `/doctor` consultation surface to **feature parity** with `/clinic` for Doctor Service Capture. *"Same functionality. No new features. Just parity. Nothing more. No enhancements. No redesign."*
**Result:** ✅ **PASS** — both consultation surfaces now capture clinical services identically, by construction (one shared component). Zero new features; all six roadmap items held as backlog.

---

## 1. Approach — parity by construction, not by copy

Rather than duplicate the capture UI into `/doctor` (which would risk the very drift the PO flagged — "one doctor sees Services, the other doesn't"), the B1 capture was **extracted into one shared component** and mounted on both surfaces. They cannot diverge because they are the same code.

| File | Change |
|---|---|
| `src/components/shared/service-capture.tsx` (new) | The shared capture: `useServiceCapture(appointmentId)` hook (opens capture, loads catalog, add/qty/remove) + `ServicesCaptureView` presentational body (list, inline picker, total) + `ServiceRow` + `CategoryPicker`. Self-contained. |
| `src/components/clinic/consultation-workbench.tsx` | Refactored to use the shared hook/view — **behavior-preserving** (removed the local copies; review-dialog total now `capture.total`). Dropped the now-redundant `services` prop (the hook self-fetches the catalog). |
| `src/app/clinic/page.tsx` | Stopped passing `services` + removed its dead fetch (the workbench self-serves now). |
| `src/components/doctor/consult-workbench.tsx` | **Added the Services section** (shared component) between Lab Orders and Prescription, in the doctor-surface section chrome. Rendered when `status === "in_consultation"` — matching when `/clinic` mounts capture. |

**No backend change.** The capture API, `service-capture-service`, and the settlement wiring are already surface-agnostic. `/doctor` completion (`PATCH /api/appointments/[id]` → `transitionStatus("completed")` → `completeVisitInvoicing`) already settles seeded events — verified in code.

---

## 2. Parity confirmed

| Capability | /clinic | /doctor |
|---|---|---|
| Base Consultation seeded on open | ✅ | ✅ (same hook) |
| Add catalog clinical service | ✅ | ✅ |
| Add ad-hoc (Custom, flagged) | ✅ | ✅ |
| Quantity stepper (draft-only) | ✅ | ✅ |
| Remove line | ✅ | ✅ |
| Running total | ✅ | ✅ |
| Permission-by-kind (financial rejected) | ✅ | ✅ (same API) |
| Complete Visit → settle events | ✅ | ✅ (`transitionStatus` hook) |
| Empty / loading / saving / error states | ✅ | ✅ (same component) |
| Keyboard a11y (aria-labels, Enter-to-add) | ✅ | ✅ |
| Light + dark | ✅ | ✅ |

The only intentional difference is the **section chrome** (each surface keeps its own heading/card style); the capture **body and behavior are identical**.

---

## 3. Verification

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ clean |
| ESLint (new + changed) | ✅ **0 new**. `service-capture.tsx` clean; the one `set-state-in-effect` in `consult-workbench.tsx` is the **pre-existing** `LabOrdersSection.load()` baseline (line ~500, TD-15) — untouched by B1b (change freeze) |
| Test suite | ✅ **580/580** (unchanged — capture logic already covered by `service-capture-service.test.ts`; this checkpoint is presentation wiring on both surfaces) |
| `next build` | ✅ clean |
| Demo reseed | ✅ |

---

## 4. Browser QA — both surfaces (capture ⓢ)

**Login:** `/login` → phone + `password123`.

**A) /clinic (solo):** `9876500001` → **/clinic** → Today → checked-in patient → **Start consultation** → scroll to **Services**. Expect the seeded **Consultation** line + add/qty/remove/total. ⓢ

**B) /doctor (multi-clinic):** a doctor, e.g. `9876500003` → **/doctor** → pick a patient from the queue → **Start Consultation** (status → in consultation) → the **Services** section appears between Lab Orders and Prescription. Expect the **same** seeded Consultation line + add/qty/remove/total, then **sign & complete** in the Prescription editor → the invoice reflects the captured services. ⓢ

**Parity check:** the Services block looks and behaves the same on both; only the surrounding section header differs.

---

## 5. Decision Log
- **Shared component, not duplication** — the only way to guarantee lasting parity; refactoring `/clinic` onto it is behavior-preserving.
- **Catalog self-fetch in the hook** — both surfaces stay plumbing-free; removed the `/clinic` `services` prop and its dead fetch.
- **`/doctor` shows Services only in `in_consultation`** — matches `/clinic`'s capture lifecycle; avoids seeding a Consultation charge before the visit starts.
- **Pre-existing `LabOrdersSection` lint left as-is** — unrelated to B1b; change freeze.

## 6. Roadmap backlog (PO-noted, NOT in B1/B1b — reserved for future checkpoints)
1. **Service execution status** (Recommended / Planned Today / Completed Today) — reserve a nullable field on `ServiceEvent` when a checkpoint next touches that schema; ties into the Treatment Recommendation module.
2. **Treatment Recommendation module.**
3. **Admin suggestion for frequent custom services** ("used 14× — add to catalog?").
4. **Service-level clinical notes** (a note attached to a performed service).
5. **Rename "To Collect" → "Estimated Charges"** in the doctor's view (terminology).
6. **Expand service categories** (Imaging, Vaccination, Minor Surgery, Package).
7. **Retire the legacy consultation-fee path** once all entry points use ServiceEvents (post-parity cleanup milestone).

## 7. Verdict & next step
**B1b is complete** — the `/doctor` and `/clinic` consultation surfaces now capture services identically, satisfying the mandatory pre-B2 directive with no scope creep. Both surfaces settle through the M3A engine on Complete Visit. **Stopping for Product Office confirmation.** With approval, **B2 (Checkout Workspace)** begins.
