# 03 — Personas

← [02 Product Constitution](./02-product-constitution.md) · [Index](./00-README.md) · Next: [04 Information Architecture](./04-information-architecture.md)

Auriva recognizes **seven personas** on the frozen C2 RBAC matrix, plus one internal-only persona (Platform Admin). Every staff persona is a `StaffProfile` (= "membership") attached to a `Clinic`; every persona's access is the union of **capabilities** (which surface they may open) and **permissions** (what they may do there) — see [08-business-rules.md](./08-business-rules.md) for the full matrix. The role label shown in the UI can differ from the stored role string (`super_admin` displays as "Owner").

## Canonical demo world (implemented, source of truth for demos)

**Organization:** Sunrise Health Network · **Clinic:** Sunrise Clinic — Koregaon Park, Pune, Maharashtra · **Plan:** Professional · Seed script: `prisma/seed-demo-india.ts` (idempotent — re-run any time with `npx tsx prisma/seed-demo-india.ts`).

**Staff login:** `/login` with **phone + `password123`** (enter the 10-digit number; `+91` is assumed, e.g. type `9876500001`). **Patients log in with phone + OTP** (dev-echo — the OTP is printed back in the response since no SMS provider is wired yet; see [14-security.md](./14-security.md)).

| Person | Role (stored) | Phone | Lands on | Specialty / notes |
|---|---|---|---|---|
| Rajesh Sharma | `super_admin` (displays "Owner") | 9876500001 | `/admin` | Legal owner, runs the practice, not a clinician |
| Priya Nair | `practice_manager` | 9876500002 | `/admin` | Operational (not legal) owner-equivalent |
| Dr Ananya Iyer | `doctor` | 9876500003 | `/doctor` | Cardiologist |
| Dr Vikram Reddy | `doctor` | 9876500004 | `/doctor` | General Physician |
| Dr Arjun Deshmukh | `doctor` | 9876500008 | `/doctor` | Dermatologist |
| Dr Meera Krishnan | `doctor` | 9876500009 | `/doctor` | Pediatrician |
| Dr Sanjay Rao | `doctor` | 9876500010 | `/doctor` | Orthopedician |
| Dr Neha Kapoor | `doctor` | 9876500011 | `/doctor` | Gynecologist |
| Sunita Deshpande | `receptionist` | 9876500005 | `/staff` | Front desk |
| Anjali Verma | `receptionist` | 9876500012 | `/staff` | Front desk |
| Rahul Sharma | `receptionist` | 9876500013 | `/staff` | Front desk |
| Kavita Joshi | `nurse` | 9876500006 | `/doctor` | Joins doctors on the clinical surface (vitals only, no diagnosis) |
| Ramesh Gupta | `technician` | 9876500007 | `/staff` | Diagnostics worklist only (no reception/billing) |

**Patients** (phone + OTP → `/patient`): **Amit Patel** `…0101` (allergy + chronic condition + a past visit with a real prescription — the fullest demo account), Sneha Kulkarni `…0102`, Mohammed Farooq `…0103`, Lakshmi Menon `…0104`, plus Rohan Sharma, Priya Joshi, Aarav Mehta, Deepa Nair, Kiran Rao appearing live on the reception/doctor queues (walk-ins, waiting-lane aging demo, a completed-but-unpaid invoice for Kiran, a fully paid invoice for Farooq).

**Naming-collision rule (permanent):** no two *different* people share a first name within one walkthrough — this was a real defect found and fixed in the Phase-1 review (two "Rohan"s) and is now a standing rule for any future demo data.

> **Design-reference vs implemented:** the UXS-043 *prototype's* Deliverable-A casting (Sunrise Health *Group*, Bengaluru, Dr Anjali Rao, SmileCare Dental / HSR Family Clinic / Sunrise Physio) is naming used only inside the throwaway HTML prototypes to fix a demo-continuity defect found in that review. It is **not** what's running in the real app. The table above (Sunrise Health *Network*, Pune) is what the seed script actually creates and is the source of truth for real demos.

---

## Owner

- **Who they are:** the legal owner of the practice (`Organization.owner_user_id`), stored role `super_admin`, displayed as **"Owner."** May or may not also be a clinician.
- **Job to be done:** run the whole practice — see how it's doing today, manage who works there, and (in a solo practice) also do the clinical/reception work personally.
- **The one question their surface answers:** *"What is my practice doing?"* (Command Center) or, solo, *"What do I do today?"* (consolidated `/clinic`).
- **Home route:** `/admin` (team) once there's a team; `/clinic` while solo (single-member clinic).
- **Capabilities:** `reception`, `doctor_workspace`, `admin_portal` (all three by default — the Owner can do anything).
- **Permissions:** every permission in the C2 matrix, including the two **never-delegated** owner-only actions: `plan:manage` (subscription) and `team:assign_owner` (grant/revoke ownership).
- **Cannot do:** nothing is capability-restricted, but ownership-transfer/plan/deletion are gated by **legal ownership** (`Organization.owner_user_id`), not just the `super_admin` role — an *operational* owner (Practice Manager) cannot touch those even though they share the `/admin` cockpit.

## Practice Manager

- **Who they are:** an **operational** owner-equivalent — runs the practice day-to-day without holding legal ownership.
- **Job to be done:** everything the Owner does operationally — invite/manage staff, see reports, manage settings, run billing — minus the two legal-owner powers.
- **The one question:** same as Owner's Command Center — *"What is my practice doing, and what needs my attention?"*
- **Home route:** `/admin`.
- **Capabilities:** `admin_portal`.
- **Permissions:** full operations (`appointments:manage`, `patients:manage`, `billing:manage`, `payments:collect`, `schedule:manage`, `reports:org`, `team:manage`, `settings:manage`, `audit:view`) **minus** `clinical_records:edit` (view-only on clinical notes), **minus** `plan:manage`, **minus** `team:assign_owner`.
- **Cannot do:** edit clinical records, manage the subscription/plan, grant or revoke ownership.

## Doctor

- **Who they are:** a clinician seeing patients — the flagship persona of PKG-3, scored 9.7/10 in Product Office review.
- **Job to be done:** get through a full clinic day of consultations with minimal friction and maximum clinical confidence.
- **The one question:** *"Who's next, and what do they need?"* (Today) / *"Finish this visit"* (Workbench).
- **Home route:** `/doctor`.
- **Capabilities:** `doctor_workspace`.
- **Permissions:** `clinical_records:view/edit`, `consultation:write`, `vitals:write`, `diagnostics:view/order`, `schedule:view/own`, `reports:own` (own figures, not org-wide analytics), `practice_profile:own`. Does **not** get `payments:collect` or `billing:manage` by default — a solo owner-doctor gets these only via the `reception` capability *grant*, never as a base doctor default.
- **Cannot do:** see organization-wide analytics (`reports:org` is Owner/Practice-Manager only), collect payments or manage billing (unless granted `reception`), manage other clinicians' schedules, invite/suspend/archive staff.

## Nurse

- **Who they are:** a clinical assistant who joins the Doctor on the **same** `/doctor` surface (surfaces are workflow containers, not per-role apps).
- **Job to be done:** capture vitals, allergies, chief complaint, and prep notes ahead of the doctor's consultation.
- **The one question:** *"Is this patient ready for the doctor?"* **[INFERRED]** — not stated verbatim in a PKG doc; inferred from the permission set (`vitals:write` only) and the "surfaces are workflow containers" principle. Verify with Product Office if a dedicated Nurse screen/question is ever specified.
- **Home route:** `/doctor` (same container as Doctor).
- **Capabilities:** `doctor_workspace` (default, per Batch D · D2 activation).
- **Permissions:** `appointments:view`, `patients:view`, `clinical_records:view`, `vitals:write`, `diagnostics:view`, `schedule:view`.
- **Cannot do:** write diagnosis, prescriptions, or treatment plans (`consultation:write` is Doctor-only) — a hard line from the C2 matrix. A dedicated Nurse action surface (vitals capture UI) is itself **deferred** — see [18](./18-deferred-features.md).

## Reception(ist)

- **Who they are:** the front desk — the demo world has three (Sunita, Anjali, Rahul).
- **Job to be done:** keep the waiting room moving: register walk-ins, check patients in, track the queue, collect payment, close the day's cash cycle.
- **The one question:** *"What's the room doing?"*
- **Home route:** `/staff` (nav label **"Front desk"**; the surface/spec name is "Reception Workspace" — three names, one concept, see the glossary in [04](./04-information-architecture.md)).
- **Capabilities:** `reception`.
- **Permissions:** `appointments:manage/view`, `patients:manage/view`, `billing:manage`, `payments:collect`, `schedule:view`.
- **Cannot do:** anything clinical — `clinical_records:*`, `consultation:write`, `vitals:write` are explicitly withheld (the "hard line" from C2 amendment #2: reception never touches clinical notes).

## Technician

- **Who they are:** diagnostics/lab staff — the demo world's Ramesh Gupta.
- **Job to be done:** work the diagnostics/results worklist.
- **The one question:** *"What tests need results entered?"* **[INFERRED]** — reasoned from the `diagnostics` capability and `diagnostics:results:write` permission; not a verbatim PKG quote.
- **Home route:** `/staff` (same container as Reception, but a deliberately **narrower** capability).
- **Capabilities:** `diagnostics` — explicitly narrower than `reception`, so activating the Technician role can never accidentally grant front-desk authority (billing, booking, consultation).
- **Permissions:** `patients:view`, `diagnostics:view`, `diagnostics:results:write`.
- **Cannot do:** billing, booking, check-in, or any clinical write beyond entering test/lab results. Cannot diagnose. A dedicated technician results-entry UI is itself **deferred** ([18](./18-deferred-features.md)) — today the underlying `LabOrder` model supports it but the Batch D scope stopped at capability/permission wiring.

## Patient

- **Who they are:** the person receiving care — Auriva's "public face," the warmest surface in the product.
- **Job to be done:** understand what to do today, book care, understand what happened at a visit, manage family members' care, and manage their own identity/settings.
- **The five questions → five tabs:** *What do I do today?* → Home · *Can I book?* → Book · *What happened at my visit?* → Records · *Who in my family needs care?* → Family · *Who am I?* → You.
- **Home route:** `/patient`.
- **Capabilities:** `patient_workspace` (a role, not a staff capability grant — patients never hold staff capabilities).
- **Permissions:** none from the staff C2 matrix — patients operate under a completely separate authorization path (`requirePatientContext`), scoped to their own `PatientProfile`(s) via `AccountProfileLink`.
- **Cannot do:** see any staff surface at all — capability-absent, never shown, never a 403 (see [02](./02-product-constitution.md) principle 12). Cannot see clinical documentation beyond their own visit's Dx/Rx/reports.
- **Identity nuance:** one phone number can be linked to multiple `PatientProfile`s (family sharing — a parent's phone often registers a child's profile). A `PatientProfile` can also exist with **no** linked `User` account at all (reception/emergency registration creates a clinical identity without requiring a login) — see [08](./08-business-rules.md) and [11](./11-database-concepts.md).

## Platform Admin (internal, not customer-facing)

- **Who they are:** Auriva's own internal staff — gated by `User.is_platform_admin`, a flag **never** set by any customer signup/invite flow.
- **Job to be done:** author and publish Auriva's own product release notes (the Release Management platform, APS-036) — describing the *platform itself*, not any one customer's clinic.
- **The one question:** *"What are we shipping, and has everyone seen it?"*
- **Home route:** `/admin/releases` (gated separately from the customer-facing admin portal).
- **Cannot do:** this flag is deliberately separate from `super_admin` — a clinic owner, even with full `admin_portal` capability, cannot draft or publish an Auriva release.

## Cross-persona note: "surfaces are containers, not apps"

Six of the seven customer-facing personas map onto only **three** staff surfaces plus the solo-consolidated `/clinic`:

```
/admin   ← Owner, Practice Manager
/doctor  ← Doctor, Nurse
/staff   ← Receptionist, Technician
/clinic  ← solo Owner-doctor (when the clinic has exactly one member and full capabilities)
/patient ← Patient (never shares a surface with staff)
```

This is why the permission model (not the surface) is the fine-grained authority boundary — see [08-business-rules.md](./08-business-rules.md) for the full C2 matrix and [05-complete-navigation.md](./05-complete-navigation.md) for the route-level detail.
