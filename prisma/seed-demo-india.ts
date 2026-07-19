// Batch E · M3 deliverable — a small, representative, India-centric demo of the
// Professional Edition. Standalone and IDEMPOTENT: it owns one organization
// ("Sunrise Health Network", Pune) and re-seeds only its own rows, so it never
// disturbs the main dev seed (prisma/seed.ts). Run: npx tsx prisma/seed-demo-india.ts
//
// It exercises the whole RBAC model end to end: all six staff roles on one
// clinic, an owner + a practice manager (operational, not legal), real Indian
// patients, a live queue, and a paid invoice.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { generateHealthIdCandidate } from "../src/domain/health-id";

const prisma = new PrismaClient();
const DEV_PASSWORD = "password123";
// Every demo account's phone is a valid E.164 Indian mobile: "+91987650" + a
// 4-digit sequence = "+91" followed by exactly 10 digits (e.g. +919876500001).
const DEMO_PREFIX = "+91987650";

const used = new Set<string>();
function healthId(): string {
  let c = generateHealthIdCandidate();
  while (used.has(c)) c = generateHealthIdCandidate();
  used.add(c);
  return c;
}

async function main() {
  const password_hash = await hashPassword(DEV_PASSWORD);

  // Idempotency: remove any prior run. Deleting the demo users cascades their
  // profiles, memberships, org (owner relation), clinic, and appointments.
  console.log("Cleaning previous India demo…");
  await prisma.user.deleteMany({ where: { phone_number: { startsWith: DEMO_PREFIX } } });

  console.log("Seeding Sunrise Health Network (Pune)…");

  // --- Owner (legal owner + super_admin). Runs the practice; not a clinician. ---
  const owner = await prisma.user.create({
    data: { role: "super_admin", phone_number: `${DEMO_PREFIX}0001`, email: "rajesh.sharma@sunrisehealth.in", password_hash },
  });

  const org = await prisma.organization.create({
    data: {
      name: "Sunrise Health Network",
      address: "Lane 5, Koregaon Park, Pune, Maharashtra 411001",
      contact_email: "care@sunrisehealth.in",
      contact_phone: `${DEMO_PREFIX}0001`,
      timezone: "Asia/Kolkata",
      archetype: "multi_specialty",
      plan: "professional",
      owner_user_id: owner.id,
    },
  });

  const clinic = await prisma.clinic.create({
    data: {
      name: "Sunrise Clinic — Koregaon Park",
      address: "Lane 5, Koregaon Park, Pune, Maharashtra 411001",
      super_admin_id: owner.id,
      organization_id: org.id,
      working_days: "mon,tue,wed,thu,fri,sat",
      opens_at: "09:00",
      closes_at: "20:00",
      default_slot_duration_minutes: 15,
      buffer_minutes: 5,
      max_appointments_per_doctor_per_day: 40,
      default_consultation_fee: 600,
      is_verified: true,
    },
  });

  await prisma.organizationMember.create({ data: { organization_id: org.id, user_id: owner.id, role: "owner" } });

  // --- The five staff roles, each a real credentialed account on this clinic. ---
  async function staff(
    seq: string,
    role: string,
    fullName: string,
    email: string,
    specialty: string | null
  ) {
    const user = await prisma.user.create({
      data: { role, phone_number: `${DEMO_PREFIX}${seq}`, email, password_hash, must_change_password: false },
    });
    const profile = await prisma.staffProfile.create({
      data: {
        user_id: user.id,
        clinic_id: clinic.id,
        full_name: fullName,
        specialty,
        consultation_fee: specialty ? 600 : null,
      },
    });
    await prisma.organizationMember.create({ data: { organization_id: org.id, user_id: user.id, role } });
    return { user, profile };
  }

  const manager = await staff("0002", "practice_manager", "Priya Nair", "priya.nair@sunrisehealth.in", null);

  // --- Six doctors across specialties (a multi-specialty clinic). ---
  const drAnanya = await staff("0003", "doctor", "Dr. Ananya Iyer", "ananya.iyer@sunrisehealth.in", "Cardiologist");
  const drVikram = await staff("0004", "doctor", "Dr. Vikram Reddy", "vikram.reddy@sunrisehealth.in", "General Physician");
  const drArjun = await staff("0008", "doctor", "Dr. Arjun Deshmukh", "arjun.deshmukh@sunrisehealth.in", "Dermatologist");
  const drMeera = await staff("0009", "doctor", "Dr. Meera Krishnan", "meera.krishnan@sunrisehealth.in", "Pediatrician");
  const drSanjay = await staff("0010", "doctor", "Dr. Sanjay Rao", "sanjay.rao@sunrisehealth.in", "Orthopedician");
  const drNeha = await staff("0011", "doctor", "Dr. Neha Kapoor", "neha.kapoor@sunrisehealth.in", "Gynecologist");
  const doctors = [drAnanya, drVikram, drArjun, drMeera, drSanjay, drNeha];

  // --- Three front-desk receptionists. ---
  const reception = await staff("0005", "receptionist", "Sunita Deshpande", "sunita.d@sunrisehealth.in", null);
  await staff("0012", "receptionist", "Anjali Verma", "anjali.verma@sunrisehealth.in", null);
  await staff("0013", "receptionist", "Rahul Sharma", "rahul.sharma@sunrisehealth.in", null);

  // --- Plus a nurse and a lab technician (all six roles represented). ---
  await staff("0006", "nurse", "Kavita Joshi", "kavita.joshi@sunrisehealth.in", null);
  await staff("0007", "technician", "Ramesh Gupta", "ramesh.gupta@sunrisehealth.in", null);

  // Weekly availability for every doctor (Mon–Sat).
  await prisma.doctorAvailability.createMany({
    data: doctors.flatMap((d) =>
      [1, 2, 3, 4, 5, 6].map((day) => ({ doctor_id: d.profile.id, day_of_week: day, start_time: "09:00", end_time: "20:00" }))
    ),
  });

  // --- Patients (real Indian identities). ---
  async function patient(
    seq: string,
    fullName: string,
    dob: string,
    gender: string,
    blood: string,
    opts?: { allergies?: string; chronic?: string }
  ) {
    const user = await prisma.user.create({
      data: { role: "patient", phone_number: `${DEMO_PREFIX}${seq}` },
    });
    const profile = await prisma.patientProfile.create({
      data: {
        user_id: user.id,
        full_name: fullName,
        blood_group: blood,
        date_of_birth: new Date(dob),
        gender,
        allergies: opts?.allergies ?? null,
        chronic_conditions: opts?.chronic ?? null,
        onboarding_completed: true,
        health_id: healthId(),
        verification_level: "phone_verified",
        registered_by_clinic_id: clinic.id,
        contacts: { create: [{ type: "phone", value: `${DEMO_PREFIX}${seq}`, is_primary: true, verified_at: new Date() }] },
      },
    });
    await prisma.accountProfileLink.create({ data: { account_user_id: user.id, healthcare_profile_id: profile.id, is_primary: true } });
    return profile;
  }

  const amit = await patient("0101", "Amit Patel", "1985-08-21", "Male", "B-Positive", {
    allergies: "Penicillin",
    chronic: "Hypertension, Type 2 diabetes",
  });
  const sneha = await patient("0102", "Sneha Kulkarni", "1993-02-11", "Female", "O-Positive", {
    chronic: "Asthma",
  });
  const farooq = await patient("0103", "Mohammed Farooq", "1978-12-03", "Male", "A-Positive");
  const lakshmi = await patient("0104", "Lakshmi Menon", "2001-05-19", "Female", "AB-Positive");
  const rohan = await patient("0105", "Rohan Sharma", "1990-04-14", "Male", "O-Positive");
  const priyaJ = await patient("0106", "Priya Joshi", "1998-09-27", "Female", "B-Positive");
  const aarav = await patient("0107", "Aarav Mehta", "2016-01-30", "Male", "A-Positive");
  const deepa = await patient("0108", "Deepa Nair", "1982-07-08", "Female", "AB-Negative", {
    allergies: "Sulfa drugs",
  });
  const kiran = await patient("0109", "Kiran Rao", "1975-11-19", "Male", "B-Negative");

  // --- Today's live queue across both doctors + one completed visit with a paid invoice. ---
  await prisma.appointment.create({
    data: {
      patient_id: amit.id, doctor_id: drAnanya.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 40 * 60 * 1000), status: "in_consultation", queue_number: 1,
      checked_in_at: new Date(Date.now() - 40 * 60 * 1000), started_at: new Date(Date.now() - 10 * 60 * 1000),
      notes: "Follow-up: blood pressure review.",
      chief_complaint: "Hypertension review",
      vitals_json: JSON.stringify({ bp: "158/98", pulse: "88", temp: "98.6°F", spo2: "98%", weight: "82 kg" }),
    },
  });
  await prisma.appointment.create({
    data: {
      patient_id: sneha.id, doctor_id: drAnanya.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 30 * 60 * 1000), status: "waiting", queue_number: 2,
      checked_in_at: new Date(Date.now() - 26 * 60 * 1000),
    },
  });
  await prisma.appointment.create({
    data: {
      patient_id: lakshmi.id, doctor_id: drVikram.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() + 30 * 60 * 1000), status: "scheduled", walk_in: false,
    },
  });
  // Waiting lane, across doctors, to exercise all three wait-aging tiers.
  await prisma.appointment.create({
    data: {
      patient_id: priyaJ.id, doctor_id: drMeera.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 40 * 60 * 1000), status: "waiting", queue_number: 3,
      checked_in_at: new Date(Date.now() - 33 * 60 * 1000), notes: "Fever & sore throat for 2 days.",
    },
  });
  await prisma.appointment.create({
    data: {
      patient_id: rohan.id, doctor_id: drArjun.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 55 * 60 * 1000), status: "waiting", queue_number: 4, walk_in: true,
      checked_in_at: new Date(Date.now() - 48 * 60 * 1000), notes: "Skin rash review.",
    },
  });
  await prisma.appointment.create({
    data: {
      patient_id: aarav.id, doctor_id: drSanjay.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() + 45 * 60 * 1000), status: "scheduled", walk_in: false,
    },
  });
  // A second in-consultation, with another doctor.
  await prisma.appointment.create({
    data: {
      patient_id: deepa.id, doctor_id: drNeha.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 25 * 60 * 1000), status: "in_consultation", queue_number: 5,
      checked_in_at: new Date(Date.now() - 25 * 60 * 1000), started_at: new Date(Date.now() - 6 * 60 * 1000),
    },
  });
  // A completed visit with an UNPAID invoice — a real "to collect" on the Desk.
  const kiranVisit = await prisma.appointment.create({
    data: {
      patient_id: kiran.id, doctor_id: drArjun.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 60 * 60 * 1000), status: "completed",
      checked_in_at: new Date(Date.now() - 60 * 60 * 1000),
      started_at: new Date(Date.now() - 50 * 60 * 1000),
      completed_at: new Date(Date.now() - 35 * 60 * 1000),
    },
  });
  await prisma.invoice.create({
    data: {
      clinic_id: clinic.id, patient_id: kiran.id, appointment_id: kiranVisit.id,
      invoice_number: "SUN-0002", status: "issued", total: 600,
      items_json: JSON.stringify([
        { description: "Consultation — Dermatologist", qty: 1, unit_price: 600, amount: 600 },
      ]),
    },
  });
  const completed = await prisma.appointment.create({
    data: {
      patient_id: farooq.id, doctor_id: drVikram.profile.id, clinic_id: clinic.id,
      scheduled_time: new Date(Date.now() - 3 * 60 * 60 * 1000), status: "completed",
      checked_in_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 20 * 60 * 1000),
    },
  });

  // A paid invoice for the completed visit (₹600 consult + ₹300 ECG, fully paid).
  const invoice = await prisma.invoice.create({
    data: {
      clinic_id: clinic.id,
      patient_id: farooq.id,
      appointment_id: completed.id,
      invoice_number: "SUN-0001",
      status: "paid",
      total: 900,
      paid_at: new Date(Date.now() - 3 * 60 * 60 * 1000 + 25 * 60 * 1000),
      items_json: JSON.stringify([
        { description: "Consultation — General Physician", qty: 1, unit_price: 600, amount: 600 },
        { description: "ECG", qty: 1, unit_price: 300, amount: 300 },
      ]),
    },
  });
  await prisma.payment.create({
    data: { invoice_id: invoice.id, clinic_id: clinic.id, amount: 900, method: "upi", received_by_user_id: reception.user.id },
  });

  await prisma.auditLog.createMany({
    data: [
      { organization_id: org.id, actor_user_id: owner.id, action: "organization_created", detail: org.name },
      { organization_id: org.id, actor_user_id: owner.id, action: "member_role_assigned", detail: `${manager.profile.full_name} → practice_manager` },
    ],
  });

  console.log("\n✅ India demo seeded — Sunrise Health Network, Pune");
  console.log("   Staff sign in at /login with phone + password123 (enter the 10-digit number; +91 is assumed).");
  console.log("   Owner              9876500001  → /admin");
  console.log("   Practice manager   9876500002  → /admin");
  console.log("   Dr Ananya Iyer     9876500003  → /doctor  (Cardiologist)");
  console.log("   Dr Vikram Reddy    9876500004  → /doctor  (General Physician)");
  console.log("   Dr Arjun Deshmukh  9876500008  → /doctor  (Dermatologist)");
  console.log("   Dr Meera Krishnan  9876500009  → /doctor  (Pediatrician)");
  console.log("   Dr Sanjay Rao      9876500010  → /doctor  (Orthopedician)");
  console.log("   Dr Neha Kapoor     9876500011  → /doctor  (Gynecologist)");
  console.log("   Reception Sunita   9876500005  → /staff");
  console.log("   Reception Anjali   9876500012  → /staff");
  console.log("   Reception Rahul    9876500013  → /staff");
  console.log("   Nurse Kavita       9876500006  → /doctor");
  console.log("   Technician Ramesh  9876500007  → /staff");
  console.log("   Patients (OTP, dev echo): 9876500101 Amit · 0102 Sneha · 0103 Farooq · 0104 Lakshmi → /patient");
  console.log(`   (stored E.164 example: ${reception.user.phone_number})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
