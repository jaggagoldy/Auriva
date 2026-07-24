# Auriva — Smoke Test Matrix

**Run this after every deployment.** ~10 minutes. Seed first: `npx tsx prisma/seed-demo-india.ts`.
Staff sign in at `/login` with the 10-digit number + `password123` (+91 assumed). Patients use OTP (dev echo).

Legend: ✅ pass · ⬜ not run · ❌ fail (block release)

## Critical-path workflows

| # | Area | Steps | Expected | Status |
|---|---|---|---|---|
| 1 | **Login (staff)** | Sign in `9876500001` / `password123` | 200 → lands `/admin` | ⬜ |
| 2 | **Login (bare/format)** | Try `9876500005` and `98765 00005` | Both land Receptionist on `/staff` | ⬜ |
| 3 | **Login (patient OTP)** | `/login` → patient → `9876500101` → dev OTP | Lands `/patient` | ⬜ |
| 4 | **Workspace resolve** | Log in as each role | Owner/Mgr→`/admin`, Doctor/Nurse→`/doctor`, Reception/Tech→`/staff` | ⬜ |
| 5 | **Queue** | Receptionist → `/staff` | Amit (in consult), Sneha (waiting), Lakshmi (scheduled) show | ⬜ |
| 6 | **Consultation** | Doctor Ananya → `/doctor` | Amit's in-consultation visit opens in workbench | ⬜ |
| 7 | **Booking** | Receptionist → book an appointment | Appears in queue/calendar | ⬜ |
| 8 | **Billing + Payment** | `/staff` → Billing → SUN-0001 | Shows paid ₹900 (UPI); collect on a draft works | ⬜ |
| 9 | **Team management** | Owner → `/admin` → Team | 6 members + role labels; change a role → toast + updates | ⬜ |
| 10 | **Reports / Command Center** | Owner/Manager → `/admin` → Command Center | Loads live figures | ⬜ |
| 11 | **Ownership** | Owner → promote Manager to owner | Manager becomes operational owner; Owner keeps legal | ⬜ |
| 12 | **Password change** | Provision a staff acct → first login | Forced `/change-password` → then correct surface | ⬜ |

## Permission spot-checks (must be **denied**)

| # | As | Attempt | Expected |
|---|---|---|---|
| N1 | Receptionist | Open `/admin` | Redirected out (no `admin_portal`) |
| N2 | Practice Manager | `POST /api/organizations/[id]/ownership` (transfer) | **403** (legal-owner only) |
| N3 | Technician | A reception billing action | **403** (has `diagnostics`, not `reception`) |
| N4 | Nurse | Write a consultation (doctor API) | **403** (not `doctor` role) |
| N5 | Any non-owner | Change plan | **403 / blocked** |

## Cross-cutting

| Area | Check | Status |
|---|---|---|
| Responsive | `/patient` (mobile-first), `/staff`, `/admin` at 1440 / 1024 / 768 px — no horizontal scroll | ⬜ |
| Keyboard a11y | Tab through login + a form; visible focus; Enter submits | ⬜ |
| Empty/error states | Filter a list to empty → shared EmptyState; kill network → ErrorState/retry | ⬜ |
| Browsers | Chrome (primary), Edge, Safari; Firefox smoke | ⬜ |
| Health | `GET /api/health` and `/api/ready` → 200 | ⬜ |
| Build | `npx next build` clean; `npx tsc --noEmit` 0 | ⬜ |
| Tests | `npx vitest run` all green | ⬜ |

> After a test run, **reseed** before demoing — the suite shares the dev DB.
