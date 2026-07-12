// Milestone 1 (First Clinic Ready), Batch 6 — Demo Mode. A believable, live
// solo clinic ("SmileCare Physiotherapy", Dr. Priya Sharma) that a prospect can
// step into instantly via "Skip & explore", plus a one-click reset back to the
// original story. This service SEEDS real rows through the same models every
// other batch uses (Organization/Clinic/StaffProfile/Service/PatientProfile/
// Appointment/Invoice/Payment) — it invents no parallel "demo" tables. The only
// marker is Organization.is_demo, which makes reset provably safe: it can only
// ever touch the sandbox org, never a real customer's data.
//
// Identity vs. content:
//   - The SCAFFOLD (owner account + org + clinic + Dr. Priya's profile) is
//     STABLE across resets — same ids, so the explorer's session survives a
//     reset without being kicked back to /login.
//   - The CONTENT (treatments, patients, appointments, invoices, payments,
//     availability, the "shared"/"accepting" flags) is VOLATILE — wiped and
//     re-created on every reset so the story is always the same on entry.
//
// Seeding runs sequentially (not one interactive transaction) — matching
// prisma/seed.ts and staying clear of the interactive-transaction timeout for
// this ~50-write fixture. Wipe-first makes a partial seed self-healing: the
// next enter/reset clears it and rebuilds.

import prisma from "@/lib/prisma";
import { generateHealthIdCandidate } from "@/domain/health-id";
import { SPRINGFIELD_BASE_LAT, SPRINGFIELD_BASE_LNG } from "@/shared/areas";
import type { InvoiceItem } from "@/domain/invoice-status";

// Reserved sandbox identity. The owner is a real (super_admin) account so the
// /clinic guard passes exactly as it would for a real owner — nothing about the
// demo bypasses authorization. H2 (security): it carries NO password, so it can
// never be reached through credential login (verifyPassword returns false for a
// null hash) — the ONLY way in is the rate-limited /api/demo/enter endpoint, and
// the session it mints is scoped to the demo org alone.
const DEMO_OWNER_PHONE = "+19000000001";
const DEMO_ORG_NAME = "SmileCare Physiotherapy";
const DEMO_DOCTOR_NAME = "Dr. Priya Sharma";

export interface DemoIds {
  ownerUserId: string;
  organizationId: string;
  clinicId: string;
  doctorId: string;
}

// --- health-id uniqueness (small fixed set; mirrors prisma/seed.ts) ---
function makeHealthId(used: Set<string>): string {
  let candidate = generateHealthIdCandidate();
  while (used.has(candidate)) candidate = generateHealthIdCandidate();
  used.add(candidate);
  return candidate;
}

/** Finds the single demo organization (if it exists). */
export async function findDemoOrg() {
  return prisma.organization.findFirst({
    where: { is_demo: true },
    include: { clinics: { orderBy: { name: "asc" } } },
  });
}

/**
 * Ensures the STABLE demo scaffold exists (owner account + org + clinic + Dr.
 * Priya's profile + membership) and returns its ids. Created once; reused
 * across every enter/reset so the explorer's session id space never changes.
 * The owner's bio/registration are set here so the "Complete your profile"
 * Clinic-Ready step is always satisfied in the demo.
 */
export async function ensureDemoScaffold(): Promise<DemoIds> {
  const existing = await findDemoOrg();
  if (existing && existing.clinics[0]) {
    const doctor = await prisma.staffProfile.findFirst({
      where: { user_id: existing.owner_user_id, clinic_id: existing.clinics[0].id },
    });
    if (doctor) {
      return {
        ownerUserId: existing.owner_user_id,
        organizationId: existing.id,
        clinicId: existing.clinics[0].id,
        doctorId: doctor.id,
      };
    }
  }

  // No password_hash: the demo owner cannot be signed into via the credential
  // login form — only through the enter endpoint (see the header note above).
  const owner = await prisma.user.create({
    data: { role: "super_admin", phone_number: DEMO_OWNER_PHONE },
  });

  const organization = await prisma.organization.create({
    data: {
      name: DEMO_ORG_NAME,
      address: "24 Lakeview Road, Bengaluru",
      contact_phone: "+91 80 4123 7788",
      archetype: "independent_clinic",
      is_demo: true,
      owner_user_id: owner.id,
    },
  });

  const clinic = await prisma.clinic.create({
    data: {
      name: DEMO_ORG_NAME,
      address: "24 Lakeview Road, Bengaluru",
      super_admin_id: owner.id,
      organization_id: organization.id,
      working_days: "mon,tue,wed,thu,fri,sat",
      opens_at: "09:00",
      closes_at: "18:00",
      phone: "+91 80 4123 7788",
      default_consultation_fee: 600,
      is_verified: true,
      latitude: SPRINGFIELD_BASE_LAT,
      longitude: SPRINGFIELD_BASE_LNG,
    },
  });

  const doctor = await prisma.staffProfile.create({
    data: {
      user_id: owner.id,
      clinic_id: clinic.id,
      specialty: "Physiotherapist",
      full_name: DEMO_DOCTOR_NAME,
      bio: "Physiotherapist with 12 years in musculoskeletal and post-operative rehab. Believes recovery is a partnership between clinic and patient.",
      years_experience: 12,
      languages: "English,Hindi,Kannada",
      qualifications: "BPT, MPT (Orthopaedics)",
      registration_number: "KAR-PT-4471",
      consultation_fee: 600,
      follow_up_fee: 500,
    },
  });

  await prisma.organizationMember.create({
    data: { organization_id: organization.id, user_id: owner.id, role: "owner" },
  });

  return {
    ownerUserId: owner.id,
    organizationId: organization.id,
    clinicId: clinic.id,
    doctorId: doctor.id,
  };
}

/** Wipes only the VOLATILE content of the demo clinic (never the scaffold). */
async function wipeDemoContent(ids: DemoIds) {
  // Money and visits first (payments → invoices → appointments), then the
  // catalog/availability, then the demo patients and their sandbox accounts.
  await prisma.payment.deleteMany({ where: { clinic_id: ids.clinicId } });
  await prisma.invoice.deleteMany({ where: { clinic_id: ids.clinicId } });
  await prisma.appointment.deleteMany({ where: { clinic_id: ids.clinicId } });
  await prisma.service.deleteMany({ where: { clinic_id: ids.clinicId } });
  await prisma.doctorAvailability.deleteMany({ where: { doctor_id: ids.doctorId } });

  const profiles = await prisma.patientProfile.findMany({
    where: { registered_by_clinic_id: ids.clinicId },
    select: { id: true, user_id: true },
  });
  const profileIds = profiles.map((p) => p.id);
  const patientUserIds = profiles.map((p) => p.user_id).filter((v): v is string => Boolean(v));
  // Deleting the profile cascades its Contacts and AccountProfileLinks.
  await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
  if (patientUserIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: patientUserIds } } });
  }
}

// --- time helpers: everything anchored to "today" so the demo always looks
// live, clamped inside the calendar day so getTodayAppointments always includes
// the intended rows regardless of the hour the demo is opened. ---
function dayWindow() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { now, start, end };
}

/**
 * Rebuilds the demo story: treatments, an 8-patient roster (new / returning /
 * seen-today), a believable past history, a live "today" (paid + partial +
 * pending), and follow-ups due tomorrow / next week / already completed. Assumes
 * the scaffold exists and content has been wiped.
 */
async function seedDemoContent(ids: DemoIds) {
  const { now, start, end } = dayWindow();
  const year = now.getFullYear();
  const usedHealthIds = new Set<string>();

  const clampToday = (d: Date) =>
    new Date(Math.min(Math.max(d.getTime(), start.getTime() + 5 * 60_000), end.getTime() - 5 * 60_000));
  const minsFromNow = (m: number) => clampToday(new Date(now.getTime() + m * 60_000));
  const daysFromNow = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d;
  };
  const daysAgo = (n: number) => daysFromNow(-n);

  // Re-open the clinic and mark the booking page as already shared, so the
  // Clinic-Ready checklist reads 100% and the home flips to the patient goal.
  await prisma.clinic.update({
    where: { id: ids.clinicId },
    data: { accepting_bookings: true, booking_shared_at: daysAgo(3) },
  });

  // 1) Treatments — kept generic (Product Office) so the demo makes sense for
  // any solo practice, not just physiotherapy.
  const TREATMENTS = [
    { name: "Assessment", duration_minutes: 45, price: 800, sort_order: 0 },
    { name: "Follow-up Session", duration_minutes: 30, price: 500, sort_order: 1 },
    { name: "Dry Needling", duration_minutes: 30, price: 700, sort_order: 2 },
    { name: "Exercise Therapy", duration_minutes: 45, price: 600, sort_order: 3 },
  ];
  const services: Record<string, { name: string; price: number }> = {};
  for (const t of TREATMENTS) {
    const s = await prisma.service.create({ data: { clinic_id: ids.clinicId, ...t } });
    services[t.name] = { name: s.name, price: s.price };
  }

  // 2) Weekly availability (matches the clinic's hours) so slots are bookable.
  await prisma.doctorAvailability.createMany({
    data: [1, 2, 3, 4, 5, 6].map((day_of_week) => ({
      doctor_id: ids.doctorId,
      day_of_week,
      start_time: "09:00",
      end_time: "18:00",
    })),
  });

  // 3) Patient roster. `hasAccount` gives some patients a real (OTP) account
  // (returning patients who book online); walk-ins/new registrations have a
  // profile only — exactly the mix reception sees.
  async function makePatient(input: {
    fullName: string;
    phone: string;
    gender: string;
    dob: string;
    hasAccount: boolean;
  }) {
    let userId: string | null = null;
    if (input.hasAccount) {
      const u = await prisma.user.create({
        data: { role: "patient", phone_number: input.phone },
      });
      userId = u.id;
    }
    const profile = await prisma.patientProfile.create({
      data: {
        user_id: userId,
        full_name: input.fullName,
        blood_group: "O-Positive",
        date_of_birth: new Date(input.dob),
        gender: input.gender,
        onboarding_completed: true,
        health_id: makeHealthId(usedHealthIds),
        verification_level: input.hasAccount ? "phone_verified" : "unverified",
        registered_by_clinic_id: ids.clinicId,
        contacts: {
          create: [
            {
              type: "phone",
              value: input.phone,
              is_primary: true,
              verified_at: input.hasAccount ? new Date() : null,
            },
          ],
        },
      },
    });
    if (userId) {
      await prisma.accountProfileLink.create({
        data: { account_user_id: userId, healthcare_profile_id: profile.id, is_primary: true },
      });
    }
    return profile;
  }

  const ravi = await makePatient({ fullName: "Ravi Kumar", phone: "+19000001001", gender: "Male", dob: "1985-02-11", hasAccount: true });
  const meera = await makePatient({ fullName: "Meera Nair", phone: "+19000001002", gender: "Female", dob: "1990-09-30", hasAccount: true });
  const arjun = await makePatient({ fullName: "Arjun Rao", phone: "+19000001003", gender: "Male", dob: "1978-06-04", hasAccount: false });
  const sanjay = await makePatient({ fullName: "Sanjay Gupta", phone: "+19000001004", gender: "Male", dob: "1969-12-19", hasAccount: true });
  const deepak = await makePatient({ fullName: "Deepak Menon", phone: "+19000001005", gender: "Male", dob: "1994-03-27", hasAccount: true });
  const anjali = await makePatient({ fullName: "Anjali Verma", phone: "+19000001006", gender: "Female", dob: "1988-07-15", hasAccount: false });
  const kavya = await makePatient({ fullName: "Kavya Reddy", phone: "+19000001007", gender: "Female", dob: "1997-11-08", hasAccount: false });
  const neha = await makePatient({ fullName: "Neha Joshi", phone: "+19000001008", gender: "Female", dob: "2001-01-22", hasAccount: true });

  // Invoice-number sequence for this clinic (INV-YYYY-000N).
  let invoiceSeq = 0;
  async function billAndPay(input: {
    appointmentId: string;
    patientId: string;
    treatment: { name: string; price: number };
    // paid: full paid; partial: issued with a part payment; pending: draft, unpaid.
    kind: "paid" | "partial" | "pending";
    paidAmount?: number;
    method?: "cash" | "upi" | "card";
    receivedAt: Date;
  }) {
    invoiceSeq += 1;
    const number = `INV-${year}-${String(invoiceSeq).padStart(4, "0")}`;
    const items: InvoiceItem[] = [
      { description: input.treatment.name, qty: 1, unit_price: input.treatment.price, amount: input.treatment.price },
    ];
    const status = input.kind === "paid" ? "paid" : input.kind === "partial" ? "issued" : "draft";
    const invoice = await prisma.invoice.create({
      data: {
        invoice_number: number,
        clinic_id: ids.clinicId,
        patient_id: input.patientId,
        appointment_id: input.appointmentId,
        status,
        items_json: JSON.stringify(items),
        total: input.treatment.price,
        issued_at: input.kind === "pending" ? null : input.receivedAt,
        paid_at: input.kind === "paid" ? input.receivedAt : null,
      },
    });
    if (input.kind !== "pending") {
      const amount = input.kind === "paid" ? input.treatment.price : (input.paidAmount ?? 0);
      if (amount > 0) {
        await prisma.payment.create({
          data: {
            invoice_id: invoice.id,
            clinic_id: ids.clinicId,
            amount,
            method: input.method ?? "cash",
            received_at: input.receivedAt,
            received_by_user_id: ids.ownerUserId,
          },
        });
      }
    }
    return invoice;
  }

  // A completed past visit: clinical record + a fully-paid invoice paid that day
  // (so it never lands in *today's* collected total).
  async function completedPastVisit(input: {
    patientId: string;
    daysBack: number;
    treatment: { name: string; price: number };
    diagnosis: string;
    notes: string;
    followUpDate?: Date | null;
    isFollowUp?: boolean;
    followUpSourceId?: string | null;
  }) {
    const when = daysAgo(input.daysBack);
    const appt = await prisma.appointment.create({
      data: {
        patient_id: input.patientId,
        doctor_id: ids.doctorId,
        clinic_id: ids.clinicId,
        scheduled_time: when,
        status: "completed",
        checked_in_at: when,
        started_at: new Date(when.getTime() + 5 * 60_000),
        completed_at: new Date(when.getTime() + 35 * 60_000),
        diagnosis: input.diagnosis,
        history_notes: input.notes,
        follow_up_date: input.followUpDate ?? null,
        follow_up_source_appointment_id: input.followUpSourceId ?? null,
      },
    });
    await billAndPay({
      appointmentId: appt.id,
      patientId: input.patientId,
      treatment: input.treatment,
      kind: "paid",
      method: "upi",
      receivedAt: new Date(when.getTime() + 40 * 60_000),
    });
    return appt;
  }

  // ---- Past history (returning patients + the "patients seen" goal count) ----
  const raviFirst = await completedPastVisit({ patientId: ravi.id, daysBack: 21, treatment: services["Assessment"], diagnosis: "Mechanical low back pain", notes: "Reduced lumbar flexion. Started McKenzie protocol.", followUpDate: daysAgo(7) });
  // Ravi's day-7 visit is itself an already-COMPLETED follow-up of his day-21 assessment.
  await completedPastVisit({ patientId: ravi.id, daysBack: 7, treatment: services["Exercise Therapy"], diagnosis: "Mechanical low back pain — improving", notes: "ROM improving. Progressed core loading.", followUpSourceId: raviFirst.id });
  const meeraSource = await completedPastVisit({ patientId: meera.id, daysBack: 14, treatment: services["Assessment"], diagnosis: "Post-op ACL rehab, week 3", notes: "Good quad activation. Cleared for closed-chain work.", followUpDate: daysAgo(0) });
  await completedPastVisit({ patientId: arjun.id, daysBack: 30, treatment: services["Dry Needling"], diagnosis: "Chronic trapezius tension", notes: "Trigger-point release, home stretches advised." });
  const sanjaySource = await completedPastVisit({ patientId: sanjay.id, daysBack: 10, treatment: services["Assessment"], diagnosis: "Frozen shoulder (adhesive capsulitis)", notes: "Baseline ROM recorded. Mobilisation plan started.", followUpDate: daysFromNow(0) });
  await completedPastVisit({ patientId: deepak.id, daysBack: 45, treatment: services["Assessment"], diagnosis: "Runner's knee (patellofemoral pain)", notes: "Gait assessment, taping trial." });
  const deepakLast = await completedPastVisit({ patientId: deepak.id, daysBack: 20, treatment: services["Exercise Therapy"], diagnosis: "Patellofemoral pain — improving", notes: "Quad/glute strengthening progressed." });
  await completedPastVisit({ patientId: anjali.id, daysBack: 60, treatment: services["Dry Needling"], diagnosis: "Tension headache, cervical origin", notes: "Suboccipital release, posture education." });

  // ---- Today (the live story: paid, partial, pending, and what's next) ----

  // 1) 09:00 — Ravi, Assessment, PAID today (cash) + clinical record.
  const t1 = await prisma.appointment.create({
    data: {
      patient_id: ravi.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: minsFromNow(-180), status: "completed",
      checked_in_at: minsFromNow(-190), started_at: minsFromNow(-180), completed_at: minsFromNow(-165),
      diagnosis: "Mechanical low back pain — near resolution",
      history_notes: "Pain-free at rest. Discharged to home programme, review PRN.",
      follow_up_date: daysFromNow(1),
    },
  });
  await billAndPay({ appointmentId: t1.id, patientId: ravi.id, treatment: services["Assessment"], kind: "paid", method: "cash", receivedAt: minsFromNow(-164) });

  // 2) 09:45 — Meera, Follow-up (of her day-14 visit), PARTIAL (₹300 of ₹500, upi) today.
  const t2 = await prisma.appointment.create({
    data: {
      patient_id: meera.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: minsFromNow(-150), status: "completed",
      checked_in_at: minsFromNow(-155), started_at: minsFromNow(-150), completed_at: minsFromNow(-135),
      diagnosis: "Post-op ACL rehab, week 5", history_notes: "Single-leg balance improving. Progressed plyometrics.",
      follow_up_source_appointment_id: meeraSource.id,
    },
  });
  await billAndPay({ appointmentId: t2.id, patientId: meera.id, treatment: services["Follow-up Session"], kind: "partial", paidAmount: 300, method: "upi", receivedAt: minsFromNow(-134) });

  // 3) 10:30 — Arjun, Dry Needling, PENDING (draft, unpaid — the "still owes" case).
  const t3 = await prisma.appointment.create({
    data: {
      patient_id: arjun.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: minsFromNow(-90), status: "completed",
      checked_in_at: minsFromNow(-95), started_at: minsFromNow(-90), completed_at: minsFromNow(-75),
      diagnosis: "Chronic trapezius tension", history_notes: "Dry needling to upper traps and levator. Advised heat + stretches.",
    },
  });
  await billAndPay({ appointmentId: t3.id, patientId: arjun.id, treatment: services["Dry Needling"], kind: "pending", receivedAt: now });

  // 4) NEXT patient — Kavya, new, first visit, upcoming today. Drives the Today
  // "Your next patient" card and Start Consultation.
  await prisma.appointment.create({
    data: {
      patient_id: kavya.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: minsFromNow(30), status: "scheduled",
      notes: "New patient — first visit. Reports right ankle sprain (2 weeks ago).",
    },
  });

  // 5) Sanjay — a FOLLOW-UP visit today (of his day-10 assessment): shows in the
  // Today follow-up count and is upcoming.
  await prisma.appointment.create({
    data: {
      patient_id: sanjay.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: minsFromNow(90), status: "scheduled",
      notes: "Frozen shoulder review.",
      follow_up_source_appointment_id: sanjaySource.id,
    },
  });

  // 6) Neha — new patient, later today.
  await prisma.appointment.create({
    data: {
      patient_id: neha.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: minsFromNow(180), status: "scheduled",
      notes: "New patient — desk-posture neck pain.",
    },
  });

  // ---- Follow-ups: tomorrow, next week, and one already completed ----
  // Tomorrow — Ravi's discharge review (follow-up of today's visit t1).
  await prisma.appointment.create({
    data: {
      patient_id: ravi.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: (() => { const d = daysFromNow(1); d.setHours(10, 0, 0, 0); return d; })(),
      status: "scheduled", notes: "Discharge review.",
      follow_up_source_appointment_id: t1.id,
    },
  });
  // Next week — Deepak's progress check (follow-up of his day-20 visit).
  await prisma.appointment.create({
    data: {
      patient_id: deepak.id, doctor_id: ids.doctorId, clinic_id: ids.clinicId,
      scheduled_time: (() => { const d = daysFromNow(7); d.setHours(11, 30, 0, 0); return d; })(),
      status: "scheduled", notes: "6-week progress check.",
      follow_up_source_appointment_id: deepakLast.id,
    },
  });
  // (An already-completed follow-up — Ravi's day-7 visit — was wired above.)
}

/**
 * Enters (or lazily creates) the demo clinic. Ensures the scaffold, seeds the
 * story if the clinic has no content yet, and returns the demo ids so the route
 * can open a session for the owner. Never wipes existing content on entry — an
 * explorer mid-tour keeps their state; use resetDemo() to start over.
 */
export async function enterDemo(): Promise<DemoIds> {
  const ids = await ensureDemoScaffold();
  const hasContent = (await prisma.service.count({ where: { clinic_id: ids.clinicId } })) > 0;
  if (!hasContent) {
    await seedDemoContent(ids);
  }
  return ids;
}

/**
 * One-click reset: wipes the demo clinic's volatile content and rebuilds the
 * original story. The scaffold (owner/org/clinic/doctor ids) is preserved, so
 * the caller's session stays valid. Safe by construction — only ever operates
 * on the is_demo organization.
 */
export async function resetDemo(): Promise<DemoIds> {
  const ids = await ensureDemoScaffold();
  await wipeDemoContent(ids);
  await seedDemoContent(ids);
  return ids;
}
