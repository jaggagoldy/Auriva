// BRD-043 Sprint 4 — the correctness gates the Product Office flagged as the
// critical review focus: idempotency, atomicity, conflict detection,
// owner-protection, access revocation, and reconciliation gating. Real DB.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createTestOrganization } from "@/test/fixtures";
import {
  archiveMember,
  getArchiveConflicts,
  getTeam,
  reactivateMember,
  suspendMember,
  OwnerProtectedError,
  ReconciliationRequiredError,
  InvalidReassignmentError,
} from "@/services/membership-service";

const createdOrgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { clinic: { organization_id: { in: createdOrgIds } } } });
  await prisma.patientProfile.deleteMany({ where: { registered_by_clinic_id: { in: [] } } }).catch(() => {});
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.organizationMember.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

async function addMember(orgId: string, clinicId: string, role: "doctor" | "receptionist", phone: string) {
  const user = await prisma.user.create({
    data: { role, phone_number: phone, password_hash: await hashPassword("password123") },
  });
  userIds.push(user.id);
  const profile = await prisma.staffProfile.create({
    data: { user_id: user.id, clinic_id: clinicId, full_name: `${role}-${phone}`, specialty: role === "doctor" ? "General" : null },
  });
  await prisma.organizationMember.create({ data: { organization_id: orgId, user_id: user.id, role } });
  return { user, profile };
}

async function makePatient(name: string) {
  const p = await prisma.patientProfile.create({
    data: { full_name: name, blood_group: "O-Positive", health_id: `AUR-${Math.random().toString(36).slice(2, 10).toUpperCase()}` },
  });
  return p;
}

describe("suspend / reactivate", () => {
  it("suspends a member: status flips, login gate closes, sessions revoked, audit written once", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user, profile } = await addMember(organization.id, clinic.id, "receptionist", "+15550340001");
    // give them a live session
    await prisma.session.create({ data: { token_hash: "hash-" + user.id, user_id: user.id, role: user.role, expires_at: new Date(Date.now() + 3600000) } });

    await suspendMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "owner-actor" });

    const reloaded = await prisma.staffProfile.findUnique({ where: { id: profile.id } });
    expect(reloaded?.membership_status).toBe("suspended");
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.is_active).toBe(false);
    expect(await prisma.session.count({ where: { user_id: user.id } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { organization_id: organization.id, action: "member_suspended" } })).toBe(1);
  });

  it("suspending twice is idempotent — no duplicate audit row", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile } = await addMember(organization.id, clinic.id, "receptionist", "+15550340002");

    await suspendMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "a" });
    await suspendMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "a" });

    expect(await prisma.auditLog.count({ where: { organization_id: organization.id, action: "member_suspended" } })).toBe(1);
  });

  it("reactivate restores active + login gate; reactivating twice is idempotent", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user, profile } = await addMember(organization.id, clinic.id, "doctor", "+15550340003");
    await suspendMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "a" });

    await reactivateMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "a" });
    await reactivateMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "a" });

    expect((await prisma.staffProfile.findUnique({ where: { id: profile.id } }))?.membership_status).toBe("active");
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.is_active).toBe(true);
    expect(await prisma.auditLog.count({ where: { organization_id: organization.id, action: "member_reactivated" } })).toBe(1);
  });

  it("the owner can never be suspended", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const ownerProfile = await prisma.staffProfile.create({
      data: { user_id: owner.id, clinic_id: clinic.id, full_name: "Owner Doc", specialty: "Physician" },
    });
    await expect(
      suspendMember({ organizationId: organization.id, staffProfileId: ownerProfile.id, actorUserId: owner.id })
    ).rejects.toThrow(OwnerProtectedError);
  });
});

describe("archive conflict detection (US-403)", () => {
  it("a receptionist always has zero conflicts", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile } = await addMember(organization.id, clinic.id, "receptionist", "+15550340010");
    expect(await getArchiveConflicts(profile.id)).toEqual([]);
  });

  it("a doctor with a future appointment and an active consultation surfaces both", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile } = await addMember(organization.id, clinic.id, "doctor", "+15550340011");
    const pat = await makePatient("Future Fred");
    const pat2 = await makePatient("Consult Cora");
    await prisma.appointment.create({ data: { patient_id: pat.id, doctor_id: profile.id, clinic_id: clinic.id, scheduled_time: new Date(Date.now() + 86400000), status: "scheduled" } });
    await prisma.appointment.create({ data: { patient_id: pat2.id, doctor_id: profile.id, clinic_id: clinic.id, scheduled_time: new Date(Date.now() - 600000), status: "in_consultation" } });

    const conflicts = await getArchiveConflicts(profile.id);
    expect(conflicts.length).toBe(2);
    expect(conflicts.some((c) => c.kind === "consultation")).toBe(true);
    expect(conflicts.some((c) => c.kind === "appointment")).toBe(true);
  });

  it("a completed / cancelled past appointment is NOT a conflict", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile } = await addMember(organization.id, clinic.id, "doctor", "+15550340012");
    const pat = await makePatient("Done Dan");
    await prisma.appointment.create({ data: { patient_id: pat.id, doctor_id: profile.id, clinic_id: clinic.id, scheduled_time: new Date(Date.now() - 86400000), status: "completed" } });
    expect(await getArchiveConflicts(profile.id)).toEqual([]);
  });
});

describe("archive (US-404/405)", () => {
  it("archives a no-conflict member immediately (US-405)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { user, profile } = await addMember(organization.id, clinic.id, "receptionist", "+15550340020");

    const result = await archiveMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "owner" });
    expect(result.membership_status).toBe("archived");
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.is_active).toBe(false);
  });

  it("BLOCKS archive when conflicts are unreassigned (US-404 gate)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile } = await addMember(organization.id, clinic.id, "doctor", "+15550340021");
    await addMember(organization.id, clinic.id, "doctor", "+15550340022"); // a reassignment target exists
    const pat = await makePatient("Blocking Bob");
    await prisma.appointment.create({ data: { patient_id: pat.id, doctor_id: profile.id, clinic_id: clinic.id, scheduled_time: new Date(Date.now() + 86400000), status: "scheduled" } });

    await expect(
      archiveMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "owner", reassignments: {} })
    ).rejects.toThrow(ReconciliationRequiredError);

    // Nothing changed — still active (atomic: no partial archive).
    expect((await prisma.staffProfile.findUnique({ where: { id: profile.id } }))?.membership_status).toBe("active");
  });

  it("reassigns every conflict and archives atomically (US-404 happy path)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile: leaving } = await addMember(organization.id, clinic.id, "doctor", "+15550340030");
    const { profile: keeping } = await addMember(organization.id, clinic.id, "doctor", "+15550340031");
    const pat = await makePatient("Reassign Rita");
    const appt = await prisma.appointment.create({ data: { patient_id: pat.id, doctor_id: leaving.id, clinic_id: clinic.id, scheduled_time: new Date(Date.now() + 86400000), status: "scheduled" } });

    const result = await archiveMember({
      organizationId: organization.id,
      staffProfileId: leaving.id,
      actorUserId: "owner",
      reassignments: { [appt.id]: keeping.id },
    });
    expect(result.membership_status).toBe("archived");
    // The appointment now belongs to the kept doctor, never lost/cancelled.
    const moved = await prisma.appointment.findUnique({ where: { id: appt.id } });
    expect(moved?.doctor_id).toBe(keeping.id);
    expect(moved?.status).toBe("scheduled");
  });

  it("rejects a reassignment target that isn't an active doctor of the clinic", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile: leaving } = await addMember(organization.id, clinic.id, "doctor", "+15550340040");
    const pat = await makePatient("Bad Target");
    const appt = await prisma.appointment.create({ data: { patient_id: pat.id, doctor_id: leaving.id, clinic_id: clinic.id, scheduled_time: new Date(Date.now() + 86400000), status: "scheduled" } });

    await expect(
      archiveMember({ organizationId: organization.id, staffProfileId: leaving.id, actorUserId: "owner", reassignments: { [appt.id]: "not-a-real-doctor" } })
    ).rejects.toThrow(InvalidReassignmentError);
  });

  it("archiving an already-archived member is an idempotent no-op (safe retry)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const { profile } = await addMember(organization.id, clinic.id, "receptionist", "+15550340050");
    await archiveMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "owner" });
    await archiveMember({ organizationId: organization.id, staffProfileId: profile.id, actorUserId: "owner" });
    expect(await prisma.auditLog.count({ where: { organization_id: organization.id, action: "member_archived" } })).toBe(1);
  });

  it("the owner can never be archived", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const ownerProfile = await prisma.staffProfile.create({
      data: { user_id: owner.id, clinic_id: clinic.id, full_name: "Owner", specialty: "Physician" },
    });
    await expect(
      archiveMember({ organizationId: organization.id, staffProfileId: ownerProfile.id, actorUserId: owner.id })
    ).rejects.toThrow(OwnerProtectedError);
  });
});

describe("getTeam growth indicator (US-401)", () => {
  it("reports live seat usage excluding the owner and suspended/archived members", async () => {
    const { organization, clinic, owner } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    await prisma.staffProfile.create({ data: { user_id: owner.id, clinic_id: clinic.id, full_name: "Owner Doc", specialty: "Physician" } });
    const { profile: doc } = await addMember(organization.id, clinic.id, "doctor", "+15550340060");
    await addMember(organization.id, clinic.id, "receptionist", "+15550340061");

    let team = await getTeam(clinic.id, organization.id);
    expect(team.seats_used).toBe(2); // doctor + receptionist, owner free
    expect(team.seats_max).toBe(2);
    expect(team.members.find((m) => m.is_owner)?.role).toBe("Managing Doctor");

    // Suspending the doctor frees a seat.
    await suspendMember({ organizationId: organization.id, staffProfileId: doc.id, actorUserId: "owner" });
    team = await getTeam(clinic.id, organization.id);
    expect(team.seats_used).toBe(1);
  });
});
