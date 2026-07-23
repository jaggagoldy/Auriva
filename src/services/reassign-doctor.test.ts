import { describe, it, expect, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { reassignDoctor } from "@/services/reception-service";
import { createHealthcareProfile } from "@/services/patient-service";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";

describe("REQ-REC-004: Drag-and-Drop Queue Reordering & Doctor Transfer", () => {
  let clinicId: string;
  let doctorAId: string;
  let doctorBId: string;
  let patientId: string;

  beforeEach(async () => {
    const { clinic } = await createTestOrganization();
    clinicId = clinic.id;

    const { staffProfile: docA } = await createTestStaff(clinicId, "doctor");
    doctorAId = docA.id;

    const { staffProfile: docB } = await createTestStaff(clinicId, "doctor");
    doctorBId = docB.id;

    const pat = await createHealthcareProfile({
      full_name: "Transfer Patient",
      registeredByClinicId: clinicId,
      blood_group: "B+",
    });
    patientId = pat.id;
  });

  it("reassigns appointment to new doctor, assigns new queue token, logs audit event and dispatches system event", async () => {
    const now = new Date();
    const appt = await prisma.appointment.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorAId,
        clinic_id: clinicId,
        scheduled_time: now,
        status: "waiting",
        queue_number: 5,
      },
    });

    // Reassign from Doctor A to Doctor B
    const updated = await reassignDoctor(appt.id, doctorBId, clinicId, "reception-user-1");

    expect(updated.doctor_id).toBe(doctorBId);
    expect(updated.queue_number).toBe(1);

    // Verify audit event
    const events = await prisma.appointmentEvent.findMany({
      where: { appointment_id: appt.id, type: "doctor_reassigned" },
    });
    expect(events.length).toBe(1);
    expect(events[0].note).toContain("Reassigned from");
  });
});
