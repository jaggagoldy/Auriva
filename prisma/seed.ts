import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning database...');
  await prisma.appointment.deleteMany({});
  await prisma.patientProfile.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.clinic.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding initial data...');

  // 1. Create Super Admin User
  const adminUser = await prisma.user.create({
    data: {
      role: 'super_admin',
      phone_number: '+15550100000',
      email: 'admin@aegiscare.com',
    },
  });

  // 2. Create Clinics
  const clinicA = await prisma.clinic.create({
    data: {
      name: 'Aegis Family Clinic',
      address: '742 Evergreen Terrace, Springfield',
      super_admin_id: adminUser.id,
    },
  });

  const clinicB = await prisma.clinic.create({
    data: {
      name: 'Summit Medical Center',
      address: '100 Pinnacle Way, Suite 400',
      super_admin_id: adminUser.id,
    },
  });

  // 3. Create Doctors & Staff Users & Profiles
  const doctorUser1 = await prisma.user.create({
    data: {
      role: 'doctor',
      phone_number: '+15550101111',
      email: 'dr.smith@aegiscare.com',
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

  // 4. Create Patients & Patient Profiles
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
    },
  });

  // 5. Create Appointments
  // Past completed appointment
  await prisma.appointment.create({
    data: {
      patient_id: patient1.id,
      doctor_id: doc1.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'completed',
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

  // Appointment in waiting status for Patient 2
  await prisma.appointment.create({
    data: {
      patient_id: patient2.id,
      doctor_id: doc3.id,
      clinic_id: clinicA.id,
      scheduled_time: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      status: 'waiting',
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
