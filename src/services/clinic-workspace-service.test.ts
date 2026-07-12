// Milestone 1 (First Clinic Ready), Batch 4 — the My Clinic workspace read
// model. Real DB: Clinic Ready is computed from live queries, and the checklist
// flips as real rows appear. Also covers mark-shared and today's schedule.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { createService } from "@/services/service-catalog-service";
import {
  getClinicOverview,
  getTodayAppointments,
  markBookingShared,
} from "@/services/clinic-workspace-service";

const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.service.deleteMany({ where: { clinic: { organization_id: { in: orgIds } } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function fresh() {
  const { owner, organization, clinic } = await createTestOrganization();
  orgIds.push(organization.id);
  userIds.push(owner.id);
  return { owner, clinic };
}

describe("getClinicOverview — Clinic Ready", () => {
  it("starts every step incomplete with the first as the next action", async () => {
    const { owner, clinic } = await fresh();
    const ov = await getClinicOverview(clinic.id, owner.id);

    expect(ov).not.toBeNull();
    expect(ov!.ready.total).toBe(5);
    expect(ov!.ready.completed).toBe(0);
    expect(ov!.ready.percent).toBe(0);
    // Product Office order: first actionable step is "Add your first treatment".
    expect(ov!.ready.nextStep?.key).toBe("treatment");
    expect(ov!.ready.steps.map((s) => s.key)).toEqual([
      "treatment", "patient", "payment", "share", "profile",
    ]);
  });

  it("completes the treatment step and advances the next action once a treatment exists", async () => {
    const { owner, clinic } = await fresh();
    await createService(clinic.id, { name: "Follow-up", durationMinutes: 30, price: 800 });

    const ov = await getClinicOverview(clinic.id, owner.id);
    const treatment = ov!.ready.steps.find((s) => s.key === "treatment");
    expect(treatment?.done).toBe(true);
    expect(ov!.ready.nextStep?.key).toBe("patient"); // advanced
    expect(ov!.ready.percent).toBe(20);
  });

  it("completes the share step after the booking page is marked shared", async () => {
    const { owner, clinic } = await fresh();
    await markBookingShared(clinic.id);

    const ov = await getClinicOverview(clinic.id, owner.id);
    expect(ov!.ready.steps.find((s) => s.key === "share")?.done).toBe(true);
  });

  it("completes the profile step when the clinic's doctor has a bio", async () => {
    const { owner, clinic } = await fresh();
    const { staffProfile } = await createTestStaff(clinic.id, "doctor");
    userIds.push(staffProfile.user_id);
    await prisma.staffProfile.update({ where: { id: staffProfile.id }, data: { bio: "12 years in rehab." } });

    const ov = await getClinicOverview(clinic.id, owner.id);
    expect(ov!.ready.steps.find((s) => s.key === "profile")?.done).toBe(true);
    // The doctor becomes the resolved booking identity.
    expect(ov!.bookingPath).toBe(`/book/${staffProfile.id}`);
  });

  it("returns null for a clinic that doesn't exist", async () => {
    const { owner } = await fresh();
    expect(await getClinicOverview("no-such-clinic", owner.id)).toBeNull();
  });
});

describe("markBookingShared", () => {
  it("sets booking_shared_at once and does not overwrite it", async () => {
    const { clinic } = await fresh();
    const first = await markBookingShared(clinic.id);
    expect(first?.booking_shared_at).toBeTruthy();

    const firstAt = first!.booking_shared_at;
    const second = await markBookingShared(clinic.id);
    expect(second?.booking_shared_at?.getTime()).toBe(firstAt?.getTime()); // unchanged
  });
});

describe("getTodayAppointments", () => {
  it("returns an empty, well-formed result for a clinic with no appointments today", async () => {
    const { clinic } = await fresh();
    const today = await getTodayAppointments(clinic.id);
    expect(today.total).toBe(0);
    expect(today.completed).toBe(0);
    expect(today.appointments).toEqual([]);
  });
});
