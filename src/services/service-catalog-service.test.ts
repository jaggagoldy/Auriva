// Milestone 1 (First Clinic Ready), Batch 1 — Treatments & Services catalog.
// Real database, real Prisma queries (integration), matching the project's
// existing service-test convention.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import {
  archiveService,
  createService,
  listServices,
  ServiceInputError,
  ServiceNotFoundError,
  updateService,
} from "@/services/service-catalog-service";

const createdClinicIds: string[] = [];

afterAll(async () => {
  await prisma.service.deleteMany({ where: { clinic_id: { in: createdClinicIds } } });
});

async function freshClinic() {
  const { clinic } = await createTestOrganization();
  createdClinicIds.push(clinic.id);
  return clinic;
}

describe("createService", () => {
  it("creates a treatment with name, duration, price and buffer", async () => {
    const clinic = await freshClinic();
    const svc = await createService(clinic.id, {
      name: "  Initial assessment  ",
      durationMinutes: 45,
      price: 1200,
      bufferMinutes: 5,
    });
    expect(svc.name).toBe("Initial assessment"); // trimmed
    expect(svc.duration_minutes).toBe(45);
    expect(svc.price).toBe(1200);
    expect(svc.buffer_minutes).toBe(5);
    expect(svc.is_active).toBe(true);
  });

  it("allows a null buffer (falls back to the clinic-level buffer)", async () => {
    const clinic = await freshClinic();
    const svc = await createService(clinic.id, {
      name: "Follow-up session",
      durationMinutes: 30,
      price: 800,
    });
    expect(svc.buffer_minutes).toBeNull();
  });

  it("allows a zero price (a free consultation is valid)", async () => {
    const clinic = await freshClinic();
    const svc = await createService(clinic.id, { name: "Free camp check", durationMinutes: 10, price: 0 });
    expect(svc.price).toBe(0);
  });

  it.each([
    ["blank name", { name: "   ", durationMinutes: 30, price: 500 }],
    ["zero duration", { name: "X", durationMinutes: 0, price: 500 }],
    ["negative duration", { name: "X", durationMinutes: -15, price: 500 }],
    ["fractional duration", { name: "X", durationMinutes: 30.5, price: 500 }],
    ["negative price", { name: "X", durationMinutes: 30, price: -1 }],
    ["fractional price", { name: "X", durationMinutes: 30, price: 99.5 }],
    ["negative buffer", { name: "X", durationMinutes: 30, price: 500, bufferMinutes: -5 }],
  ])("rejects %s as a ServiceInputError", async (_label, input) => {
    const clinic = await freshClinic();
    await expect(createService(clinic.id, input)).rejects.toThrow(ServiceInputError);
  });
});

describe("listServices", () => {
  it("returns only active treatments by default, in sort order", async () => {
    const clinic = await freshClinic();
    await createService(clinic.id, { name: "Second", durationMinutes: 30, price: 800, sortOrder: 2 });
    await createService(clinic.id, { name: "First", durationMinutes: 45, price: 1200, sortOrder: 1 });
    const archived = await createService(clinic.id, { name: "Old", durationMinutes: 20, price: 400 });
    await archiveService(clinic.id, archived.id);

    const active = await listServices(clinic.id);
    expect(active.map((s) => s.name)).toEqual(["First", "Second"]);

    const all = await listServices(clinic.id, { includeInactive: true });
    expect(all.map((s) => s.name).sort()).toEqual(["First", "Old", "Second"]);
  });

  it("is scoped per clinic — one clinic never sees another's catalog", async () => {
    const clinicA = await freshClinic();
    const clinicB = await freshClinic();
    await createService(clinicA.id, { name: "A-only", durationMinutes: 30, price: 500 });

    expect(await listServices(clinicB.id)).toHaveLength(0);
  });
});

describe("updateService", () => {
  it("updates one field at a time and trims the name", async () => {
    const clinic = await freshClinic();
    const svc = await createService(clinic.id, { name: "Consult", durationMinutes: 30, price: 800 });

    const updated = await updateService(clinic.id, svc.id, { price: 900 });
    expect(updated.price).toBe(900);
    expect(updated.duration_minutes).toBe(30); // untouched

    const renamed = await updateService(clinic.id, svc.id, { name: "  Renamed  " });
    expect(renamed.name).toBe("Renamed");
  });

  it("rejects an invalid updated value", async () => {
    const clinic = await freshClinic();
    const svc = await createService(clinic.id, { name: "Consult", durationMinutes: 30, price: 800 });
    await expect(updateService(clinic.id, svc.id, { durationMinutes: 0 })).rejects.toThrow(
      ServiceInputError
    );
  });

  it("cannot update a treatment belonging to another clinic (404 hide-existence)", async () => {
    const clinicA = await freshClinic();
    const clinicB = await freshClinic();
    const svc = await createService(clinicA.id, { name: "A", durationMinutes: 30, price: 800 });

    await expect(updateService(clinicB.id, svc.id, { price: 1 })).rejects.toThrow(
      ServiceNotFoundError
    );
  });
});

describe("archiveService", () => {
  it("soft-archives (is_active=false), leaving the row intact", async () => {
    const clinic = await freshClinic();
    const svc = await createService(clinic.id, { name: "Temp", durationMinutes: 30, price: 800 });

    const archived = await archiveService(clinic.id, svc.id);
    expect(archived.is_active).toBe(false);

    const stillThere = await prisma.service.findUnique({ where: { id: svc.id } });
    expect(stillThere).not.toBeNull();
  });

  it("cannot archive another clinic's treatment", async () => {
    const clinicA = await freshClinic();
    const clinicB = await freshClinic();
    const svc = await createService(clinicA.id, { name: "A", durationMinutes: 30, price: 800 });

    await expect(archiveService(clinicB.id, svc.id)).rejects.toThrow(ServiceNotFoundError);
  });
});
