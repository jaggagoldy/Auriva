import { describe, it, expect, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { setPriority, getQueue } from "@/services/queue-service";
import { createHealthcareProfile } from "@/services/patient-service";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";

describe("REQ-REC-003: Emergency Patient Queue Bypass & Priority Reordering", () => {
  let clinicId: string;
  let doctorId: string;
  let patientAId: string;
  let patientBId: string;

  beforeEach(async () => {
    const { clinic } = await createTestOrganization();
    clinicId = clinic.id;

    const { staffProfile } = await createTestStaff(clinicId, "doctor");
    doctorId = staffProfile.id;

    const patA = await createHealthcareProfile({
      full_name: "Standard Patient A",
      registeredByClinicId: clinicId,
      blood_group: "O+",
    });
    patientAId = patA.id;

    const patB = await createHealthcareProfile({
      full_name: "Emergency Patient B",
      registeredByClinicId: clinicId,
      blood_group: "A+",
    });
    patientBId = patB.id;
  });

  it("assigns priority weight 100 to bump emergency patient to position #1 in queue", async () => {
    const now = new Date();
    const apptA = await prisma.appointment.create({
      data: {
        patient_id: patientAId,
        doctor_id: doctorId,
        clinic_id: clinicId,
        scheduled_time: now,
        status: "waiting",
        queue_number: 1,
        priority: 0,
      },
    });

    const apptB = await prisma.appointment.create({
      data: {
        patient_id: patientBId,
        doctor_id: doctorId,
        clinic_id: clinicId,
        scheduled_time: now,
        status: "waiting",
        queue_number: 2,
        priority: 0,
      },
    });

    // Before emergency bypass: queue order is #1 (A), #2 (B)
    const initialQueue = await getQueue({ clinicId, doctorId, date: now });
    expect(initialQueue[0].id).toBe(apptA.id);
    expect(initialQueue[1].id).toBe(apptB.id);

    // Set emergency priority 100 on Patient B
    await setPriority(apptB.id, clinicId, 100, "staff-user-1");

    // After emergency bypass: B (priority 100) is #1, A (priority 0) is #2
    const reorderedQueue = await getQueue({ clinicId, doctorId, date: now });
    expect(reorderedQueue[0].id).toBe(apptB.id);
    expect(reorderedQueue[0].priority).toBe(100);
    expect(reorderedQueue[1].id).toBe(apptA.id);

    // Verify AppointmentEvent logged emergency_priority_set
    const events = await prisma.appointmentEvent.findMany({
      where: { appointment_id: apptB.id, type: "emergency_priority_set" },
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].note).toContain("Emergency priority set");
  });
});
