// M3A C2 — ServiceEvent lifecycle service. Integration against the real dev DB.
// Proves permission-by-kind, catalog snapshotting, ad-hoc flagging, and the
// state-machine guards (draft-only removal, finalize, reason-gated reversal).
// No invoices/payments are ever created here — that is the billing engine (C3).

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import {
  InvalidServiceEventTransitionError,
  ReasonRequiredError,
  ServiceEventPermissionError,
  addServiceEvent,
  finalizeServiceEvent,
  listServiceEventsForAppointment,
  removeServiceEvent,
  reverseServiceEvent,
} from "@/services/service-event-service";

const clinicIds: string[] = [];

afterAll(async () => {
  // Service_Events cascade off clinic; clean the clinics we made.
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function scenario() {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
  const { user: receptionUser } = await createTestStaff(clinic.id, "receptionist");
  const { profile: patient } = await createTestPatient(clinic.id);
  const appointment = await prisma.appointment.create({
    data: {
      patient_id: patient.id,
      doctor_id: doctor.id,
      clinic_id: clinic.id,
      scheduled_time: new Date(),
      status: "in_consultation",
    },
  });
  const clinicalService = await prisma.service.create({
    data: {
      clinic_id: clinic.id,
      name: "Follow-up consultation",
      duration_minutes: 15,
      price: 500,
      category: "Consultation",
      kind: "clinical",
      version: 2,
    },
  });
  return {
    clinic,
    patient,
    appointment,
    clinicalService,
    doctor: { userId: doctorUser.id, role: "doctor" as const },
    reception: { userId: receptionUser.id, role: "reception" as const },
    base: { clinicId: clinic.id, patientId: patient.id, appointmentId: appointment.id },
  };
}

describe("addServiceEvent — permission-by-kind", () => {
  it("a doctor can add a clinical catalog service, snapshotting name/price/version", async () => {
    const s = await scenario();
    const event = await addServiceEvent(
      { ...s.base, serviceId: s.clinicalService.id, qty: 2 },
      s.doctor
    );
    expect(event.status).toBe("draft");
    expect(event.kind).toBe("clinical");
    expect(event.name).toBe("Follow-up consultation");
    expect(event.unit_price).toBe(500);
    expect(event.service_version).toBe(2); // snapshotted
    expect(event.amount).toBe(1000); // 500 * 2
    expect(event.needs_catalog_review).toBe(false);
    expect(event.added_by_role).toBe("doctor");
  });

  it("reception cannot add a clinical service", async () => {
    const s = await scenario();
    await expect(
      addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.reception)
    ).rejects.toBeInstanceOf(ServiceEventPermissionError);
  });

  it("reception can add a financial ad-hoc charge, flagged for catalog review", async () => {
    const s = await scenario();
    const event = await addServiceEvent(
      {
        ...s.base,
        serviceId: null,
        name: "Registration fee",
        category: "Administrative",
        kind: "financial",
        unitPrice: 200,
      },
      s.reception
    );
    expect(event.kind).toBe("financial");
    expect(event.needs_catalog_review).toBe(true); // ad-hoc
    expect(event.service_version).toBeNull();
    expect(event.amount).toBe(200);
    expect(event.added_by_role).toBe("reception");
  });

  it("a doctor cannot add a financial ad-hoc charge", async () => {
    const s = await scenario();
    await expect(
      addServiceEvent(
        { ...s.base, serviceId: null, name: "Late fee", category: "Administrative", kind: "financial", unitPrice: 100 },
        s.doctor
      )
    ).rejects.toBeInstanceOf(ServiceEventPermissionError);
  });
});

describe("lifecycle transitions", () => {
  it("removes a draft (draft only)", async () => {
    const s = await scenario();
    const event = await addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.doctor);
    const removed = await removeServiceEvent(event.id);
    expect(removed.status).toBe("removed");
    expect(removed.removed_at).not.toBeNull();
  });

  it("finalizes a draft and then cannot remove it", async () => {
    const s = await scenario();
    const event = await addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.doctor);
    const finalized = await finalizeServiceEvent(event.id);
    expect(finalized.status).toBe("finalized");
    expect(finalized.finalized_at).not.toBeNull();
    await expect(removeServiceEvent(event.id)).rejects.toBeInstanceOf(
      InvalidServiceEventTransitionError
    );
  });

  it("reverses a finalized event — reason mandatory", async () => {
    const s = await scenario();
    const event = await addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.doctor);
    await finalizeServiceEvent(event.id);
    await expect(reverseServiceEvent(event.id, "   ")).rejects.toBeInstanceOf(ReasonRequiredError);
    const reversed = await reverseServiceEvent(event.id, "Charged in error");
    expect(reversed.status).toBe("reversed");
    expect(reversed.reversal_reason).toBe("Charged in error");
  });

  it("cannot reverse a draft (must finalize first)", async () => {
    const s = await scenario();
    const event = await addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.doctor);
    await expect(reverseServiceEvent(event.id, "nope")).rejects.toBeInstanceOf(
      InvalidServiceEventTransitionError
    );
  });
});

describe("listServiceEventsForAppointment", () => {
  it("returns draft + finalized, excludes removed", async () => {
    const s = await scenario();
    const keep = await addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.doctor);
    const drop = await addServiceEvent({ ...s.base, serviceId: s.clinicalService.id }, s.doctor);
    await removeServiceEvent(drop.id);
    const list = await listServiceEventsForAppointment(s.appointment.id);
    const ids = list.map((e) => e.id);
    expect(ids).toContain(keep.id);
    expect(ids).not.toContain(drop.id);
  });
});
