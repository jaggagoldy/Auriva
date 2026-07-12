// Milestone 1 (First Clinic Ready), Batch 2 — the clinic-wide "Accepting
// Bookings" flag + clinic phone, set through updateClinicSettings (the path
// both the owner Settings screen and the booking-status toggle use). Real DB.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";
import { updateClinicSettings } from "@/services/clinic-service";

const orgIds: string[] = [];

afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function freshClinic() {
  const { organization, clinic } = await createTestOrganization();
  orgIds.push(organization.id);
  return clinic;
}

describe("updateClinicSettings — Accepting Bookings + phone (Batch 2)", () => {
  it("defaults accepting_bookings to true for a new clinic", async () => {
    const clinic = await freshClinic();
    expect(clinic.accepting_bookings).toBe(true);
  });

  it("pauses and resumes online bookings", async () => {
    const clinic = await freshClinic();

    const paused = await updateClinicSettings(clinic.id, { accepting_bookings: false });
    expect(paused.accepting_bookings).toBe(false);

    const resumed = await updateClinicSettings(clinic.id, { accepting_bookings: true });
    expect(resumed.accepting_bookings).toBe(true);
  });

  it("sets and trims the clinic phone, and clears it with null", async () => {
    const clinic = await freshClinic();

    const withPhone = await updateClinicSettings(clinic.id, { phone: "  +91 98450 12345  " });
    expect(withPhone.phone).toBe("+91 98450 12345");

    const cleared = await updateClinicSettings(clinic.id, { phone: null });
    expect(cleared.phone).toBeNull();
  });

  it("leaves accepting_bookings untouched when the patch doesn't mention it", async () => {
    const clinic = await freshClinic();
    await updateClinicSettings(clinic.id, { accepting_bookings: false });

    const afterUnrelated = await updateClinicSettings(clinic.id, { phone: "123" });
    expect(afterUnrelated.accepting_bookings).toBe(false); // preserved
  });
});
