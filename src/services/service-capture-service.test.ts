// M3B B1 — Doctor Service Capture. Integration against the real dev DB. Proves
// the base-consultation seed, catalog + ad-hoc capture, permission-by-kind at
// the capture boundary, draft-only qty/remove, clinic scoping, and that a
// captured visit settles (through the M3A engine) into an invoice that includes
// the consultation line.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestPatient, createTestStaff } from "@/test/fixtures";
import {
  ServiceCaptureError,
  addVisitClinicalService,
  listVisitServiceEvents,
  openVisitCapture,
  removeVisitServiceEvent,
  setVisitServiceEventQty,
} from "@/services/service-capture-service";
import { ServiceEventPermissionError } from "@/services/service-event-service";
import { completeVisitInvoicing } from "@/services/billing-engine-service";

const clinicIds: string[] = [];

afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
});

async function scenario() {
  const { clinic } = await createTestOrganization();
  clinicIds.push(clinic.id);
  const { staffProfile: doctor, user: doctorUser } = await createTestStaff(clinic.id, "doctor");
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
  return { clinic, doctor, patient, appointment, actorUserId: doctorUser.id };
}

async function clinicalService(clinicId: string, name: string, price: number, category = "Procedure") {
  return prisma.service.create({
    data: { clinic_id: clinicId, name, duration_minutes: 10, price, category, kind: "clinical" },
  });
}

describe("openVisitCapture — base consultation seed", () => {
  it("seeds exactly one Consultation line, priced, idempotently", async () => {
    const s = await scenario();
    const first = await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    expect(first).toHaveLength(1);
    expect(first[0].category).toBe("Consultation");
    expect(first[0].kind).toBe("clinical");
    expect(first[0].status).toBe("draft");
    expect(first[0].unit_price).toBeGreaterThan(0);

    const second = await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    expect(second).toHaveLength(1); // idempotent — not duplicated
  });
});

describe("addVisitClinicalService", () => {
  it("adds a catalog clinical service (snapshotted)", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const svc = await clinicalService(s.clinic.id, "ECG", 300);
    const list = await addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, { serviceId: svc.id });
    const ecg = list.find((e) => e.name === "ECG");
    expect(ecg).toBeDefined();
    expect(ecg!.amount).toBe(300);
    expect(ecg!.needs_catalog_review).toBe(false);
  });

  it("adds an ad-hoc clinical service, flagged for review", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const list = await addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, {
      name: "Wound dressing",
      category: "Procedure",
      unitPrice: 250,
    });
    const adhoc = list.find((e) => e.name === "Wound dressing");
    expect(adhoc).toBeDefined();
    expect(adhoc!.needs_catalog_review).toBe(true);
    expect(adhoc!.amount).toBe(250);
  });

  it("rejects a financial catalog service (permission-by-kind)", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const financial = await prisma.service.create({
      data: { clinic_id: s.clinic.id, name: "Registration", duration_minutes: 0, price: 100, category: "Administrative", kind: "financial" },
    });
    await expect(
      addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, { serviceId: financial.id })
    ).rejects.toBeInstanceOf(ServiceEventPermissionError);
  });

  it("rejects an ad-hoc service with a bad price", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    await expect(
      addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, { name: "X", category: "Lab" })
    ).rejects.toBeInstanceOf(ServiceCaptureError);
  });
});

describe("qty + remove (draft-only, clinic-scoped)", () => {
  it("re-quantifies a draft line and recomputes amount", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const svc = await clinicalService(s.clinic.id, "Injection", 150);
    let list = await addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, { serviceId: svc.id });
    const inj = list.find((e) => e.name === "Injection")!;
    list = await setVisitServiceEventQty(inj.id, s.clinic.id, 3);
    const updated = list.find((e) => e.id === inj.id)!;
    expect(updated.qty).toBe(3);
    expect(updated.amount).toBe(450);
  });

  it("removes a draft line", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const svc = await clinicalService(s.clinic.id, "Nebulization", 200);
    let list = await addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, { serviceId: svc.id });
    const neb = list.find((e) => e.name === "Nebulization")!;
    list = await removeVisitServiceEvent(neb.id, s.clinic.id);
    expect(list.find((e) => e.id === neb.id)).toBeUndefined();
  });

  it("refuses to touch a line from another clinic", async () => {
    const s = await scenario();
    const other = await scenario();
    const list = await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const consult = list[0];
    await expect(setVisitServiceEventQty(consult.id, other.clinic.id, 2)).rejects.toBeInstanceOf(ServiceCaptureError);
    await expect(removeVisitServiceEvent(consult.id, other.clinic.id)).rejects.toBeInstanceOf(ServiceCaptureError);
  });
});

describe("capture → settlement", () => {
  it("a captured visit settles into an invoice that includes the consultation + services", async () => {
    const s = await scenario();
    await openVisitCapture(s.appointment.id, s.clinic.id, s.actorUserId);
    const svc = await clinicalService(s.clinic.id, "ECG", 300);
    await addVisitClinicalService(s.appointment.id, s.clinic.id, s.actorUserId, { serviceId: svc.id });

    const events = await listVisitServiceEvents(s.appointment.id, s.clinic.id);
    const expectedTotal = events.reduce((n, e) => n + e.amount, 0);

    const invoice = await prisma.$transaction((tx) =>
      completeVisitInvoicing(tx, {
        id: s.appointment.id,
        clinic_id: s.clinic.id,
        patient_id: s.patient.id,
        doctor_id: s.appointment.doctor_id,
      })
    );
    expect(invoice).not.toBeNull();
    const full = await prisma.invoice.findUniqueOrThrow({
      where: { id: invoice!.id },
      include: { lines: true },
    });
    expect(full.lines).toHaveLength(events.length); // consultation + ECG
    expect(full.total).toBe(expectedTotal);
    expect(full.lines.some((l) => l.description.startsWith("Consultation"))).toBe(true);
    expect(full.lines.some((l) => l.description === "ECG")).toBe(true);
  });
});
