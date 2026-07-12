// Milestone 1 (First Clinic Ready), Batch 6 — Demo Mode. Real DB: the demo
// seeder builds a believable clinic, reset rebuilds it in place (stable ids),
// and reset is provably safe — it never touches a non-demo organization.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import {
  enterDemo,
  resetDemo,
  findDemoOrg,
  type DemoIds,
} from "@/services/demo-service";
import {
  getClinicOverview,
  getTodayAppointments,
  getTodayPayments,
} from "@/services/clinic-workspace-service";

let ids: DemoIds;

beforeAll(async () => {
  // resetDemo() guarantees a clean, fully-seeded demo regardless of any leftover
  // state in the shared dev database.
  ids = await resetDemo();
});

afterAll(async () => {
  const org = await findDemoOrg();
  if (!org) return;
  const clinicIds = org.clinics.map((c) => c.id);
  await prisma.payment.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.invoice.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.appointment.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  await prisma.service.deleteMany({ where: { clinic_id: { in: clinicIds } } });
  const profiles = await prisma.patientProfile.findMany({
    where: { registered_by_clinic_id: { in: clinicIds } },
    select: { id: true, user_id: true },
  });
  await prisma.patientProfile.deleteMany({ where: { id: { in: profiles.map((p) => p.id) } } });
  await prisma.user.deleteMany({
    where: { id: { in: profiles.map((p) => p.user_id).filter((v): v is string => Boolean(v)) } },
  });
  // Deleting the owner cascades the org, clinic, staff profile, availability.
  await prisma.user.delete({ where: { id: org.owner_user_id } });
});

describe("demo seeder", () => {
  it("creates a believable, marked demo clinic", async () => {
    const org = await prisma.organization.findUnique({ where: { id: ids.organizationId } });
    expect(org?.is_demo).toBe(true);
    expect(org?.name).toBe("SmileCare Physiotherapy");

    const services = await prisma.service.findMany({ where: { clinic_id: ids.clinicId, is_active: true } });
    expect(services).toHaveLength(4);
    expect(services.map((s) => s.name).sort()).toEqual(
      ["Assessment", "Dry Needling", "Exercise Therapy", "Follow-up Session"].sort()
    );

    const patients = await prisma.patientProfile.count({ where: { registered_by_clinic_id: ids.clinicId } });
    expect(patients).toBe(8);
  });

  it("gives the demo owner NO password (no standing credential — H2)", async () => {
    const owner = await prisma.user.findUnique({ where: { id: ids.ownerUserId } });
    expect(owner?.password_hash).toBeNull(); // cannot be reached via credential login
    expect(owner?.role).toBe("super_admin");
  });

  it("tells a paid / partial / pending money story for today", async () => {
    const invoices = await prisma.invoice.findMany({ where: { clinic_id: ids.clinicId } });
    const statuses = new Set(invoices.map((i) => i.status));
    expect(statuses.has("paid")).toBe(true); // full payment
    expect(statuses.has("issued")).toBe(true); // partial payment
    expect(statuses.has("draft")).toBe(true); // pending, unpaid

    const today = await getTodayAppointments(ids.clinicId, ids.ownerUserId);
    expect(today.total).toBeGreaterThanOrEqual(6);
    expect(today.remaining).toBeGreaterThan(0); // there is a "next patient"
    expect(today.follow_ups).toBeGreaterThan(0);
    expect(today.owner_name).toBe("Dr. Priya Sharma");
    // ₹800 (cash, paid) + ₹300 (upi, partial) collected today.
    expect(today.collected_today).toBe(1100);
    // ₹700 pending draft + ₹200 partial balance still open.
    expect(today.outstanding_total).toBe(900);

    const payments = await getTodayPayments(ids.clinicId);
    expect(payments.payments).toHaveLength(2);
  });

  it("reaches 100% Clinic Ready and shows a patient goal", async () => {
    const overview = await getClinicOverview(ids.clinicId, ids.ownerUserId);
    expect(overview?.ready.percent).toBe(100);
    expect(overview?.ready.nextStep).toBeNull();
    expect(overview?.ready.goal?.target).toBeGreaterThan(0);
    expect(overview?.clinic.is_demo).toBe(true);
  });
});

describe("demo reset", () => {
  it("rebuilds in place with stable ids and no duplication", async () => {
    const before = ids;
    const after = await resetDemo();

    // Scaffold identity is preserved — the explorer's session survives.
    expect(after.ownerUserId).toBe(before.ownerUserId);
    expect(after.organizationId).toBe(before.organizationId);
    expect(after.clinicId).toBe(before.clinicId);
    expect(after.doctorId).toBe(before.doctorId);

    // Content is refreshed, not accumulated.
    expect(await prisma.service.count({ where: { clinic_id: after.clinicId, is_active: true } })).toBe(4);
    expect(await prisma.patientProfile.count({ where: { registered_by_clinic_id: after.clinicId } })).toBe(8);
    ids = after;
  });

  it("never touches a real (non-demo) organization", async () => {
    const real = await createTestOrganization();
    try {
      await resetDemo();
      const stillThere = await prisma.organization.findUnique({ where: { id: real.organization.id } });
      expect(stillThere).not.toBeNull();
      expect(stillThere?.is_demo).toBe(false);
      const clinic = await prisma.clinic.findUnique({ where: { id: real.clinic.id } });
      expect(clinic).not.toBeNull();
    } finally {
      await prisma.user.delete({ where: { id: real.owner.id } });
    }
  });
});

describe("demo enter", () => {
  it("returns a demo owner scoped to the demo clinic", async () => {
    const entered = await enterDemo();
    expect(entered.clinicId).toBe(ids.clinicId);
    const owner = await prisma.user.findUnique({ where: { id: entered.ownerUserId } });
    expect(owner?.role).toBe("super_admin");
    // Content already present → enter must NOT reseed (no duplicate services).
    expect(await prisma.service.count({ where: { clinic_id: entered.clinicId, is_active: true } })).toBe(4);
  });
});
