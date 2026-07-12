# Data Governance Guide

**Scope:** Release 1.1 Sprint 3 (DATA-1/2/3, INF-6). Extends Sprint 1 (security) and Sprint 2 (observability) — this document covers input validation, domain-rule ownership, conflict handling, integrity guarantees, and configuration requirements.

---

## 1. Validation Philosophy

Validation in this codebase happens at three distinct layers, and each has one job — this sprint's audit found the layers were already mostly correctly separated, and closed the gaps where they weren't:

1. **Shape/format validation** (`src/api/validation.ts`) — is the request well-formed at all? Required fields present, body is a real JSON object (not null/array/primitive), an enum-like field is one of its allowed values, a date string parses. This layer knows nothing about business rules or who's asking.
2. **Domain/business-rule validation** (`src/domain/*.ts` + each service) — is this specific operation legal given the entity's current state? Status-machine transitions (`canTransition`/`canTransitionInvoice`/`canTransitionLabOrder`/`canTransitionRelease`), duplicate-creation guards (Department/Clinic names, active-appointment conflicts), required-relationship checks (a department's clinic must belong to its organization).
3. **Ownership/authorization** (`src/api/session.ts`'s guard functions + each service's tenant-scoped queries) — may *this caller* do this to *this specific resource*? This is deliberately **not** part of `validation.ts` — it already has an established home (`requireStaffContext`/`requirePatientContext`/`requireAppointmentAccess`/`requireOrganizationContext`/`requirePlatformAdminContext`, plus services that scope every query by `clinic_id`/`organization_id`) — adding a parallel "ownership validator" to the validation layer would duplicate that mechanism rather than standardize it.

**Reusable helpers (`src/api/validation.ts`), added/clarified this sprint:**

| Helper | Use for |
|---|---|
| `hasRequiredFields(body, fields)` | Multiple fields that must all be truthy |
| `missingFields(body, fields)` | Same, but names which ones are missing (clearer message) |
| `isNonEmptyString(value)` | A single required string/identifier field |
| `isOneOf(value, allowed)` | A one-off enum-like field not already covered by a domain type guard |
| `isPlainObject(body)` | The request body itself, before reading any field off it — rejects `null`/arrays/primitives, which the old ad hoc `!body \|\| typeof body !== "object"` check let arrays silently through |
| `parseDateOrNull(value)` | A date string that may be absent |

For a field with an existing enum (appointment/invoice/lab-order/release status, payment method), use its dedicated `is<X>Status`/`isPaymentMethod` type guard in `src/domain/*.ts` instead of `isOneOf` — those already exist and are the source of truth for that entity's legal values.

**Not redesigned:** no request/response shape changed this sprint. Applying `isPlainObject` to the Release/Sprint admin routes (`/api/releases*`, `/api/sprints*`) changed *behavior* in exactly one way worth knowing: those 4 routes previously let an array body silently through (an array is `typeof "object"` and truthy) and would then fail confusingly reading `body.version` etc. as `undefined`; they now correctly reject it with a clear 400.

---

## 2. Domain Rule Ownership

Each entity's business rules live in exactly one service, enforced through exactly one function — verified this sprint, not rebuilt:

| Entity | Single choke point | Lives in |
|---|---|---|
| Appointment status | `transitionStatus()` / `canTransition()` | `appointment-service.ts` / `appointment-status.ts` |
| Invoice status | `transitionInvoice()` / `canTransitionInvoice()` | `billing-service.ts` / `invoice-status.ts` |
| Lab order status | `canTransitionLabOrder()` (checked in `enterLabResult`/`cancelLabOrder`) | `lab-service.ts` / `lab-order-status.ts` |
| Release status | `transitionReleaseStatus()` / `canTransitionRelease()` | `release-service.ts` / `release-status.ts` |

Every route that changes one of these entities' status calls the entity's one function — there is no second code path that writes a status directly. **New this sprint:** the doctor-console PATCH and the patient/reception cancel path (`DELETE /api/appointments/[id]`) now both pass `actorUserId` into `transitionStatus()` (previously omitted on those two call sites, so a cancellation's audit record had no actor — see Sprint 2's audit trail, closed as part of this sprint's consistency pass).

**Ownership validation** — who may act on which resource — is enforced two ways depending on when the check happens:
- **Route-level**, when the route needs the resource for other reasons anyway (appointments, doctor profiles/availability): fetch the resource, compare its `clinic_id`/`patient_id` against the caller's resolved scope, return 404 on mismatch (hides existence rather than confirming it with a 403).
- **Service-level**, via the query itself (billing, lab orders, queue): every write query's `where` clause includes `clinic_id: callerClinicId`, so a cross-tenant id simply doesn't match any row — the service throws its own `*NotFoundError`.

Both are correct and intentionally coexist (they're not an inconsistency to fix — see Section 3 for what *was* an inconsistency).

---

## 3. Conflict Handling

**Standardized this sprint:** any Prisma unique-constraint violation (`P2002`) not already mapped to a specific domain error is now caught centrally in `mapDomainError()` (`src/api/http.ts`) and returned as a clean `409 Conflict` — using the schema's *existing* unique constraints (`User.phone_number`, `PatientProfile.health_id`, `Invoice`'s `[clinic_id, invoice_number]`, `Release.version`, `Sprint.number`, etc.), not new ones. Previously this fell through to `serverError()`'s generic 500 with a raw Prisma error message leaked as `details`.

**New application-level duplicate-creation guards** (no schema change — these use a `findFirst`-then-reject check, the same shape `family-members`'s self-service registration already used for exactly this reason):
- `createDepartment()` rejects a duplicate name within the same organization (`DepartmentNameConflictError`, 409).
- `createClinic()` rejects a duplicate name within the same organization (`ClinicNameConflictError`, 409).

**Standardized cross-identity responses:** `GET /api/patients/[id]/invoices` and `.../lab-orders` previously returned `403 Forbidden` ("You may only view your own X") when a patient requested another patient's data — every *other* cross-identity check in the codebase (appointments, doctor profiles, patient profile edits) returns `404 Not Found` instead, deliberately hiding that the other resource exists at all. These two routes now match that convention.

**Deliberately left alone (checked, not a real inconsistency):** `PhoneNumberInUseError` (403) and `EmailInUseError`/`ClinicNameConflictError`/`DepartmentNameConflictError` (409) look similar by name but are semantically different — `PhoneNumberInUseError` fires during *login resolution* when a phone number belongs to a different account role (an authorization boundary, correctly 403), while the others fire at *creation time* for a genuinely duplicate resource (correctly 409). Confirmed by reading each throw site before concluding this, specifically to avoid an unjustified status-code change.

---

## 4. Integrity Guarantees

| Guarantee | Enforced by | Since |
|---|---|---|
| No two patients share a phone number as an Account | `User.phone_number @unique` + centralized P2002 mapping | Existing schema; centralized handling this sprint |
| No two Healthcare Profiles share a `health_id` | `PatientProfile.health_id @unique` + centralized P2002 mapping | Existing schema; centralized handling this sprint |
| No duplicate invoice numbering within a clinic | `Invoice @@unique([clinic_id, invoice_number])` + centralized P2002 mapping | Existing schema; centralized handling this sprint |
| No duplicate department name within an organization | Application-level check (no DB constraint) | This sprint |
| No duplicate clinic name within an organization | Application-level check (no DB constraint) | This sprint |
| No double-booking a doctor's same-day active queue slot for one patient | `DuplicateActiveAppointmentError` in `walkin-service.ts` | Existing (Sprint 2/3); verified with a regression test this sprint |
| No illegal status transition for any of the 4 status-machine entities | Single choke-point function per entity (Section 2) | Existing (Sprint 1 built the regression suite); unchanged this sprint |

**Known, accepted gap:** the Department/Clinic duplicate-name guards are application-level only (a `findFirst`-then-`create` check), not a DB constraint — under concurrent requests there's a narrow race window. Adding a real `@@unique([organization_id, name])` constraint would close it fully, but that's a schema migration this sprint's scope explicitly limits to "absolutely required for a documented bug" — this is a real but low-severity, low-likelihood gap (duplicate org-management actions, not patient-facing), not an active incident, so it's documented rather than migrated. Flagged for the Product Office if a real duplicate-creation incident ever occurs.

---

## 5. Configuration Requirements (INF-6)

`src/lib/config.ts`'s `validateStartupConfig()` runs once at process startup (`src/instrumentation.ts`, before the event platform or anything else initializes) and fails fast with every problem listed at once if configuration is invalid.

**Historical note (Release 1.1 Sprint 3):** at INF-6's original writing, this application had almost no environment-variable-driven configuration — `DATABASE_URL` was a literal hardcoded path, and no external-service credentials existed yet. That has since changed materially, and this section is kept current rather than left as a point-in-time snapshot: `validateStartupConfig()` today validates `NODE_ENV`, **`DATABASE_URL`** (required in every environment as of Release 1.2 Batch 4/ADR-0006 — Postgres has no hardcoded fallback), the SMS provider (H1/SEC-3, production-only), and the alert channel (RG-001, production-only). The pattern INF-6 established — one place (`collectConfigErrors()`) every new required variable gets added to, failing startup clearly instead of failing confusingly on whatever request first needed it — is exactly what made adding each of those three straightforward.

**Adding a new required config value:**
```ts
// in collectConfigErrors(), src/lib/config.ts
if (!env.SOME_NEW_REQUIRED_VAR) {
  errors.push("SOME_NEW_REQUIRED_VAR is required but not set.");
}
```

---

## 6. Troubleshooting Validation Failures

**"A write request returns 400 and I'm not sure why."**
Check the route's validation checks in order: required fields (`hasRequiredFields`/`missingFields`), then body shape (`isPlainObject`), then any enum check. The message is always specific about which field failed — if it isn't, that's a bug in the route, not expected behavior.

**"A write request returns 409 and I expected 400 (or vice versa)."**
409 means "the request is well-formed, but this exact operation conflicts with existing data or state" — a duplicate name, a duplicate unique field, an illegal status transition. 400 means "the request itself is malformed" — missing/wrong-shaped fields. If a response's status doesn't match this distinction, check whether the route is using `mapDomainError(error) ?? serverError(...)` (it should be) and whether the thrown error class is wired into `mapDomainError()` in `src/api/http.ts`.

**"A write silently succeeded when I expected a duplicate-conflict rejection."**
Check whether the entity in question actually has a guard yet — Section 4 lists what's covered. Not every creatable entity has a duplicate-name guard (only Department and Clinic, this sprint); adding one to another entity means adding the same `findFirst`-then-`throw` shape used in `department-service.ts`/`onboarding-service.ts`, and wiring the new error class into `mapDomainError()`.

**"The server won't start."**
Check the startup log for `"Startup configuration validation failed"` — the error message lists every configuration problem found. Fix all of them (not just the first) before restarting; `validateStartupConfig()` is deliberately exhaustive per run.

**"A P2002-shaped error still shows as a raw 500."**
The route's catch block isn't calling `mapDomainError(error)` before falling back to `serverError()`. This was a real, found gap for `POST /api/organizations/[id]/clinics` (fixed this sprint) — check any other route with a bare `catch (error) { return serverError(...) }` for the same issue.
