import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';
import { generateHealthIdCandidate } from '../src/domain/health-id';
import { SPRINGFIELD_BASE_LAT, SPRINGFIELD_BASE_LNG } from '../src/shared/areas';

const prisma = new PrismaClient();

// APS-040: every seeded B2B account gets this credential (matches the dev
// prefill in src/app/login/page.tsx). Patients stay OTP-only (no hash).
const DEV_PASSWORD = 'password123';

// Small fixed set being seeded — a plain in-memory dedupe is enough (the
// real collision-retry loop lives in src/services/patient-service.ts and is
// used by every runtime code path).
const usedHealthIds = new Set<string>();
function nextHealthId(): string {
  let candidate = generateHealthIdCandidate();
  while (usedHealthIds.has(candidate)) candidate = generateHealthIdCandidate();
  usedHealthIds.add(candidate);
  return candidate;
}

async function main() {
  console.log('Cleaning database...');
  // APS-036: Release rows FK-reference User (created_by_user_id) — must be
  // cleared before Users, same as every other user-referencing table below.
  // ReleaseHighlight/ReleaseView cascade-delete with their parent Release.
  await prisma.release.deleteMany({});
  await prisma.sprint.deleteMany({});
  await prisma.accountProfileLink.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.doctorAvailability.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.patientProfile.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.clinic.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding initial data...');
  const password_hash = await hashPassword(DEV_PASSWORD);

  // 1. Create Super Admin User
  const adminUser = await prisma.user.create({
    data: {
      role: 'super_admin',
      phone_number: '+15550100000',
      email: 'admin@aegiscare.com',
      password_hash,
    },
  });

  // 2. Create the Organization (Sprint 3 / OPS-001) and its two clinics —
  // a real multi-clinic organization, not two separate single-clinic orgs
  // owned by the same person. Demonstrates + tests exactly what Sprint 3's
  // acceptance workflow asks for: one org, two branches, independent
  // schedules/policies, isolated queues.
  const org = await prisma.organization.create({
    data: {
      name: 'Aegis Healthcare Group',
      address: '742 Evergreen Terrace, Springfield',
      contact_email: 'admin@aegiscare.com',
      contact_phone: '+15550100000',
      timezone: 'Asia/Kolkata',
      owner_user_id: adminUser.id,
    },
  });

  const clinicA = await prisma.clinic.create({
    data: {
      name: 'Aegis Family Clinic',
      address: '742 Evergreen Terrace, Springfield',
      super_admin_id: adminUser.id,
      organization_id: org.id,
      working_days: 'mon,tue,wed,thu,fri,sat',
      opens_at: '09:00',
      closes_at: '18:00',
      default_slot_duration_minutes: 15,
      buffer_minutes: 5,
      max_appointments_per_doctor_per_day: 40,
      default_consultation_fee: 500,
      is_verified: true,
      latitude: SPRINGFIELD_BASE_LAT,
      longitude: SPRINGFIELD_BASE_LNG,
    },
  });

  const clinicB = await prisma.clinic.create({
    data: {
      name: 'Summit Medical Center',
      address: '100 Pinnacle Way, Suite 400',
      super_admin_id: adminUser.id,
      organization_id: org.id,
      working_days: 'mon,tue,wed,thu,fri',
      opens_at: '10:00',
      closes_at: '19:00',
      default_slot_duration_minutes: 20,
      buffer_minutes: 0,
      max_appointments_per_doctor_per_day: 30,
      default_consultation_fee: 700,
      is_verified: true,
      latitude: SPRINGFIELD_BASE_LAT + 0.009,
      longitude: SPRINGFIELD_BASE_LNG + 0.011,
    },
  });

  // 3. Create Doctors & Staff Users & Profiles
  const doctorUser1 = await prisma.user.create({
    data: {
      role: 'doctor',
      phone_number: '+15550101111',
      email: 'dr.smith@aegiscare.com',
      password_hash,
    },
  });

  const doc1 = await prisma.staffProfile.create({
    data: {
      user_id: doctorUser1.id,
      clinic_id: clinicA.id,
      specialty: 'Cardiologist',
      full_name: 'Dr. Sarah Smith',
    },
  });

  const doctorUser2 = await prisma.user.create({
    data: {
      role: 'doctor',
      phone_number: '+15550102222',
      email: 'dr.jones@summit.com',
      password_hash,
    },
  });

  const doc2 = await prisma.staffProfile.create({
    data: {
      user_id: doctorUser2.id,
      clinic_id: clinicB.id,
      specialty: 'Pediatrician',
      full_name: 'Dr. Michael Jones',
    },
  });

  const doctorUser3 = await prisma.user.create({
    data: {
      role: 'doctor',
      phone_number: '+15550103333',
      email: 'dr.patel@aegiscare.com',
      password_hash,
    },
  });

  const doc3 = await prisma.staffProfile.create({
    data: {
      user_id: doctorUser3.id,
      clinic_id: clinicA.id,
      specialty: 'General Practitioner',
      full_name: 'Dr. Elena Patel',
    },
  });

  const receptionistUser = await prisma.user.create({
    data: {
      role: 'receptionist',
      phone_number: '+15550104444',
      email: 'staff@aegiscare.com',
      password_hash,
    },
  });

  await prisma.staffProfile.create({
    data: {
      user_id: receptionistUser.id,
      clinic_id: clinicA.id,
      specialty: null,
      full_name: 'Nina Torres',
    },
  });

  // 3b. Organization memberships (APS-040, retargeted onto the real
  // Organization in Sprint 3): the role a person holds inside the
  // organization — one org, everyone's membership points at org.id now.
  await prisma.organizationMember.createMany({
    data: [
      { organization_id: org.id, user_id: adminUser.id, role: 'owner' },
      { organization_id: org.id, user_id: doctorUser1.id, role: 'doctor' },
      { organization_id: org.id, user_id: doctorUser2.id, role: 'doctor' },
      { organization_id: org.id, user_id: doctorUser3.id, role: 'doctor' },
      { organization_id: org.id, user_id: receptionistUser.id, role: 'receptionist' },
    ],
  });

  // 3c. Departments (Sprint 3) — one org-wide, one clinic-specific, to show
  // both scopes work. Dr. Smith heads Cardiology; doctors get assigned.
  const cardiology = await prisma.department.create({
    data: {
      organization_id: org.id,
      clinic_id: clinicA.id,
      name: 'Cardiology',
      default_consultation_fee: 600,
    },
  });
  const generalMedicine = await prisma.department.create({
    data: {
      organization_id: org.id,
      clinic_id: null, // org-wide department — spans both branches
      name: 'General Medicine',
      default_consultation_fee: 500,
    },
  });
  await prisma.department.update({
    where: { id: cardiology.id },
    data: { head_staff_id: doc1.id },
  });
  await prisma.staffProfile.update({ where: { id: doc1.id }, data: { department_id: cardiology.id } });
  await prisma.staffProfile.update({ where: { id: doc3.id }, data: { department_id: generalMedicine.id } });

  // 3d. Doctor weekly availability (Sprint 3) — real working hours, not a
  // "coming soon" placeholder. Mon-Fri 09:00-13:00 and 14:00-17:00 for the
  // two clinic-A doctors; Mon/Wed/Fri for the pediatrician at Summit.
  await prisma.doctorAvailability.createMany({
    data: [
      ...[1, 2, 3, 4, 5].map((day) => ({
        doctor_id: doc1.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
      })),
      ...[1, 2, 3, 4, 5, 6].map((day) => ({
        doctor_id: doc3.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
      })),
      ...[1, 3, 5].map((day) => ({
        doctor_id: doc2.id,
        day_of_week: day,
        start_time: '10:00',
        end_time: '16:00',
      })),
    ],
  });

  // 3e. A couple of audit log entries so Administration has something real
  // to show on day one, not an empty state forever.
  await prisma.auditLog.createMany({
    data: [
      { organization_id: org.id, actor_user_id: adminUser.id, action: 'organization_created', detail: org.name },
      { organization_id: org.id, actor_user_id: adminUser.id, action: 'clinic_created', detail: clinicB.name },
    ],
  });

  // 4. Create Patients & Patient Profiles (APS-029/010: each gets a
  // health_id + a real phone_verified Contact + the AccountProfileLink
  // backfill a real migration would run — see Part II §12).
  const patientUser1 = await prisma.user.create({
    data: {
      role: 'patient',
      phone_number: '+15550199999', // Main test user for OTP flow
      email: 'alex.rivera@gmail.com',
    },
  });

  const patient1 = await prisma.patientProfile.create({
    data: {
      user_id: patientUser1.id,
      full_name: 'Alex Rivera',
      blood_group: 'O-Positive',
      date_of_birth: new Date('1992-03-14'),
      gender: 'Male',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'phone_verified',
      contacts: {
        create: [{ type: 'phone', value: patientUser1.phone_number, is_primary: true, verified_at: new Date() }],
      },
    },
  });
  await prisma.accountProfileLink.create({
    data: { account_user_id: patientUser1.id, healthcare_profile_id: patient1.id, is_primary: true },
  });

  // Family-phone-sharing fixture (APS-029 Part I A1 / Part II §1): Alex's
  // daughter, registered by reception, sharing Alex's phone number as her
  // Contact — but with NO Auriva Account of her own (user_id null). This is
  // the exact case that was structurally impossible before this sprint, and
  // the one the OTP-login profile picker (Phase 4) exists to handle: logging
  // in with +15550199999 must offer a choice between Alex and Priya.
  const priyaProfile = await prisma.patientProfile.create({
    data: {
      full_name: 'Priya Rivera',
      blood_group: 'O-Positive',
      date_of_birth: new Date('2015-06-01'),
      gender: 'Female',
      guardian_name: 'Alex Rivera',
      guardian_relation: 'Father',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'unverified',
      registered_by_clinic_id: clinicA.id,
      contacts: {
        create: [{ type: 'phone', value: patientUser1.phone_number, is_primary: true }],
      },
    },
  });

  const patientUser2 = await prisma.user.create({
    data: {
      role: 'patient',
      phone_number: '+15550188888',
      email: 'jordan.lee@gmail.com',
    },
  });

  const patient2 = await prisma.patientProfile.create({
    data: {
      user_id: patientUser2.id,
      full_name: 'Jordan Lee',
      blood_group: 'A-Negative',
      date_of_birth: new Date('1988-11-02'),
      gender: 'Non-binary',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'phone_verified',
      contacts: {
        create: [{ type: 'phone', value: patientUser2.phone_number, is_primary: true, verified_at: new Date() }],
      },
    },
  });
  await prisma.accountProfileLink.create({
    data: { account_user_id: patientUser2.id, healthcare_profile_id: patient2.id, is_primary: true },
  });

  const patientUser3 = await prisma.user.create({
    data: {
      role: 'patient',
      phone_number: '+15550177777',
      email: 'sam.okafor@gmail.com',
    },
  });

  const patient3 = await prisma.patientProfile.create({
    data: {
      user_id: patientUser3.id,
      full_name: 'Sam Okafor',
      blood_group: 'O-Negative',
      date_of_birth: new Date('1997-07-22'),
      gender: 'Male',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'phone_verified',
      contacts: {
        create: [{ type: 'phone', value: patientUser3.phone_number, is_primary: true, verified_at: new Date() }],
      },
    },
  });
  await prisma.accountProfileLink.create({
    data: { account_user_id: patientUser3.id, healthcare_profile_id: patient3.id, is_primary: true },
  });

  // Find Care ratings/reviews — a small, honest set of real reviews on the
  // three doctors most visible in the seeded demo (Aegis/Summit), not padded
  // to look like a high-traffic marketplace. Doctors with no review below
  // show Find Care's real "No reviews yet" empty state instead.
  await prisma.review.createMany({
    data: [
      { doctor_id: doc1.id, patient_id: patient1.id, rating: 5, comment: 'Very thorough and explains everything clearly.' },
      { doctor_id: doc1.id, patient_id: patient2.id, rating: 5, comment: 'Caught an issue my last cardiologist missed.' },
      { doctor_id: doc1.id, patient_id: patient3.id, rating: 4, comment: 'Great doctor, a bit of a wait at the clinic.' },
      { doctor_id: doc2.id, patient_id: patient1.id, rating: 5, comment: 'Wonderful with kids, my daughter actually looks forward to visits.' },
      { doctor_id: doc2.id, patient_id: patient2.id, rating: 4, comment: 'Knowledgeable and patient.' },
      { doctor_id: doc3.id, patient_id: patient2.id, rating: 5, comment: 'Always on time and easy to talk to.' },
      { doctor_id: doc3.id, patient_id: patient3.id, rating: 4, comment: 'Solid general checkup, would return.' },
    ],
  });

  // 5. Create Appointments
  // Priya's own upcoming visit — proves the shared-phone profile is a real,
  // independent clinical identity, not just a login-picker decoration.
  await prisma.appointment.create({
    data: {
      patient_id: priyaProfile.id,
      doctor_id: doc3.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      status: 'scheduled',
      notes: 'Annual pediatric check-up',
    },
  });

  // Past completed appointment (Patient 1's history)
  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_id: doc1.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'completed',
      checked_in_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
    },
  });

  // Upcoming scheduled appointments for Patient 1
  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_id: doc3.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 2 days and 4 hours from now
      status: 'scheduled',
    },
  });

  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_id: doc2.id,
      clinic_id: clinicB.id,
      scheduled_time: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      status: 'scheduled',
    },
  });

  // --- Today's live queue, spread across both clinics and every doctor so the
  // reception dashboard, queue board and doctor console all have a realistic,
  // non-empty pipeline to demo out of the box. ---

  // Clinic A · Dr. Elena Patel (GP) — full pipeline: completed -> waiting -> checked-in -> doctor-ready
  await prisma.appointment.create({
    data: {
      patient_id: patient2.id,
      doctor_id: doc3.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
      status: 'completed',
      queue_number: 1,
      checked_in_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 100 * 60 * 1000),
      completed_at: new Date(Date.now() - 90 * 60 * 1000),
    },
  });

  await prisma.appointment.create({
    data: {
      patient_id: patient3.id,
      doctor_id: doc3.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      status: 'waiting',
      queue_number: 2,
      checked_in_at: new Date(Date.now() - 20 * 60 * 1000),
    },
  });

  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_id: doc3.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() + 20 * 60 * 1000), // in 20 min
      status: 'scheduled',
    },
  });

  // Clinic A · Dr. Sarah Smith (Cardiologist) — a walk-in currently in consultation
  await prisma.appointment.create({
    data: {
      patient_id: patient2.id,
      doctor_id: doc1.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 40 * 60 * 1000),
      status: 'in_consultation',
      queue_number: 1,
      walk_in: true,
      checked_in_at: new Date(Date.now() - 40 * 60 * 1000),
      started_at: new Date(Date.now() - 10 * 60 * 1000),
      notes: 'Walk-in: intermittent chest discomfort, follow-up ECG requested.',
    },
  });

  await prisma.appointment.create({
    data: {
      patient_id: patient3.id,
      doctor_id: doc1.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 5 * 60 * 1000),
      status: 'doctor_ready',
      queue_number: 2,
      checked_in_at: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  // Clinic B · Dr. Michael Jones (Pediatrician) — one in consultation, one later today
  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_id: doc2.id,
      clinic_id: clinicB.id,
      scheduled_time: new Date(Date.now() - 25 * 60 * 1000),
      status: 'in_consultation',
      queue_number: 1,
      checked_in_at: new Date(Date.now() - 25 * 60 * 1000),
      started_at: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  await prisma.appointment.create({
    data: {
      patient_id: patient3.id,
      doctor_id: doc2.id,
      clinic_id: clinicB.id,
      scheduled_time: new Date(Date.now() + 3 * 60 * 60 * 1000), // in 3 hours
      status: 'scheduled',
    },
  });

  // Update Aegis Healthcare Group with multi-specialty archetype
  await prisma.organization.update({
    where: { id: org.id },
    data: { archetype: 'multi_specialty' },
  });

  const orgsToSeed = [
    // Independent Clinic (3)
    {
      archetype: 'independent_clinic',
      orgName: 'Aura Dental Care',
      clinicName: 'Aura Dental Center',
      address: '15 Pine Street, Springfield',
      specialty: 'Dentist',
      docName: 'Dr. Alan Turing',
      email: 'dr.turing@auradental.com',
      phone: '+15550200001',
      patientName: 'Sarah Connor',
      patientPhone: '+15550201001',
      patientEmail: 'sarah.connor@sky.net',
    },
    {
      archetype: 'independent_clinic',
      orgName: 'Grace Pediatrics',
      clinicName: 'Grace Kids Clinic',
      address: '82 Oak Road, Springfield',
      specialty: 'Pediatrician',
      docName: 'Dr. Ada Lovelace',
      email: 'dr.lovelace@gracepeds.com',
      phone: '+15550200002',
      patientName: 'John Connor',
      patientPhone: '+15550201002',
      patientEmail: 'john.connor@sky.net',
    },
    {
      archetype: 'independent_clinic',
      orgName: 'Springfield Eye Clinic',
      clinicName: 'Springfield Optometry',
      address: '404 Elm Lane, Springfield',
      specialty: 'Ophthalmologist',
      docName: 'Dr. Grace Hopper',
      email: 'dr.hopper@eyeclinic.com',
      phone: '+15550200003',
      patientName: 'Marcus Wright',
      patientPhone: '+15550201003',
      patientEmail: 'marcus@sky.net',
    },
    // Multi-specialty Clinic (2 more, Aegis is the 1st)
    {
      archetype: 'multi_specialty',
      orgName: 'Springfield Clinic East',
      clinicName: 'Springfield Medical East',
      address: '100 Maple St, Springfield',
      specialty: 'General Practitioner',
      docName: 'Dr. Richard Feynman',
      email: 'dr.feynman@cliniceast.com',
      phone: '+15550200004',
      patientName: 'Peter Parker',
      patientPhone: '+15550201004',
      patientEmail: 'peter.parker@dailybugle.com',
    },
    {
      archetype: 'multi_specialty',
      orgName: 'Metro Health Group',
      clinicName: 'Metro Specialty Clinic',
      address: '250 Birch Blvd, Springfield',
      specialty: 'Cardiologist',
      docName: 'Dr. Marie Curie',
      email: 'dr.curie@metrohealth.com',
      phone: '+15550200005',
      patientName: 'Bruce Banner',
      patientPhone: '+15550201005',
      patientEmail: 'bruce.banner@avengers.org',
    },
    // Hospital (3)
    {
      archetype: 'hospital',
      orgName: 'Springfield General Hospital',
      clinicName: 'General Hospital ER',
      address: '500 Hospital Plaza, Springfield',
      specialty: 'General Practitioner',
      docName: 'Dr. Jonas Salk',
      email: 'dr.salk@generalhosp.com',
      phone: '+15550200006',
      patientName: 'Tony Stark',
      patientPhone: '+15550201006',
      patientEmail: 'tony.stark@starkindustries.com',
    },
    {
      archetype: 'hospital',
      orgName: 'St. Jude Children Hospital',
      clinicName: 'St. Jude Pediatric Ward',
      address: '700 Hope Ave, Springfield',
      specialty: 'Pediatrician',
      docName: 'Dr. Alexander Fleming',
      email: 'dr.fleming@stjude.org',
      phone: '+15550200007',
      patientName: 'Peter Quill',
      patientPhone: '+15550201007',
      patientEmail: 'star.lord@guardians.galaxy',
    },
    {
      archetype: 'hospital',
      orgName: 'Mercy Health Center',
      clinicName: 'Mercy Critical Care',
      address: '300 Mercy Way, Springfield',
      specialty: 'Cardiologist',
      docName: 'Dr. Louis Pasteur',
      email: 'dr.pasteur@mercyhealth.com',
      phone: '+15550200008',
      patientName: 'Steve Rogers',
      patientPhone: '+15550201008',
      patientEmail: 'cap@shield.gov',
    },
    // Diagnostic Center (3)
    {
      archetype: 'diagnostic_center',
      orgName: 'ClearView Scan Center',
      clinicName: 'ClearView Imaging Lab',
      address: '110 Discovery Rd, Springfield',
      specialty: 'Radiologist',
      docName: 'Dr. Rosalind Franklin',
      email: 'dr.franklin@clearview.com',
      phone: '+15550200009',
      patientName: 'Natasha Romanoff',
      patientPhone: '+15550201009',
      patientEmail: 'black.widow@shield.gov',
    },
    {
      archetype: 'diagnostic_center',
      orgName: 'Apex Labs & Diagnostics',
      clinicName: 'Apex Diagnostic Center',
      address: '220 Innovation Dr, Springfield',
      specialty: 'Pathologist',
      docName: 'Dr. Linus Pauling',
      email: 'dr.pauling@apexlabs.com',
      phone: '+15550200010',
      patientName: 'Clint Barton',
      patientPhone: '+15550201010',
      patientEmail: 'hawkeye@avengers.org',
    },
    {
      archetype: 'diagnostic_center',
      orgName: 'Quest Health Labs',
      clinicName: 'Quest Pathology Lab',
      address: '330 Science Park, Springfield',
      specialty: 'Pathologist',
      docName: 'Dr. George Carver',
      email: 'dr.carver@questlabs.com',
      phone: '+15550200011',
      patientName: 'Wanda Maximoff',
      patientPhone: '+15550201011',
      patientEmail: 'scarlet.witch@avengers.org',
    },
    // Pharmacy Chain (3)
    {
      archetype: 'pharmacy_chain',
      orgName: 'Aegis Pharmacy Group',
      clinicName: 'Aegis Pharmacy Main',
      address: '900 Commercial St, Springfield',
      specialty: 'Pharmacist',
      docName: 'Dr. Robert Boyle',
      email: 'dr.boyle@aegisrx.com',
      phone: '+15550200012',
      patientName: 'Vision',
      patientPhone: '+15550201012',
      patientEmail: 'vision@avengers.org',
    },
    {
      archetype: 'pharmacy_chain',
      orgName: 'Wellness Pharmacy',
      clinicName: 'Wellness Rx North',
      address: '950 Health Ave, Springfield',
      specialty: 'Pharmacist',
      docName: 'Dr. John Dalton',
      email: 'dr.dalton@wellnessrx.com',
      phone: '+15550200013',
      patientName: 'Sam Wilson',
      patientPhone: '+15550201013',
      patientEmail: 'falcon@avengers.org',
    },
    {
      archetype: 'pharmacy_chain',
      orgName: 'Springfield Apothecary',
      clinicName: 'Apothecary Plaza',
      address: '990 Market Sq, Springfield',
      specialty: 'Pharmacist',
      docName: 'Dr. Antoine Lavoisier',
      email: 'dr.lavoisier@apothecary.com',
      phone: '+15550200014',
      patientName: 'Bucky Barnes',
      patientPhone: '+15550201014',
      patientEmail: 'winter.soldier@avengers.org',
    },
    // Day Care Center (3)
    {
      archetype: 'day_care',
      orgName: 'Sunshine Pediatric Therapy',
      clinicName: 'Sunshine Therapy Center',
      address: '10 Activity Way, Springfield',
      specialty: 'Physiotherapist',
      docName: 'Dr. Phoebe Buffay',
      email: 'dr.buffay@sunshinetherapy.com',
      phone: '+15550200015',
      patientName: 'Tchalla',
      patientPhone: '+15550201015',
      patientEmail: 'panther@wakanda.gov',
    },
    {
      archetype: 'day_care',
      orgName: 'Mindful Therapy Day Care',
      clinicName: 'Mindful Support Center',
      address: '20 Serenity Lane, Springfield',
      specialty: 'Psychotherapist',
      docName: 'Dr. Mike Hannigan',
      email: 'dr.hannigan@mindfulcare.com',
      phone: '+15550200016',
      patientName: 'Carol Danvers',
      patientPhone: '+15550201016',
      patientEmail: 'marvel@avengers.org',
    },
    {
      archetype: 'day_care',
      orgName: 'Springfield Senior Day Care',
      clinicName: 'Senior Living Care',
      address: '30 Golden Years Rd, Springfield',
      specialty: 'Geriatrician',
      docName: 'Dr. Gunther Central',
      email: 'dr.gunther@seniorliving.com',
      phone: '+15550200017',
      patientName: 'Scott Lang',
      patientPhone: '+15550201017',
      patientEmail: 'antman@pym.labs',
    },
  ];

  console.log(`Seeding ${orgsToSeed.length} additional organizations...`);

  for (const [index, item] of orgsToSeed.entries()) {
    const ownerEmail = `owner.${item.email.split('@')[0]}@aegiscare.com`;
    const ownerPhone = item.phone.replace('0200', '0299');

    // Create Owner User
    const ownerUser = await prisma.user.create({
      data: {
        role: 'super_admin',
        phone_number: ownerPhone,
        email: ownerEmail,
        password_hash,
      },
    });

    // Create Organization
    const newOrg = await prisma.organization.create({
      data: {
        name: item.orgName,
        address: item.address,
        contact_email: ownerEmail,
        contact_phone: ownerPhone,
        timezone: 'Asia/Kolkata',
        archetype: item.archetype,
        owner_user_id: ownerUser.id,
      },
    });

    // Create Clinic
    // Geo/verified: deterministic per-index scatter around the same
    // fictional Springfield base point every other seeded clinic uses (not
    // random — index 3/6/9/... are left unverified so Find Care shows a mix,
    // matching this file's existing literal/deterministic convention).
    const newClinic = await prisma.clinic.create({
      data: {
        name: item.clinicName,
        address: item.address,
        super_admin_id: ownerUser.id,
        organization_id: newOrg.id,
        opens_at: '09:00',
        closes_at: '18:00',
        default_slot_duration_minutes: 15,
        buffer_minutes: 5,
        max_appointments_per_doctor_per_day: 40,
        default_consultation_fee: 500,
        is_verified: (index + 1) % 3 !== 0,
        latitude: SPRINGFIELD_BASE_LAT + (index % 5) * 0.006 - 0.012,
        longitude: SPRINGFIELD_BASE_LNG + (Math.floor(index / 5)) * 0.007 - 0.007,
      },
    });

    // Create Doctor User
    const docUser = await prisma.user.create({
      data: {
        role: 'doctor',
        phone_number: item.phone,
        email: item.email,
        password_hash,
      },
    });

    // Create Doctor Profile
    const docProfile = await prisma.staffProfile.create({
      data: {
        user_id: docUser.id,
        clinic_id: newClinic.id,
        specialty: item.specialty,
        full_name: item.docName,
        consultation_fee: 500,
      },
    });

    // Add memberships
    await prisma.organizationMember.createMany({
      data: [
        { organization_id: newOrg.id, user_id: ownerUser.id, role: 'owner' },
        { organization_id: newOrg.id, user_id: docUser.id, role: 'doctor' },
      ],
    });

    // Create Doctor Availability
    await prisma.doctorAvailability.createMany({
      data: [1, 2, 3, 4, 5].map((day) => ({
        doctor_id: docProfile.id,
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
      })),
    });

    // Create Patient User
    const patUser = await prisma.user.create({
      data: {
        role: 'patient',
        phone_number: item.patientPhone,
        email: item.patientEmail,
      },
    });

    // Create Patient Profile
    const patProfile = await prisma.patientProfile.create({
      data: {
        user_id: patUser.id,
        full_name: item.patientName,
        blood_group: 'A-Positive',
        date_of_birth: new Date('1990-01-01'),
        gender: 'Male',
        onboarding_completed: true,
        health_id: nextHealthId(),
        verification_level: 'phone_verified',
        contacts: {
          create: [{ type: 'phone', value: item.patientPhone, is_primary: true, verified_at: new Date() }],
        },
      },
    });

    // Link Patient Profile to Patient Account
    await prisma.accountProfileLink.create({
      data: { account_user_id: patUser.id, healthcare_profile_id: patProfile.id, is_primary: true },
    });

    // Create Completed Appointment (Past)
    await prisma.appointment.create({
      data: {
        patient_id: patProfile.id,
        doctor_id: docProfile.id,
        clinic_id: newClinic.id,
        scheduled_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'completed',
        checked_in_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
        completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
      },
    });

    // Create In Consultation Appointment (Live Today)
    await prisma.appointment.create({
      data: {
        patient_id: patProfile.id,
        doctor_id: docProfile.id,
        clinic_id: newClinic.id,
        scheduled_time: new Date(),
        status: 'in_consultation',
        queue_number: 1,
        checked_in_at: new Date(Date.now() - 30 * 60 * 1000),
        started_at: new Date(Date.now() - 10 * 60 * 1000),
      },
    });

    // Create Scheduled Appointment (Future)
    await prisma.appointment.create({
      data: {
        patient_id: patProfile.id,
        doctor_id: docProfile.id,
        clinic_id: newClinic.id,
        scheduled_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
      },
    });
  }

  // APS-036: a dedicated Auriva-platform-staff account — deliberately NOT
  // an owner of any seeded Organization. `super_admin` role gets it past
  // the outer /admin layout guard; `is_platform_admin: true` is the actual
  // capability check for /admin/releases (see that route's layout.tsx and
  // the field's comment on the User model). A clinic-owner super_admin
  // (like adminUser above) must NOT have this flag — that's the whole
  // point of the two being separate.
  console.log('Seeding platform admin + release history...');
  const platformAdmin = await prisma.user.create({
    data: {
      role: 'super_admin',
      phone_number: '+15559990000',
      email: 'platform@auriva.com',
      password_hash,
      is_platform_admin: true,
    },
  });

  await prisma.sprint.create({
    data: {
      number: 36,
      goal: 'Ship the Release Management platform (APS-036): Release/Sprint registry, What\'s New, Admin Release Console.',
      start_date: new Date('2026-07-06'),
      end_date: new Date('2026-07-06'),
      aps_items: JSON.stringify(['APS-036']),
    },
  });

  await prisma.release.create({
    data: {
      version: '0.2.0',
      name: 'Design System & Release Management',
      status: 'published',
      release_date: new Date('2026-07-06'),
      published_at: new Date('2026-07-06'),
      summary:
        'Consistent design tokens across the Doctor and Patient workspaces, and a real Release Management platform for tracking what ships.',
      public_notes:
        '## What changed\n\nWorkspace status colors (warning/success/info) are now consistent across light and dark mode — a red or amber that read differently at night was a patient-safety risk, not a cosmetic one.\n\nThis release also introduces the **What\'s New** panel you\'re reading right now, backed by a real Release Registry instead of a changelog nobody maintains.',
      aps_items: JSON.stringify(['APS-031', 'APS-036']),
      sprint_numbers: JSON.stringify([36]),
      created_by_user_id: platformAdmin.id,
      highlights: {
        create: [
          {
            category: 'feature',
            title: "What's New panel",
            description: 'See release history without leaving your workspace.',
            sort_order: 0,
          },
          {
            category: 'enhancement',
            title: 'Consistent status colors in dark mode',
            description: 'Warning/success/info tokens now read the same regardless of theme.',
            sort_order: 1,
          },
        ],
      },
    },
  });

  await prisma.release.create({
    data: {
      version: '0.3.0',
      name: 'Notification Delivery (planned)',
      status: 'draft',
      summary: 'Real appointment reminders — drafted here ahead of scoping, not yet built.',
      public_notes: '_Drafted for planning purposes — not yet released._',
      created_by_user_id: platformAdmin.id,
    },
  });

  await prisma.sprint.create({
    data: {
      number: 37,
      goal: 'Release 1.1 Sprint 1 — security & quality foundation: close the 7 unauthenticated routes (SEC-1), wire up the doctor-workspace guard (SEC-2), add auth rate-limiting (SEC-5), stand up the first test framework and status-machine regression suite (TEST-1/TEST-2), and the first CI pipeline (INF-4).',
      start_date: new Date('2026-07-06'),
      end_date: new Date('2026-07-06'),
      aps_items: JSON.stringify(['SEC-1', 'SEC-2', 'SEC-5', 'TEST-1', 'TEST-2', 'INF-4']),
      notes:
        'Lint is wired into CI but non-blocking for now — ~34 pre-existing violations across ~20 files predate this sprint and are out of its locked scope (tracked separately as APS-035 TD-6/DS-1).',
    },
  });

  await prisma.release.create({
    data: {
      version: '0.4.0',
      name: 'Release 1.1 — Security & Quality Foundation (Sprint 1)',
      status: 'published',
      release_date: new Date('2026-07-06'),
      published_at: new Date('2026-07-06'),
      summary:
        'Closes every unauthenticated API route, adds login/OTP rate-limiting, and gives the platform its first automated test suite and CI pipeline.',
      public_notes:
        '## Security\n\nSeven API routes that had no sign-in requirement at all — appointment booking/lookup, the doctor directory and profile editor, doctor availability, and patient profile/onboarding — now correctly require a signed-in session scoped to the right patient, doctor, or clinic. Login, OTP send, and OTP verify are now rate-limited against repeated-attempt abuse.\n\n## Quality\n\nThe platform now has an automated test suite covering every status-machine choke point (appointments, invoices, lab orders, releases) and a CI pipeline that runs it — plus typecheck and a production build — on every change.',
      internal_notes:
        'SEC-1/SEC-2 landed together (same route surface, see docs/technical-debt.md M3). SEC-3 (real OTP provider) and SEC-4 (staff password reset) remain open — SEC-5 rate-limits the existing hardcoded-OTP flow but does not replace it. Rate limiting is in-memory/single-instance (see src/lib/rate-limit.ts) — revisit if the platform ever runs more than one instance.',
      migration_notes:
        'No schema changes. Behavioral/breaking change: the 7 routes listed above now reject requests without a valid session — any caller other than this app\'s own authenticated UI (a script, a direct API integration) will start receiving 401/403 where it previously got data.',
      known_issues:
        'GET /api/doctors intentionally remains a cross-clinic directory (patients browse every doctor on the platform to book) — it now requires sign-in but still exposes each doctor\'s email/phone to any authenticated caller. Tracked as follow-up field-level exposure work, not part of this sprint.',
      aps_items: JSON.stringify(['SEC-1', 'SEC-2', 'SEC-5', 'TEST-1', 'TEST-2', 'INF-4']),
      sprint_numbers: JSON.stringify([37]),
      created_by_user_id: platformAdmin.id,
      highlights: {
        create: [
          {
            category: 'fix',
            title: 'Closed 7 unauthenticated API routes',
            description:
              'Appointments, the doctor directory/profile/availability, and patient profile/onboarding now require the right session.',
            sort_order: 0,
          },
          {
            category: 'fix',
            title: 'Login and OTP rate-limiting',
            description: 'Repeated sign-in or OTP attempts are now throttled per account and per IP.',
            sort_order: 1,
          },
          {
            category: 'feature',
            title: 'Automated test suite',
            description: 'Every appointment/invoice/lab-order/release status transition is now regression-tested.',
            sort_order: 2,
          },
          {
            category: 'feature',
            title: 'Continuous integration',
            description: 'Every push now runs the test suite, a typecheck, and a production build automatically.',
            sort_order: 3,
          },
        ],
      },
    },
  });

  await prisma.sprint.create({
    data: {
      number: 38,
      goal: 'Release 1.1 Sprint 2 — observability & operational foundation: structured logging with redaction and correlation IDs (OBS-1), standardized error envelopes (OBS-2), extended audit trail (OBS-3), API regression tests (TEST-3), health/readiness endpoints (INF-5), and operational documentation (DOC-1).',
      start_date: new Date('2026-07-06'),
      end_date: new Date('2026-07-06'),
      aps_items: JSON.stringify(['OBS-1', 'OBS-2', 'OBS-3', 'TEST-3', 'INF-5', 'DOC-1']),
      notes:
        'Audit coverage for self-registered (no registering clinic) patients remains a documented gap — Audit_Logs.organization_id is NOT NULL and cannot honestly be resolved for that population without a schema change, out of this sprint\'s "extend, don\'t redesign" scope. Correlation IDs adopted on the 4 auth routes only, not all ~55 routes — same one-line wrap, deferred for footprint reasons.',
    },
  });

  await prisma.release.create({
    data: {
      version: '0.5.0',
      name: 'Release 1.1 — Observability & Operational Foundation (Sprint 2)',
      status: 'published',
      release_date: new Date('2026-07-06'),
      published_at: new Date('2026-07-06'),
      summary:
        'Structured logging, standardized error responses, a deeper audit trail, health/readiness endpoints, and the platform\'s first API-level regression tests.',
      public_notes:
        '## Reliability\n\nEvery API error response now follows one consistent shape. The platform now has `/api/health` and `/api/ready` endpoints so its operators (and, soon, automated monitoring) can tell at a glance whether it\'s running and able to serve requests.\n\n## Trust\n\nSign-in, sign-out, profile edits (patient and doctor), and onboarding completion now leave an audit record — extending the existing trail that already covered appointment cancellations and invoice payments.',
      internal_notes:
        'Logger extended (debug level, structured JSON lines, automatic redaction of sensitive fields, AsyncLocalStorage-based request correlation) — still zero new dependencies, still swappable for pino/OTel later per its own header comment. mapDomainError() gained EventNotFoundError/EventHandlerNotFoundError, removing the last 2 routes with local instanceof-chains. Audit writes go through the same Audit_Logs table Sprint 3 introduced and event-handlers.ts already fed — recordAudit() in src/lib/audit.ts is a thin, non-throwing wrapper, not a new mechanism. 178 tests now (was 143), +5 files, all against the real database with next/headers mocked only where cookies() would otherwise throw outside a request scope.',
      migration_notes:
        'No schema changes. No breaking changes — /api/health and /api/ready are new, additive endpoints; every other change is internal (logging/error-centralization/audit) with no altered request/response contract.',
      known_issues:
        'Self-registered patients (no registering clinic) are not covered by the new audit points — see Sprint notes. Correlation IDs cover 4 routes, not the full API surface.',
      aps_items: JSON.stringify(['OBS-1', 'OBS-2', 'OBS-3', 'TEST-3', 'INF-5', 'DOC-1']),
      sprint_numbers: JSON.stringify([38]),
      created_by_user_id: platformAdmin.id,
      highlights: {
        create: [
          {
            category: 'feature',
            title: 'Structured logging',
            description: 'JSON log lines with automatic redaction of sensitive fields and request correlation IDs.',
            sort_order: 0,
          },
          {
            category: 'enhancement',
            title: 'Standardized error responses',
            description: 'Every API error now follows the same shape, including new 422/503 envelopes.',
            sort_order: 1,
          },
          {
            category: 'feature',
            title: 'Extended audit trail',
            description: 'Login, logout, profile edits, and onboarding completion are now audited.',
            sort_order: 2,
          },
          {
            category: 'feature',
            title: 'Health & readiness endpoints',
            description: '/api/health and /api/ready report whether the platform is running and able to serve traffic.',
            sort_order: 3,
          },
        ],
      },
    },
  });

  await prisma.sprint.create({
    data: {
      number: 39,
      goal: 'Release 1.1 Sprint 3 — data integrity & platform governance: centralized validation helpers (DATA-1), duplicate-creation/conflict-detection guards (DATA-2), standardized ownership-violation responses (DATA-3), a data-integrity regression suite (TEST-4), startup configuration validation (INF-6), and data-governance documentation (DOC-2).',
      start_date: new Date('2026-07-06'),
      end_date: new Date('2026-07-06'),
      aps_items: JSON.stringify(['DATA-1', 'DATA-2', 'DATA-3', 'TEST-4', 'INF-6', 'DOC-2']),
      notes:
        'Department/Clinic duplicate-name guards are application-level only (no DB constraint) — a real but low-severity concurrent-request race window, documented rather than fixed via a schema migration this sprint\'s scope explicitly limits to "absolutely required for a documented bug." Configuration validation (INF-6) covers a genuinely small surface today (NODE_ENV) — DATABASE_URL is not environment-driven (a literal path in schema.prisma) and no external-service credentials exist yet.',
    },
  });

  await prisma.release.create({
    data: {
      version: '0.6.0',
      name: 'Release 1.1 — Data Integrity & Platform Governance (Sprint 3)',
      status: 'published',
      release_date: new Date('2026-07-06'),
      published_at: new Date('2026-07-06'),
      summary:
        'Centralized validation and conflict-detection, standardized ownership-violation responses, startup configuration validation, and a new data-integrity regression suite.',
      public_notes:
        '## Data Integrity\n\nDuplicate department and clinic names within the same organization are now rejected with a clear message instead of silently creating a second, confusing entry. Every part of the platform now responds the same way when you try to access someone else\'s record.\n\n## Reliability\n\nThe platform now validates its own configuration at startup, failing fast with a clear message if something is wrong rather than failing confusingly later.',
      internal_notes:
        'DATA-2: any Prisma unique-constraint violation (P2002) not already mapped to a specific domain error is now caught centrally in mapDomainError() and returned as a clean 409 — previously fell through to a raw 500. New DepartmentNameConflictError/ClinicNameConflictError (409) mirror the existing EmailInUseError/InvitationNotPendingError convention (a dedicated class per semantic category, not a generic catch-all). DATA-3: GET /api/patients/[id]/invoices and .../lab-orders standardized from 403 to 404 for a cross-patient request, matching every other cross-identity check in the codebase; PhoneNumberInUseError\'s 403 was deliberately left unchanged after confirming it\'s a genuinely different semantic case (login-time role-boundary violation, not a creation-time duplicate). POST /api/organizations/[id]/clinics now uses mapDomainError (previously bare serverError, a real found gap). 207 tests now (was 178), +6 files, all real integration tests against the actual database.',
      migration_notes:
        'No schema changes — every DATA-2 guard is application-level (find-then-reject), explicitly to stay within this sprint\'s "no schema redesign, no migration introducing new business entities" constraint. No breaking changes to any 200-level response; two 403-to-404 changes on error paths only (see internal notes) and one 500-to-409/400 correctness fix (clinic creation) — no legitimate caller relied on the old (wrong) status codes.',
      known_issues:
        'Department/Clinic duplicate-name guards have a narrow concurrent-request race window (application-level check, not a DB constraint) — see Sprint notes.',
      aps_items: JSON.stringify(['DATA-1', 'DATA-2', 'DATA-3', 'TEST-4', 'INF-6', 'DOC-2']),
      sprint_numbers: JSON.stringify([39]),
      created_by_user_id: platformAdmin.id,
      highlights: {
        create: [
          {
            category: 'fix',
            title: 'Centralized conflict detection',
            description: 'Duplicate unique fields, department names, and clinic names are now rejected with a clear, consistent error.',
            sort_order: 0,
          },
          {
            category: 'fix',
            title: 'Standardized ownership responses',
            description: 'Accessing another patient\'s invoices or lab orders now responds consistently with the rest of the platform.',
            sort_order: 1,
          },
          {
            category: 'feature',
            title: 'Startup configuration validation',
            description: 'The platform now fails fast with a clear diagnostic if its configuration is invalid.',
            sort_order: 2,
          },
          {
            category: 'feature',
            title: 'Data-integrity regression suite',
            description: 'New automated tests cover duplicate creation, invalid ownership, and conflict detection.',
            sort_order: 3,
          },
        ],
      },
    },
  });

  await prisma.sprint.create({
    data: {
      number: 40,
      goal: 'Release 1.2 Sprint 1 — Patient Experience: in-app patient notifications for appointment/invoice/lab-result lifecycle events (PAT-1), and the patient feedback write-side, a review tied to one specific completed appointment (PAT-2).',
      start_date: new Date('2026-07-07'),
      end_date: new Date('2026-07-07'),
      aps_items: JSON.stringify(['PAT-1', 'PAT-2', 'TEST-5', 'DOC-3']),
      notes:
        'PAT-2 required an unplanned, additive schema change (Review.appointment_id, nullable + unique) — the implementation packet\'s assumption that no schema change was needed was checked against the real model and found incorrect (Review only had doctor_id/patient_id, with no way to tie a review to a specific visit or enforce one-per-appointment). Escalated per the packet\'s standing clause and approved by the Product Office before proceeding, rather than implemented unilaterally or the rule silently weakened to "one review per doctor ever." Rollout is gated by a temporary, additive pilot-organization allow-list (src/lib/pilot-orgs.ts), also a Product Office-approved decision (Option 2 of 3 presented) — expected to be removed/bypassed for all organizations at GA.',
    },
  });

  await prisma.release.create({
    data: {
      version: '0.7.0',
      name: 'Release 1.2 — Patient Experience (Sprint 1)',
      status: 'published',
      release_date: new Date('2026-07-07'),
      published_at: new Date('2026-07-07'),
      summary:
        'In-app notifications for appointment, invoice, and lab-result updates, and the ability to leave feedback after a completed visit.',
      public_notes:
        '## Stay Informed\n\nYou\'ll now see an in-app notification when your appointment is confirmed, rescheduled, or cancelled, when an invoice is issued, and when a lab result is ready.\n\n## Share Your Feedback\n\nAfter a completed visit, you can now leave a rating and comment for your doctor directly from the notification you receive.',
      internal_notes:
        'PAT-1: Notification model is additive (new table only); five notification types (appointment_booked/rescheduled/cancelled, invoice_issued, lab_result_ready, review_prompt) generated by new handlers on the existing Event Platform — no second event system. Two lifecycle points (transitionInvoice → "issued", enterLabResult) and one (transitionStatus → "completed") never published an event before this sprint; the new emissions are additive and also extend the existing audit trail (OBS-3 pattern), not a new mechanism. Notification.source_event_id is @unique, keyed to the originating EventLog id, making generation idempotent under the Event Platform\'s existing at-least-once retry/replay — verified by invoking a registered handler twice with the same event id and asserting exactly one row. PAT-2: Review.appointment_id added (nullable, @unique) — a Product Office-approved, escalated schema change (see Sprint notes) — createReview() enforces ownership (404 on mismatch, DATA-3 convention), completed-only (409), and one-review-per-appointment (409, via the unique constraint). Rollout for both PAT-1 and PAT-2 is gated by a temporary pilot-organization allow-list (src/lib/pilot-orgs.ts), consulted in exactly two places and nowhere else. 233 tests now (was 207), +6 files, all real integration tests against the actual database.',
      migration_notes:
        'Two additive schema changes: new Notification table (PAT-1), and a new nullable + unique Review.appointment_id column (PAT-2, Product Office-approved). No existing column changed shape; no breaking change to any existing response contract. Two lifecycle points gained new (additive) event emissions.',
      known_issues:
        'No external notification channel (email/SMS) yet — in-app only, per this sprint\'s explicit scope freeze. No notification preferences/quiet-hours/unsubscribe. The pilot-organization allow-list is temporary rollout infrastructure, not a permanent access-control mechanism.',
      aps_items: JSON.stringify(['PAT-1', 'PAT-2', 'TEST-5', 'DOC-3']),
      sprint_numbers: JSON.stringify([40]),
      created_by_user_id: platformAdmin.id,
      highlights: {
        create: [
          {
            category: 'feature',
            title: 'In-app patient notifications',
            description: 'Appointment confirmations, reschedules, cancellations, invoice, and lab-result updates now appear in a notification center.',
            sort_order: 0,
          },
          {
            category: 'feature',
            title: 'Post-visit feedback',
            description: 'Patients can now rate and comment on a completed visit, prompted directly from their notifications.',
            sort_order: 1,
          },
        ],
      },
    },
  });

  console.log('Seeding rich patient medical history and doctor-queue data...');

  // 1. Resolve Aegis clinic and Dr. Sarah Smith
  const aegisClinic = await prisma.clinic.findFirst({ where: { name: 'Aegis Family Clinic' } });
  const sarahSmith = await prisma.staffProfile.findFirst({ where: { full_name: 'Dr. Sarah Smith' } });
  const receptionist = await prisma.user.findFirst({ where: { role: 'receptionist' } });

  if (!aegisClinic || !sarahSmith || !receptionist) {
    throw new Error("Could not find Aegis Clinic, Dr. Sarah Smith, or Receptionist User.");
  }

  // 2. Clean up previous custom seeds for idempotency
  const customPhones = ['+15550990001', '+15550990002'];
  const customEmails = ['john.doe@gmail.com', 'jane.smith@gmail.com'];
  const customNames = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Davis'];

  await prisma.appointment.deleteMany({
    where: {
      patient: {
        full_name: { in: customNames }
      }
    }
  });

  await prisma.patientProfile.deleteMany({
    where: {
      full_name: { in: customNames }
    }
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { phone_number: { in: customPhones } },
        { email: { in: customEmails } }
      ]
    }
  });

  // 3. Create Registered Patients
  const johnUser = await prisma.user.create({
    data: {
      role: 'patient',
      phone_number: '+15550990001',
      email: 'john.doe@gmail.com',
    }
  });

  const johnProfile = await prisma.patientProfile.create({
    data: {
      user_id: johnUser.id,
      full_name: 'John Doe',
      blood_group: 'O-Positive',
      date_of_birth: new Date('1991-04-12'),
      gender: 'Male',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'phone_verified',
      contacts: {
        create: [{ type: 'phone', value: johnUser.phone_number, is_primary: true, verified_at: new Date() }],
      },
    }
  });

  await prisma.accountProfileLink.create({
    data: { account_user_id: johnUser.id, healthcare_profile_id: johnProfile.id, is_primary: true }
  });

  const janeUser = await prisma.user.create({
    data: {
      role: 'patient',
      phone_number: '+15550990002',
      email: 'jane.smith@gmail.com',
    }
  });

  const janeProfile = await prisma.patientProfile.create({
    data: {
      user_id: janeUser.id,
      full_name: 'Jane Smith',
      blood_group: 'A-Positive',
      date_of_birth: new Date('1987-08-24'),
      gender: 'Female',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'phone_verified',
      contacts: {
        create: [{ type: 'phone', value: janeUser.phone_number, is_primary: true, verified_at: new Date() }],
      },
    }
  });

  await prisma.accountProfileLink.create({
    data: { account_user_id: janeUser.id, healthcare_profile_id: janeProfile.id, is_primary: true }
  });

  // 4. Create Non-Registered Patients (user_id null, registered by clinic reception, phone contacts shared with parent accounts)
  const robertProfile = await prisma.patientProfile.create({
    data: {
      full_name: 'Robert Johnson',
      blood_group: 'B-Positive',
      date_of_birth: new Date('1975-02-15'),
      gender: 'Male',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'unverified',
      registered_by_clinic_id: aegisClinic.id,
      contacts: {
        create: [{ type: 'phone', value: johnUser.phone_number, is_primary: true }],
      },
    }
  });

  // Link Robert to John's account as family
  await prisma.accountProfileLink.create({
    data: { account_user_id: johnUser.id, healthcare_profile_id: robertProfile.id, is_primary: false }
  });

  const emilyProfile = await prisma.patientProfile.create({
    data: {
      full_name: 'Emily Davis',
      blood_group: 'AB-Positive',
      date_of_birth: new Date('2002-12-09'),
      gender: 'Female',
      onboarding_completed: true,
      health_id: nextHealthId(),
      verification_level: 'unverified',
      registered_by_clinic_id: aegisClinic.id,
      contacts: {
        create: [{ type: 'phone', value: janeUser.phone_number, is_primary: true }],
      },
    }
  });

  // Link Emily to Jane's account as family
  await prisma.accountProfileLink.create({
    data: { account_user_id: janeUser.id, healthcare_profile_id: emilyProfile.id, is_primary: false }
  });

  // 5. Seed Appointments & Histories for Dr. Sarah Smith

  // --- Patient A: John Doe ---
  // Past Appointment (Completed 5 days ago)
  const johnPastAppt = await prisma.appointment.create({
    data: {
      patient_id: johnProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'completed',
      checked_in_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
    }
  });

  // Prescription for John
  await prisma.prescription.create({
    data: {
      appointment_id: johnPastAppt.id,
      patient_id: johnProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      notes: 'Patient presented with seasonal acute bronchitis symptoms. Responded well to test diagnostics.',
      medicines_json: JSON.stringify([
        { name: 'Amoxicillin', dosage: '500mg', frequency: 'Thrice daily', duration: '5 days' },
        { name: 'Paracetamol', dosage: '500mg', frequency: 'PRN (As needed)', duration: '3 days' }
      ]),
      follow_up_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    }
  });

  // LabOrder for John
  await prisma.labOrder.create({
    data: {
      appointment_id: johnPastAppt.id,
      patient_id: johnProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      tests_json: JSON.stringify([{ name: 'Complete Blood Count (CBC)' }]),
      status: 'resulted',
      clinical_note: 'Evaluate leukocyte count and systemic inflammation.',
      result_values_json: JSON.stringify([
        { test: 'Hemoglobin', value: '14.2', unit: 'g/dL', reference: '13.8-17.2' },
        { test: 'White Blood Cell (WBC)', value: '8.5', unit: 'x10^3/uL', reference: '4.5-11.0' }
      ]),
      result_notes: 'All CBC parameters are within normal clinical thresholds. No acute bacterial signatures.',
      ordered_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resulted_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      resulted_by_user_id: sarahSmith.user_id
    }
  });

  // Invoice for John
  const johnInvoice = await prisma.invoice.create({
    data: {
      invoice_number: 'INV-JOHN-001',
      clinic_id: aegisClinic.id,
      appointment_id: johnPastAppt.id,
      patient_id: johnProfile.id,
      status: 'paid',
      items_json: JSON.stringify([
        { description: 'Cardiology Specialist Consultation', qty: 1, unit_price: 600, amount: 600 }
      ]),
      total: 600,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      issued_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      paid_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.payment.create({
    data: {
      invoice_id: johnInvoice.id,
      clinic_id: aegisClinic.id,
      amount: 600,
      method: 'cash',
      received_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      received_by_user_id: receptionist.id
    }
  });

  // Future Scheduled Appointment for John (Tomorrow)
  await prisma.appointment.create({
    data: {
      patient_id: johnProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'scheduled',
    }
  });

  // --- Patient B: Jane Smith ---
  // Past Appointment (Completed 10 days ago)
  const janePastAppt = await prisma.appointment.create({
    data: {
      patient_id: janeProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      status: 'completed',
      checked_in_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
      completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    }
  });

  // Prescription for Jane
  await prisma.prescription.create({
    data: {
      appointment_id: janePastAppt.id,
      patient_id: janeProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      notes: 'ECG triage performed. Mild transient hypertension noted. Recommend dietary sodium restrictions.',
      medicines_json: JSON.stringify([
        { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days' }
      ]),
      follow_up_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
    }
  });

  // LabOrder for Jane (ECG)
  await prisma.labOrder.create({
    data: {
      appointment_id: janePastAppt.id,
      patient_id: janeProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      tests_json: JSON.stringify([{ name: 'Electrocardiogram (ECG)' }]),
      status: 'resulted',
      clinical_note: 'Screen for suspected transient cardiac arrhythmia.',
      result_notes: 'ECG showed normal sinus rhythm, 72 bpm. PR and QTc intervals are stable. No ST elevations.',
      ordered_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      resulted_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      resulted_by_user_id: sarahSmith.user_id
    }
  });

  // Invoice for Jane
  const janeInvoice = await prisma.invoice.create({
    data: {
      invoice_number: 'INV-JANE-001',
      clinic_id: aegisClinic.id,
      appointment_id: janePastAppt.id,
      patient_id: janeProfile.id,
      status: 'paid',
      items_json: JSON.stringify([
        { description: 'Cardiology ECG Procedure Fee', qty: 1, unit_price: 1500, amount: 1500 }
      ]),
      total: 1500,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      issued_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paid_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.payment.create({
    data: {
      invoice_id: janeInvoice.id,
      clinic_id: aegisClinic.id,
      amount: 1500,
      method: 'card',
      received_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      received_by_user_id: receptionist.id
    }
  });

  // Live appointment today (checked_in)
  await prisma.appointment.create({
    data: {
      patient_id: janeProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(Date.now() - 30 * 60 * 1000),
      status: 'checked_in',
      queue_number: 2,
      checked_in_at: new Date(Date.now() - 15 * 60 * 1000)
    }
  });

  // --- Patient C: Robert Johnson (Non-Registered) ---
  // Past Appointment (Completed 14 days ago)
  const robertPastAppt = await prisma.appointment.create({
    data: {
      patient_id: robertProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      status: 'completed',
      checked_in_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000),
      completed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
    }
  });

  // Prescription for Robert
  await prisma.prescription.create({
    data: {
      appointment_id: robertPastAppt.id,
      patient_id: robertProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      notes: 'Diagnosed with Type II Diabetes. Started on oral hypoglycemics.',
      medicines_json: JSON.stringify([
        { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '90 days' }
      ])
    }
  });

  // Invoice for Robert
  const robertInvoice = await prisma.invoice.create({
    data: {
      invoice_number: 'INV-ROBERT-001',
      clinic_id: aegisClinic.id,
      appointment_id: robertPastAppt.id,
      patient_id: robertProfile.id,
      status: 'paid',
      items_json: JSON.stringify([
        { description: 'Cardiology Specialist Consultation', qty: 1, unit_price: 600, amount: 600 }
      ]),
      total: 600,
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      issued_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      paid_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.payment.create({
    data: {
      invoice_id: robertInvoice.id,
      clinic_id: aegisClinic.id,
      amount: 600,
      method: 'cash',
      received_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      received_by_user_id: receptionist.id
    }
  });

  // Live appointment today (waiting)
  await prisma.appointment.create({
    data: {
      patient_id: robertProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(Date.now() - 10 * 60 * 1000),
      status: 'waiting',
      queue_number: 3,
      checked_in_at: new Date(Date.now() - 5 * 60 * 1000)
    }
  });

  // --- Patient D: Emily Davis (Non-Registered) ---
  // Live appointment today (doctor_ready)
  await prisma.appointment.create({
    data: {
      patient_id: emilyProfile.id,
      doctor_id: sarahSmith.id,
      clinic_id: aegisClinic.id,
      scheduled_time: new Date(),
      status: 'doctor_ready',
      queue_number: 4,
      checked_in_at: new Date(Date.now() - 2 * 60 * 1000)
    }
  });

  console.log('Database seeded successfully with expanded doctor-queue and patient histories!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
