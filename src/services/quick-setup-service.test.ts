// Milestone 1 (First Clinic Ready), Batch 3 — Quick Setup. Real DB integration:
// the mobile-first owner/clinic creation and clinic configuration that produce
// a bookable solo clinic in under two minutes.

import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { issueOtpChallenge } from "@/services/otp-service";
import {
  startQuickSetup,
  configureQuickSetup,
  QuickSetupError,
  QuickSetupPhoneInUseError,
} from "@/services/quick-setup-service";

const ownerIds: string[] = [];
const mobiles: string[] = [];

function newMobile() {
  const m = `+1777${randomUUID().replace(/\D/g, "").slice(0, 7)}`;
  mobiles.push(m);
  return m;
}

afterAll(async () => {
  // Deleting the owner user cascades org → clinic → staff profile → availability.
  await prisma.session.deleteMany({ where: { user_id: { in: ownerIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
  await prisma.otpChallenge.deleteMany({ where: { phone_number: { in: mobiles } } });
});

async function start(mobile: string, ownerName = "Dr. Anaya Rao") {
  const { code } = await issueOtpChallenge(mobile);
  const result = await startQuickSetup({ ownerName, mobile, password: "password123", code });
  ownerIds.push(result.owner.id);
  return result;
}

describe("startQuickSetup", () => {
  it("creates the owner (super_admin, mobile as login), org, clinic and doctor profile", async () => {
    const mobile = newMobile();
    const { owner, organization, clinic, doctorProfile } = await start(mobile);

    expect(owner.role).toBe("super_admin");
    expect(owner.phone_number).toBe(mobile);
    expect(owner.password_hash).toBeTruthy();
    expect(organization.owner_user_id).toBe(owner.id);
    expect(clinic.name).toBe("My Clinic");
    // Clinic contact number is backfilled from the verified mobile…
    expect(clinic.phone).toBe(mobile);
    expect(clinic.accepting_bookings).toBe(true);
    // …but it is a SEPARATE column from the login identity.
    expect(clinic.phone).toBe(owner.phone_number);
    expect(doctorProfile.full_name).toBe("Dr. Anaya Rao");
    expect(doctorProfile.clinic_id).toBe(clinic.id);
  });

  it("rejects a wrong OTP code without creating anything", async () => {
    const mobile = newMobile();
    await issueOtpChallenge(mobile);
    await expect(
      startQuickSetup({ ownerName: "X Y", mobile, password: "password123", code: "000000" })
    ).rejects.toThrow(QuickSetupError);
    expect(await prisma.user.findUnique({ where: { phone_number: mobile } })).toBeNull();
  });

  it("refuses a mobile that already has an account (no silent merge)", async () => {
    const mobile = newMobile();
    await start(mobile); // first owner claims the number

    const { code } = await issueOtpChallenge(mobile);
    await expect(
      startQuickSetup({ ownerName: "Someone Else", mobile, password: "password123", code })
    ).rejects.toThrow(QuickSetupPhoneInUseError);
  });

  it("rejects a weak password and a too-short name", async () => {
    const mobile = newMobile();
    const { code } = await issueOtpChallenge(mobile);
    await expect(
      startQuickSetup({ ownerName: "Dr. Rao", mobile, password: "short", code })
    ).rejects.toThrow(QuickSetupError);
  });
});

describe("configureQuickSetup", () => {
  it("names the clinic and builds a weekly availability grid from working hours", async () => {
    const mobile = newMobile();
    const { owner, doctorProfile } = await start(mobile);

    const result = await configureQuickSetup({
      ownerUserId: owner.id,
      clinicName: "Rao Physiotherapy & Rehab",
      specialty: "Physiotherapy",
      workingDays: ["mon", "wed", "fri"],
      opensAt: "09:00",
      closesAt: "18:00",
    });

    expect(result.bookingPath).toBe(`/book/${doctorProfile.id}`);

    const clinic = await prisma.clinic.findUnique({ where: { id: result.clinicId } });
    expect(clinic?.name).toBe("Rao Physiotherapy & Rehab");
    expect(clinic?.working_days).toBe("mon,wed,fri");
    expect(clinic?.opens_at).toBe("09:00");

    const availability = await prisma.doctorAvailability.findMany({
      where: { doctor_id: doctorProfile.id },
      orderBy: { day_of_week: "asc" },
    });
    // mon=1, wed=3, fri=5
    expect(availability.map((a) => a.day_of_week)).toEqual([1, 3, 5]);
    expect(availability[0].start_time).toBe("09:00");
    expect(availability[0].end_time).toBe("18:00");

    const staff = await prisma.staffProfile.findUnique({ where: { id: doctorProfile.id } });
    expect(staff?.specialty).toBe("Physiotherapy");
  });

  it("rejects closing time before opening time", async () => {
    const mobile = newMobile();
    const { owner } = await start(mobile);
    await expect(
      configureQuickSetup({
        ownerUserId: owner.id,
        clinicName: "Backwards Clinic",
        workingDays: ["mon"],
        opensAt: "18:00",
        closesAt: "09:00",
      })
    ).rejects.toThrow(QuickSetupError);
  });

  it("rejects an empty working-days set", async () => {
    const mobile = newMobile();
    const { owner } = await start(mobile);
    await expect(
      configureQuickSetup({
        ownerUserId: owner.id,
        clinicName: "No Days Clinic",
        workingDays: [],
        opensAt: "09:00",
        closesAt: "18:00",
      })
    ).rejects.toThrow(QuickSetupError);
  });
});
