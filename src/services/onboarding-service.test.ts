// TEST-4: duplicate-creation-attempt regression coverage (DATA-2) for
// Clinic creation — real database.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createSession } from "@/api/session";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import {
  createClinic,
  setStaffActive,
  setStaffCapabilities,
  createInvitation,
  acceptInvitation,
  getInvitationByToken,
  checkInvitePhone,
  revokeInvitation,
  ClinicNameConflictError,
  OnboardingInputError,
  InvitationExpiredError,
  DuplicateActiveMemberError,
  SeatLimitReachedError,
} from "@/services/onboarding-service";
import { hashPassword } from "@/lib/password";

const createdOrgIds: string[] = [];

afterAll(async () => {
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

describe("createClinic", () => {
  it("creates a second clinic/branch successfully", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const clinic = await createClinic({
      organizationId: organization.id,
      ownerUserId: owner.id,
      name: "Downtown Branch",
      address: "1 Main St",
    });
    expect(clinic.name).toBe("Downtown Branch");
  });

  it("rejects a duplicate clinic name within the same organization with a 409-shaped conflict", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await createClinic({
      organizationId: organization.id,
      ownerUserId: owner.id,
      name: "Uptown Branch",
      address: "2 Main St",
    });
    await expect(
      createClinic({
        organizationId: organization.id,
        ownerUserId: owner.id,
        name: "Uptown Branch",
        address: "3 Main St",
      })
    ).rejects.toThrow(ClinicNameConflictError);
  });

  it("rejects a missing name/address as a validation failure, not a conflict", async () => {
    const { organization, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    await expect(
      createClinic({ organizationId: organization.id, ownerUserId: owner.id, name: "", address: "" })
    ).rejects.toThrow(OnboardingInputError);
  });
});

describe("setStaffActive", () => {
  const staffUserIds: string[] = [];

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { user_id: { in: staffUserIds } } });
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: staffUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staffUserIds } } });
  });

  it("revokes live sessions and clears the login gate on deactivation", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: staff, staffProfile } = await createTestStaff(clinic.id, "receptionist");
    staffUserIds.push(staff.id);

    await createSession(staff.id, staff.role);
    expect(await prisma.session.count({ where: { user_id: staff.id } })).toBe(1);

    await setStaffActive({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      isActive: false,
    });

    expect(await prisma.session.count({ where: { user_id: staff.id } })).toBe(0);
    const updated = await prisma.user.findUnique({ where: { id: staff.id } });
    expect(updated?.is_active).toBe(false);
  });
});

describe("setStaffCapabilities", () => {
  const staffUserIds: string[] = [];

  afterAll(async () => {
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: staffUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: staffUserIds } } });
  });

  it("grants reception to a doctor (the solo practitioner preset) and persists it", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    staffUserIds.push(doctor.id);

    const updated = await setStaffCapabilities({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      capabilities: ["reception"],
    });

    expect(updated.capabilities).toBe(JSON.stringify(["reception"]));
    const audit = await prisma.auditLog.findFirst({
      where: { organization_id: organization.id, action: "staff_capabilities_updated" },
    });
    expect(audit).not.toBeNull();
  });

  it("clears grants back to role defaults when given an empty list", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    staffUserIds.push(doctor.id);

    await setStaffCapabilities({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      capabilities: ["reception"],
    });
    const cleared = await setStaffCapabilities({
      organizationId: organization.id,
      staffProfileId: staffProfile.id,
      actorUserId: owner.id,
      capabilities: [],
    });
    expect(cleared.capabilities).toBeNull();
  });

  it("rejects a non-grantable capability (e.g. admin_portal)", async () => {
    const { organization, owner, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user: doctor, staffProfile } = await createTestStaff(clinic.id, "doctor");
    staffUserIds.push(doctor.id);

    await expect(
      setStaffCapabilities({
        organizationId: organization.id,
        staffProfileId: staffProfile.id,
        actorUserId: owner.id,
        // admin_portal is a valid Capability type but not owner-grantable
        capabilities: ["admin_portal"],
      })
    ).rejects.toThrow(OnboardingInputError);
  });
});

// BRD-043 US-102 (Sprint 1): 72h invitation expiry, server-enforced.
describe("createInvitation / acceptInvitation — expiry (US-102)", () => {
  const createdUserIdsForExpiry: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIdsForExpiry } } });
  });

  it("sets expires_at ~72h out at creation", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const before = Date.now();
    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `invitee-${Date.now()}@test.local`,
      fullName: "New Doctor",
      role: "doctor",
    });
    const expectedMs = before + 72 * 60 * 60 * 1000;
    expect(invitation.expires_at).not.toBeNull();
    expect(Math.abs(invitation.expires_at!.getTime() - expectedMs)).toBeLessThan(5000);
  });

  it("rejects acceptance of an invitation past its 72h window, server-side", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `expired-${Date.now()}@test.local`,
      fullName: "Late Invitee",
      role: "receptionist",
    });
    // Simulate a backdated invite — created and expired 1 hour ago.
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { expires_at: new Date(Date.now() - 60 * 60 * 1000) },
    });

    await expect(acceptInvitation({ token: invitation.token, password: "password123" })).rejects.toThrow(
      InvitationExpiredError
    );

    const reloaded = await prisma.invitation.findUnique({ where: { id: invitation.id } });
    expect(reloaded?.status).toBe("expired");
  });

  it("also rejects reading an expired invitation via the public token lookup", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `expired-read-${Date.now()}@test.local`,
      fullName: "Late Reader",
      role: "receptionist",
    });
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { expires_at: new Date(Date.now() - 60 * 60 * 1000) },
    });

    await expect(getInvitationByToken(invitation.token)).rejects.toThrow(InvitationExpiredError);
  });

  it("resending an invite (supersede) resets the 72h window on the new token", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const email = `resend-${Date.now()}@test.local`;

    const first = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email,
      fullName: "Resent Invitee",
      role: "receptionist",
    });
    const second = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email,
      fullName: "Resent Invitee",
      role: "receptionist",
    });

    const reloadedFirst = await prisma.invitation.findUnique({ where: { id: first.id } });
    expect(reloadedFirst?.status).toBe("revoked");
    expect(second.token).not.toBe(first.token);
    expect(second.expires_at!.getTime()).toBeGreaterThan(Date.now() + 71 * 60 * 60 * 1000);
  });

  it("accepts a still-pending, unexpired invitation normally", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invitation = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      email: `live-${Date.now()}@test.local`,
      fullName: "Live Invitee",
      role: "receptionist",
    });

    const { user } = await acceptInvitation({ token: invitation.token, password: "password123" });
    createdUserIdsForExpiry.push(user.id);
    expect(user.email).toBe(invitation.email);
  });
});

// BRD-043 Sprint 2: phone-first invites, seat cap (US-503), duplicate-active
// rejection (US-205), and the inline phone-check (US-202).
describe("createInvitation — phone-first, seat cap & duplicate guard (Sprint 2)", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.organizationMember.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  /** Create a real active member (User + StaffProfile + OrganizationMember) at a clinic. */
  async function addActiveMember(
    organizationId: string,
    clinicId: string,
    role: "doctor" | "receptionist",
    phone: string
  ) {
    const user = await prisma.user.create({
      data: { role, phone_number: phone, password_hash: await hashPassword("password123") },
    });
    userIds.push(user.id);
    await prisma.staffProfile.create({
      data: {
        user_id: user.id,
        clinic_id: clinicId,
        full_name: `Member ${phone}`,
        specialty: role === "doctor" ? "General Practitioner" : null,
      },
    });
    await prisma.organizationMember.create({
      data: { organization_id: organizationId, user_id: user.id, role },
    });
    return user;
  }

  it("creates a phone-based invite (no email) with a 72h expiry", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    const invite = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      phone: "+15550311001",
      fullName: "Dr. Phone Invite",
      role: "doctor",
      specialty: "Dermatologist",
    });
    expect(invite.phone).toBe("+15550311001");
    expect(invite.email).toBeNull();
    expect(invite.expires_at).not.toBeNull();
  });

  it("rejects re-inviting an already-active member (US-205)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await addActiveMember(organization.id, clinic.id, "doctor", "+15550311010");

    await expect(
      createInvitation({
        organizationId: organization.id,
        clinicId: clinic.id,
        phone: "+15550311010",
        fullName: "Same Person",
        role: "doctor",
      })
    ).rejects.toThrow(DuplicateActiveMemberError);
  });

  it("enforces the Solo seat cap: 1 doctor + 1 receptionist, then rejects a 3rd (US-503)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    // Solo (default plan). Owner is free. Add the 1 doctor + 1 receptionist seats.
    await addActiveMember(organization.id, clinic.id, "doctor", "+15550311020");
    await addActiveMember(organization.id, clinic.id, "receptionist", "+15550311021");

    // Both seats now full → any further invite is rejected.
    await expect(
      createInvitation({
        organizationId: organization.id,
        clinicId: clinic.id,
        phone: "+15550311022",
        fullName: "Third Wheel",
        role: "receptionist",
      })
    ).rejects.toThrow(SeatLimitReachedError);
  });

  it("accepting a phone-based invite creates a User whose login identity is that phone (US-204)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const invite = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      phone: "+15550311015",
      fullName: "Accept Me",
      role: "receptionist",
    });

    const { user } = await acceptInvitation({ token: invite.token, password: "password123" });
    userIds.push(user.id);
    expect(user.phone_number).toBe("+15550311015");
    expect(user.email).toBeNull();
  });

  it("one-under the cap still succeeds", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await addActiveMember(organization.id, clinic.id, "doctor", "+15550311030");

    // 1 doctor used, 0 receptionists — a receptionist invite fits.
    const invite = await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      phone: "+15550311031",
      fullName: "Front Desk",
      role: "receptionist",
    });
    expect(invite.id).toBeTruthy();
  });

  it("a pending invite consumes a seat (cannot out-invite the cap)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await addActiveMember(organization.id, clinic.id, "doctor", "+15550311040");

    // First receptionist invite (pending) takes the last Solo seat.
    await createInvitation({
      organizationId: organization.id,
      clinicId: clinic.id,
      phone: "+15550311041",
      fullName: "Pending One",
      role: "receptionist",
    });
    // A second receptionist invite must now be rejected — the pending one counts.
    await expect(
      createInvitation({
        organizationId: organization.id,
        clinicId: clinic.id,
        phone: "+15550311042",
        fullName: "Pending Two",
        role: "receptionist",
      })
    ).rejects.toThrow(SeatLimitReachedError);
  });

  it("suspending a member frees their seat", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const doc = await addActiveMember(organization.id, clinic.id, "doctor", "+15550311050");
    const rec = await addActiveMember(organization.id, clinic.id, "receptionist", "+15550311051");
    void doc;

    // At 2/2 — blocked.
    await expect(
      createInvitation({
        organizationId: organization.id, clinicId: clinic.id,
        phone: "+15550311052", fullName: "Blocked", role: "receptionist",
      })
    ).rejects.toThrow(SeatLimitReachedError);

    // Suspend the receptionist → their seat frees.
    await prisma.staffProfile.updateMany({
      where: { user_id: rec.id },
      data: { membership_status: "suspended" },
    });

    const invite = await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550311053", fullName: "Now Fits", role: "receptionist",
    });
    expect(invite.id).toBeTruthy();
  });

  // Product Office send-back (Sprint 2 review): archived members — like
  // suspended ones — must NOT consume a seat.
  it("archived members don't consume a seat", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await addActiveMember(organization.id, clinic.id, "doctor", "+15550311060");
    const rec = await addActiveMember(organization.id, clinic.id, "receptionist", "+15550311061");

    // Archive the receptionist → their seat frees (proves 'archived' is
    // excluded, not just 'suspended').
    await prisma.staffProfile.updateMany({
      where: { user_id: rec.id },
      data: { membership_status: "archived" },
    });

    const invite = await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550311062", fullName: "Replacement", role: "receptionist",
    });
    expect(invite.id).toBeTruthy();
  });

  // Product Office send-back: an EXPIRED prior invite must not block
  // re-inviting the same number.
  it("re-inviting a phone whose prior invite expired succeeds", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const first = await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550311070", fullName: "Try Again", role: "receptionist",
    });
    // Simulate the lazy-expiry sweep having already marked it expired.
    await prisma.invitation.update({
      where: { id: first.id },
      data: { status: "expired", expires_at: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const second = await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550311070", fullName: "Try Again", role: "receptionist",
    });
    expect(second.id).toBeTruthy();
    expect(second.status).toBe("pending");
  });

  // Product Office send-back: revoke → immediately re-invite the same number.
  it("revoking then re-inviting the same phone succeeds", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const first = await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550311080", fullName: "Changed Mind", role: "doctor",
    });
    await revokeInvitation(first.id, organization.id);

    const second = await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550311080", fullName: "Changed Mind", role: "doctor",
    });
    expect(second.id).toBeTruthy();
    expect(second.status).toBe("pending");
  });
});

describe("checkInvitePhone — inline validation states (US-202)", () => {
  const userIds: string[] = [];

  afterAll(async () => {
    await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.organizationMember.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("returns 'available' for an unknown number", async () => {
    const { organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    expect((await checkInvitePhone(organization.id, "+15550312001")).status).toBe("available");
  });

  it("returns 'active' for an existing active member's number", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const user = await prisma.user.create({
      data: { role: "doctor", phone_number: "+15550312010", password_hash: await hashPassword("password123") },
    });
    userIds.push(user.id);
    await prisma.staffProfile.create({ data: { user_id: user.id, clinic_id: clinic.id, full_name: "Active Doc" } });
    await prisma.organizationMember.create({ data: { organization_id: organization.id, user_id: user.id, role: "doctor" } });

    expect((await checkInvitePhone(organization.id, "+15550312010")).status).toBe("active");
  });

  it("returns 'invited' when a pending invite exists for the number", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await createInvitation({
      organizationId: organization.id, clinicId: clinic.id,
      phone: "+15550312020", fullName: "Pending Person", role: "receptionist",
    });
    expect((await checkInvitePhone(organization.id, "+15550312020")).status).toBe("invited");
  });
});
