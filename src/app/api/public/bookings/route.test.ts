// H3 (pilot-blocking): the public booking endpoint's per-doctor rate cap.
// Proves that even when the IP and phone are rotated on every request (so those
// two limits never trip), a single doctor's public calendar cannot be flooded
// beyond the per-doctor cap. Real route handler + real database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { __resetRateLimitsForTests } from "@/lib/rate-limit";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";

import { POST } from "./route";

// A clearly-invalid (past) slot so bookPublicAppointment rejects downstream and
// persists nothing — the rate-limit check runs first regardless, which is all
// this test exercises.
const PAST_SLOT = "2000-01-01T10:00:00.000Z";

function bookingRequest(doctorId: string, i: number) {
  return new NextRequest("http://localhost/api/public/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.0.0.${i}`, // unique IP each call → IP limit never trips
    },
    body: JSON.stringify({
      doctor_id: doctorId,
      patient_name: `Spam ${i}`,
      patient_phone: `+1555${String(100000 + i)}`, // unique phone each call → phone limit never trips
      scheduled_time: PAST_SLOT,
    }),
  });
}

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

beforeEach(() => {
  __resetRateLimitsForTests();
});

describe("POST /api/public/bookings — per-doctor flood cap (H3)", () => {
  it("caps public bookings per doctor even as IP and phone rotate", async () => {
    const { owner, organization, clinic } = await createTestOrganization();
    const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
    createdOrgIds.push(organization.id);
    createdUserIds.push(owner.id, user.id);

    // The cap is 20/hour for a single doctor. The first 20 attempts must not be
    // blocked by rate limiting (they fail downstream on the past slot, never 429).
    for (let i = 0; i < 20; i++) {
      const res = await POST(bookingRequest(staffProfile.id, i));
      expect(res.status).not.toBe(429);
    }

    // The 21st, still with a fresh IP and phone, trips the per-doctor cap.
    const blocked = await POST(bookingRequest(staffProfile.id, 999));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });
});
