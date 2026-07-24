// BRD-043 US-301 (Sprint 3): the role-shaped dashboard contract.
//
// The financial-exclusion assertions here are the single most important test
// in this epic and a hard release gate for US-304 — if anyone ever adds a
// revenue/collections/subscription/team field to the Doctor payload, these
// fail. Real database, real service, matching the codebase convention.

import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createTestOrganization } from "@/test/fixtures";
import { getDashboard, resolveDashboardRole } from "@/services/dashboard-service";

const createdOrgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.organizationMember.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: createdOrgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
});

async function addMember(
  organizationId: string,
  clinicId: string,
  role: "doctor" | "receptionist",
  phone: string
) {
  const user = await prisma.user.create({
    data: { role, phone_number: phone, password_hash: await hashPassword("password123") },
  });
  userIds.push(user.id);
  const profile = await prisma.staffProfile.create({
    data: {
      user_id: user.id,
      clinic_id: clinicId,
      full_name: role === "doctor" ? "Dr. Test Doctor" : "Reception Test",
      specialty: role === "doctor" ? "General Practitioner" : null,
    },
  });
  await prisma.organizationMember.create({ data: { organization_id: organizationId, user_id: user.id, role } });
  return { user, profile };
}

/** Give the owner a StaffProfile so they resolve as Managing Doctor. */
async function makeOwnerPractising(clinicId: string, ownerId: string) {
  await prisma.staffProfile.create({
    data: { user_id: ownerId, clinic_id: clinicId, full_name: "Dr. Owner", specialty: "Physician" },
  });
}

const FINANCIAL_KEY = /revenue|collection|collections|subscription|team|pending_collections/i;

function allKeysDeep(obj: unknown, acc: string[] = []): string[] {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      acc.push(k);
      allKeysDeep(v, acc);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v) => allKeysDeep(v, acc));
  }
  return acc;
}

describe("resolveDashboardRole", () => {
  it("owner WITH a StaffProfile → managing_doctor; WITHOUT → practice_owner", async () => {
    const a = await createTestOrganization();
    createdOrgIds.push(a.organization.id);
    expect(await resolveDashboardRole(a.clinic.id, a.owner.id)).toBe("practice_owner");
    await makeOwnerPractising(a.clinic.id, a.owner.id);
    expect(await resolveDashboardRole(a.clinic.id, a.owner.id)).toBe("managing_doctor");
  });

  it("non-owner doctor → doctor; receptionist → receptionist", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const doc = await addMember(organization.id, clinic.id, "doctor", "+15550320001");
    const rec = await addMember(organization.id, clinic.id, "receptionist", "+15550320002");
    expect(await resolveDashboardRole(clinic.id, doc.user.id)).toBe("doctor");
    expect(await resolveDashboardRole(clinic.id, rec.user.id)).toBe("receptionist");
  });
});

describe("getDashboard — role-shaped payloads (US-301)", () => {
  it("Doctor payload contains NO financial/team fields at all (hard gate for US-304)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const doc = await addMember(organization.id, clinic.id, "doctor", "+15550320010");

    const payload = await getDashboard(clinic.id, doc.user.id);
    expect(payload?.role).toBe("doctor");

    const keys = allKeysDeep(payload);
    const leaked = keys.filter((k) => FINANCIAL_KEY.test(k));
    expect(leaked).toEqual([]);

    // And the whole serialized body must not carry those field names either.
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/"revenue"|"collections"|"subscription"|"pending_collections"|"team"/i);

    // It SHOULD have its clinical shape.
    expect(payload).toHaveProperty("appointments_today");
    expect(payload).toHaveProperty("follow_ups");
    expect(payload).toHaveProperty("recent_consultations");
  });

  it("Managing Doctor payload DOES include revenue, collections and team", async () => {
    const a = await createTestOrganization();
    createdOrgIds.push(a.organization.id);
    await makeOwnerPractising(a.clinic.id, a.owner.id);

    const payload = await getDashboard(a.clinic.id, a.owner.id);
    expect(payload?.role).toBe("managing_doctor");
    expect(payload).toHaveProperty("kpis.revenue_today");
    expect(payload).toHaveProperty("practice_performance.pending_collections");
    expect(payload).toHaveProperty("team");
    expect(payload).toHaveProperty("my_queue");
  });

  it("Practice Owner payload includes business fields but NO personal consultation queue", async () => {
    const a = await createTestOrganization();
    createdOrgIds.push(a.organization.id);
    // owner has no StaffProfile → practice_owner
    const payload = await getDashboard(a.clinic.id, a.owner.id);
    expect(payload?.role).toBe("practice_owner");
    expect(payload).toHaveProperty("kpis.revenue_today");
    expect(payload).toHaveProperty("team");
    expect(payload).not.toHaveProperty("my_queue");
  });

  it("Receptionist payload frames money as 'pending_to_collect' (operational), never revenue", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const rec = await addMember(organization.id, clinic.id, "receptionist", "+15550320020");

    const payload = await getDashboard(clinic.id, rec.user.id);
    expect(payload?.role).toBe("receptionist");
    expect(payload).toHaveProperty("pending_to_collect");
    expect(payload).toHaveProperty("waiting_queue");
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/"revenue"|"collections"/i);
  });
});

// Snapshot contracts (reviewer's Sprint-3 recommendation): freeze the KEY
// SHAPE of each role's payload. Values vary by data/time, so we snapshot the
// sorted set of top-level + nested keys, not the values — a stable, immutable
// contract that CI fails on the moment a field is added or removed from any
// role.
describe("dashboard payload key-shape snapshots (per role)", () => {
  function shape(obj: unknown): string[] {
    return Array.from(new Set(allKeysDeep(obj))).sort();
  }

  it("managing_doctor key-shape", async () => {
    const a = await createTestOrganization();
    createdOrgIds.push(a.organization.id);
    await makeOwnerPractising(a.clinic.id, a.owner.id);
    const p = await getDashboard(a.clinic.id, a.owner.id);
    expect(shape(p)).toMatchInlineSnapshot(`
      [
        "active_count",
        "alerts",
        "appointments_today",
        "clinic_name",
        "collected_today",
        "greeting",
        "in_my_queue",
        "initials",
        "is_owner",
        "kpis",
        "members",
        "my_queue",
        "name",
        "owner_name",
        "pending_collections",
        "practice_performance",
        "revenue_today",
        "role",
        "status",
        "team",
        "team_active",
      ]
    `);
  });

  it("practice_owner key-shape", async () => {
    const a = await createTestOrganization();
    createdOrgIds.push(a.organization.id);
    const p = await getDashboard(a.clinic.id, a.owner.id);
    expect(shape(p)).toMatchInlineSnapshot(`
      [
        "active_count",
        "alerts",
        "appointments_all_doctors",
        "appointments_today",
        "clinic_name",
        "greeting",
        "kpis",
        "members",
        "owner_name",
        "pending_collections",
        "revenue_today",
        "role",
        "team",
        "team_active",
      ]
    `);
  });

  it("doctor key-shape (no financial keys present)", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const doc = await addMember(organization.id, clinic.id, "doctor", "+15550320030");
    const p = await getDashboard(clinic.id, doc.user.id);
    expect(shape(p)).toMatchInlineSnapshot(`
      [
        "appointments_today",
        "clinic_name",
        "follow_ups",
        "greeting",
        "next_patient",
        "owner_name",
        "recent_consultations",
        "role",
      ]
    `);
  });

  it("receptionist key-shape", async () => {
    const { organization, clinic } = await createTestOrganization();
    createdOrgIds.push(organization.id);
    const rec = await addMember(organization.id, clinic.id, "receptionist", "+15550320040");
    const p = await getDashboard(clinic.id, rec.user.id);
    expect(shape(p)).toMatchInlineSnapshot(`
      [
        "amount",
        "appointments_today",
        "clinic_name",
        "count",
        "greeting",
        "kpis",
        "owner_name",
        "pending_to_collect",
        "role",
        "today_appointments",
        "waiting_now",
        "waiting_queue",
        "walk_ins",
      ]
    `);
  });
});
