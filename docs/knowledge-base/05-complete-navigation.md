# 05 — Complete Navigation

← [04 Information Architecture](./04-information-architecture.md) · [Index](./00-README.md) · Next: [06 Feature Catalog](./06-feature-catalog.md)

Every route under `src/app/` as of the PKG-1→6 freeze, grouped by surface. "Gate" = the capability/role/flag that must be true to reach the route (see [08-business-rules.md](./08-business-rules.md) for the full authorization model). Routes not in a persona's primary nav are marked *(secondary)*.

## Marketing / Public (unauthenticated, route group `(marketing)`)

| Route | Nav label | Gate |
|---|---|---|
| `/` | Home | none |
| `/platform` | Products | none |
| `/solutions` | Solutions | none |
| `/industries` | Industries | none |
| `/pricing` | Pricing | none |
| `/about` | Company | none |
| `/customers` | Customers | none |
| `/contact-sales` | Contact sales | none |
| `/security` | Security | none |
| `/compliance` | Compliance | none |
| `/trust` | Trust | none |
| `/book-demo` | Book a demo | none |
| `/get-started` | Get started | none |

Marketing header nav groups: **Products** (dropdown), **Solutions** (dropdown), **For Patients** (dropdown → all point to `/login`: Find a doctor, Book an appointment, Records & prescriptions, Family health), **Pricing**, **Company** (dropdown → About, Security, Customers, Contact sales). Header CTAs: **Sign in** → `/login`; primary CTA → `/start`.

## Identity & Foundation (PKG-1)

| Route | Purpose | Gate |
|---|---|---|
| `/login` | Two-panel staff sign-in (+ footer paths to patient OTP / patient sign-up / "Start your practice") | none (public) |
| `/change-password` | Mandatory password change | authenticated session with `must_change_password = true` |
| `/workspace` | Workspace Selector (shown only for 2+ memberships) | authenticated staff session |
| `/register-org` | Owner creates a new Organization | none (public entry, becomes the new org's owner) |
| `/start` | "Start your practice" marketing→signup bridge | none |
| `/join/[token]` | Accept a staff invitation | valid, unexpired `Invitation.token` |

**WorkspaceSwitcher behaviour:** rendered as a chip `[mark] Clinic · Role ▾` in every staff shell's top bar. Single-membership accounts see a **static label**, no dropdown affordance (nothing to switch to). 2+ memberships: clicking ▾ opens the selector overlay; picking a workspace calls `POST /api/workspace/switch`, which re-scopes `Session.active_membership_id` server-side and reloads the content region — the isolation guarantee is *felt* (content changes wholesale), not just stated.

## Owner / Practice Manager — `/admin` and `/clinic`

| Route | Nav label | Gate |
|---|---|---|
| `/admin` | Team ("Your people") | `admin_portal` capability |
| `/admin/command-center` | Command | `admin_portal` capability |
| `/admin/departments` | *(secondary — reachable, not in primary 4-item nav)* | `admin_portal` capability |
| `/admin/settings` | Settings | `admin_portal` capability |
| `/admin/setup` | *(secondary)* Setup checklist | `admin_portal` capability |
| `/admin/events` | *(secondary)* Event Platform admin view | `admin_portal` capability |
| `/admin/releases` | *(secondary, internal)* Release Management | `is_platform_admin` flag — separate gate from `admin_portal` |
| `/clinic` | Dashboard / Today / Calendar / Treatments / Payments / Settings (Practice·Team·Plan) | solo clinic AND `reception`+`doctor_workspace`+`admin_portal` all present |

Admin primary nav is deliberately a **clean four-item list**: Command · Team · Clinics (shown, disabled "Soon") · Plan (shown, disabled "Soon") — per PKG-2. Clinics/Plan are honestly labelled unbuilt rather than hidden or faked.

## Doctor — `/doctor`

| Route | Nav label | Gate |
|---|---|---|
| `/doctor` | Today | `doctor_workspace` capability |
| `/doctor/workbench` | Workbench | `doctor_workspace` capability |
| `/doctor/schedule` | Schedule | `doctor_workspace` capability |
| `/doctor/patients` | Patients | `doctor_workspace` capability |
| `/doctor/practice` | Practice | `doctor_workspace` capability |
| `/doctor/profile` | Profile | `doctor_workspace` capability |

Nurse shares this exact nav (same surface, same routes) but her C2 permissions restrict what she can do once inside (vitals only, no consultation write).

## Reception — `/staff`

| Route | Nav label | Gate |
|---|---|---|
| `/staff` | *(redirects to `/staff/queue`)* | `reception` or `diagnostics` capability |
| `/staff/queue` | Front desk | `reception` capability (Technician sees a narrower/no board depending on grant) |
| `/staff/calendar` | Calendar | `reception` capability |
| `/staff/billing` | Desk | `reception` capability |
| `/staff/lab` | Lab Orders | `reception` or `diagnostics` capability |
| `/staff/dashboard` | *(secondary/legacy)* Reception Dashboard | `reception` capability |
| `/staff/walkin` | *(secondary)* Walk-in registration (also a modal from the board) | `reception` capability |
| `/staff/patients/[id]` | *(secondary)* A patient's record, reception view | `reception` capability |

## Patient — `/patient`

| Route | Nav label | Gate |
|---|---|---|
| `/patient` | Home | `patient_workspace` role + active healthcare profile |
| `/patient/book` | Book | same |
| `/patient/records` | Records | same |
| `/patient/family` | Family | same |
| `/patient/you` | You | same |
| `/patient/profile` | *(secondary, reached from You)* | same |
| `/patient/settings` | *(secondary, reached from You)* | same |
| `/patient/doctors/[id]` | *(secondary, reached from Book search)* | same |
| `/patient/care` | *(legacy — redirects to `/patient`)* | — |
| `/patient/find-care` | *(legacy — redirects to `/patient/book`)* | — |

## Public booking (no login)

| Route | Purpose |
|---|---|
| `/book/[doctorId]` | Public booking page for a specific doctor (works even unauthenticated; respects `Clinic.accepting_bookings`) |

## Print surfaces (server-rendered, browser-native print)

| Route | Purpose |
|---|---|
| `/print/prescription/[id]` | Printable prescription |
| `/print/invoice/[id]` | Printable invoice/receipt |
| `/print/visit-summary/[id]` | Printable visit summary |

## API routes, grouped by domain (conceptual — see [12-api-concepts.md](./12-api-concepts.md) for effects)

| Domain | Routes (representative) |
|---|---|
| Auth | `/api/auth/login`, `/api/auth/logout`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/password/change`, `/api/auth/switch-profile` |
| Workspace | `/api/workspace/switch`, `/api/workspaces` |
| Appointments | `/api/appointments`, `/api/appointments/[id]`, `/api/appointments/[id]/review` |
| Reception | `/api/reception/queue`, `/api/reception/checkin`, `/api/reception/status`, `/api/reception/walkin`, `/api/reception/dashboard` |
| Clinic (solo) | `/api/clinic/book`, `/api/clinic/booking-status`, `/api/clinic/booking-shared`, `/api/clinic/consultation`, `/api/clinic/dashboard`, `/api/clinic/overview`, `/api/clinic/payment`, `/api/clinic/payments`, `/api/clinic/plan`, `/api/clinic/plan/upgrade-request`, `/api/clinic/profile`, `/api/clinic/schedule`, `/api/clinic/team`, `/api/clinic/team/[staffId]`, `/api/clinic/templates`, `/api/clinic/templates/[id]`, `/api/clinic/today`, `/api/clinic/uploads` |
| Billing | `/api/billing/invoices`, `/api/billing/invoices/[id]` |
| Organizations | `/api/organizations`, `/api/organizations/[id]`, `/api/organizations/[id]/activation`, `/api/organizations/[id]/clinics`, `/api/organizations/[id]/command-center`, `/api/organizations/[id]/departments`, `/api/organizations/[id]/events`, `/api/organizations/[id]/invitations`, `/api/organizations/[id]/ownership`, `/api/organizations/[id]/staff` |
| Clinics (directory) | `/api/clinics`, `/api/clinics/[id]`, `/api/clinics/directory` |
| Doctors | `/api/doctors`, `/api/doctors/[id]`, `/api/doctors/[id]/availability`, `/api/doctors/[id]/reviews`, `/api/doctors/[id]/slots`, `/api/doctors/[id]/time-blocks`, `/api/doctors/next-slots` |
| Invitations | `/api/invitations`, `/api/invitations/[token]`, `/api/invitations/[token]/accept` |
| Lab orders | `/api/lab-orders`, `/api/lab-orders/[id]` |
| Onboarding | `/api/onboarding/quick-setup` |
| Patients | `/api/patients`, `/api/patients/[id]`, `/api/patients/[id]/invoices`, `/api/patients/[id]/lab-orders`, `/api/patients/[id]/notifications`, `/api/patients/[id]/onboarding`, `/api/patients/[id]/timeline`, `/api/patients/family-members`, `/api/patients/favorites`, `/api/patients/favorites/doctors`, `/api/patients/sessions`, `/api/patients/sessions/[id]` |
| Patient (self) | `/api/patient/recommendations`, `/api/patient/recommendations/[id]`, `/api/patient/uploads` |
| Public | `/api/public/bookings`, `/api/public/doctors`, `/api/public/doctors/[id]` |
| Services | `/api/services`, `/api/services/[id]` |
| Releases / Sprints (platform-admin) | `/api/releases`, `/api/releases/[id]`, `/api/releases/[id]/status`, `/api/releases/[id]/view`, `/api/releases/unread-count`, `/api/sprints`, `/api/sprints/[number]` |
| Demo | `/api/demo/enter`, `/api/demo/reset` |
| Health | `/api/health`, `/api/ready` |
| Files | `/api/files/[key]` |
| Admin | `/api/admin/plan` |

## Route summary by surface (counts)

| Surface | Page routes | Notes |
|---|---|---|
| Marketing | 13 | fully public |
| Identity | 6 | login/change-password/workspace/register-org/start/join |
| Owner (`/admin` + `/clinic`) | 7 | 6 admin + 1 consolidated solo surface |
| Doctor | 6 | Today/Workbench/Schedule/Patients/Practice/Profile |
| Reception | 8 | incl. legacy dashboard + walkin + patient-detail |
| Patient | 10 | incl. 2 legacy redirects |
| Public booking | 1 | `/book/[doctorId]` |
| Print | 3 | prescription/invoice/visit-summary |
