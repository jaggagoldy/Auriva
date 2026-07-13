// BRD-043 Sprint 4 — Team Membership Lifecycle (US-402..405).
//
// The highest-risk sprint: the first destructive operations. Two hard rules,
// per the Product Office Sprint-3 review, are baked in here:
//
//   1. IDEMPOTENCY. Suspending an already-suspended member, archiving an
//      already-archived one, reactivating an already-active one, or a
//      retried request after a timeout — all no-op cleanly: no duplicate
//      audit rows, no duplicate events, no inconsistent state.
//
//   2. ATOMICITY. Archive-with-reassignment persists the appointment
//      reassignments + the status change + the audit row in ONE Prisma
//      $transaction — they all succeed or all roll back. The event is
//      published only AFTER the transaction commits, via the existing
//      reliable event platform (its own retry/DLQ), so a retry can never
//      duplicate the business change (the second attempt sees 'archived'
//      and no-ops before touching anything).
//
// Frozen business rules enforced: the Owner can never be suspended or
// archived; archiving a doctor with future appointments / an active
// consultation is BLOCKED until every conflict is reassigned to another
// ACTIVE doctor — auto-cancel and retain-on-archived-doctor are never
// offered or accepted.

import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { logger } from "@/api/logger";
import { planLimits } from "@/domain/subscription";

export class MemberNotFoundError extends Error {}
export class OwnerProtectedError extends Error {}
export class ReconciliationRequiredError extends Error {
  constructor(
    message: string,
    public conflicts: ArchiveConflict[]
  ) {
    super(message);
  }
}
export class InvalidReassignmentError extends Error {}

export type MembershipStatus = "active" | "suspended" | "archived";

export interface ArchiveConflict {
  appointment_id: string;
  patient_name: string;
  scheduled_time: string; // ISO
  status: string;
  kind: "appointment" | "consultation";
}

// Appointment states that still "belong to" a doctor and would be orphaned by
// an archive: anything not already finished/cancelled.
const OPEN_STATUSES = ["scheduled", "checked_in", "waiting", "in_consultation"] as const;

async function loadMember(organizationId: string, staffProfileId: string) {
  const profile = await prisma.staffProfile.findUnique({
    where: { id: staffProfileId },
    include: { clinic: { select: { organization_id: true } }, user: { select: { id: true } } },
  });
  if (!profile || profile.clinic.organization_id !== organizationId) {
    throw new MemberNotFoundError("Team member not found in this organization.");
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { owner_user_id: true },
  });
  const isOwner = org?.owner_user_id === profile.user_id;
  return { profile, isOwner };
}

/**
 * US-403: the conflicts that block archiving a doctor — future scheduled
 * appointments (not yet completed/cancelled) and any in-progress
 * consultation. A receptionist owns no appointments, so this is always empty
 * for them.
 */
export async function getArchiveConflicts(staffProfileId: string): Promise<ArchiveConflict[]> {
  const now = new Date();
  const appts = await prisma.appointment.findMany({
    where: {
      doctor_id: staffProfileId,
      status: { in: OPEN_STATUSES as unknown as string[] },
      OR: [{ scheduled_time: { gte: now } }, { status: "in_consultation" }],
    },
    orderBy: { scheduled_time: "asc" },
    select: {
      id: true,
      scheduled_time: true,
      status: true,
      patient: { select: { full_name: true } },
    },
  });
  return appts.map((a) => ({
    appointment_id: a.id,
    patient_name: a.patient?.full_name ?? "Unknown",
    scheduled_time: a.scheduled_time.toISOString(),
    status: a.status,
    kind: a.status === "in_consultation" ? "consultation" : "appointment",
  }));
}

/** Active doctors of the clinic other than the one being archived — the valid
 * reassignment targets. (specialty != null is the codebase's doctor signal.) */
export async function reassignmentTargets(clinicId: string, excludeStaffId: string) {
  const docs = await prisma.staffProfile.findMany({
    where: {
      clinic_id: clinicId,
      membership_status: "active",
      is_active: true,
      specialty: { not: null },
      id: { not: excludeStaffId },
    },
    select: { id: true, full_name: true },
    orderBy: { full_name: "asc" },
  });
  return docs;
}

async function transitionStatus(
  organizationId: string,
  staffProfileId: string,
  actorUserId: string,
  target: "suspended" | "active",
) {
  const { profile, isOwner } = await loadMember(organizationId, staffProfileId);
  if (isOwner) {
    throw new OwnerProtectedError("The practice owner cannot be suspended or archived.");
  }
  // Idempotent: already in the target state → no-op, no event, no audit.
  if (profile.membership_status === target) {
    return profile;
  }
  const suspending = target === "suspended";

  await prisma.$transaction([
    prisma.staffProfile.update({
      where: { id: profile.id },
      // is_active moves in lock-step so the existing login gate + session
      // revocation enforce access immediately (membership_status is the
      // lifecycle label; is_active is the enforcement gate).
      data: { membership_status: target, is_active: !suspending },
    }),
    prisma.user.update({ where: { id: profile.user_id }, data: { is_active: !suspending } }),
    // Revoke live sessions on suspend so access ends now, not at token expiry.
    ...(suspending ? [prisma.session.deleteMany({ where: { user_id: profile.user_id } })] : []),
    prisma.auditLog.create({
      data: {
        organization_id: organizationId,
        actor_user_id: actorUserId,
        action: suspending ? "member_suspended" : "member_reactivated",
        detail: profile.full_name,
      },
    }),
  ]);

  await publishEvent({
    eventType: suspending ? "staff.member_suspended" : "staff.member_reactivated",
    organizationId,
    entityId: profile.id,
    correlationId: `member-${target}-${profile.id}`,
    actorId: actorUserId,
    payload: { staffProfileId: profile.id },
  });
  logger.info(suspending ? "member.suspended" : "member.reactivated", { organizationId, staffProfileId: profile.id, actorUserId });

  return prisma.staffProfile.findUniqueOrThrow({ where: { id: profile.id } });
}

export function suspendMember(input: { organizationId: string; staffProfileId: string; actorUserId: string }) {
  return transitionStatus(input.organizationId, input.staffProfileId, input.actorUserId, "suspended");
}
export function reactivateMember(input: { organizationId: string; staffProfileId: string; actorUserId: string }) {
  return transitionStatus(input.organizationId, input.staffProfileId, input.actorUserId, "active");
}

/**
 * US-404/405: archive a member. If they have conflicts (future appointments /
 * active consultation), EVERY conflict must be covered by `reassignments`
 * (appointmentId → an active doctor's staffProfileId) or the whole thing is
 * rejected with ReconciliationRequiredError. Reassignment + status change +
 * audit commit atomically; the event publishes after commit. Idempotent: an
 * already-archived member is a clean no-op.
 */
export async function archiveMember(input: {
  organizationId: string;
  staffProfileId: string;
  actorUserId: string;
  reassignments?: Record<string, string>;
}) {
  const { profile, isOwner } = await loadMember(input.organizationId, input.staffProfileId);
  if (isOwner) {
    throw new OwnerProtectedError("The practice owner cannot be archived.");
  }
  // Idempotent: already archived → no-op (safe on retry).
  if (profile.membership_status === "archived") {
    return profile;
  }

  const conflicts = await getArchiveConflicts(profile.id);
  const reassignments = input.reassignments ?? {};

  if (conflicts.length > 0) {
    // Every conflict must be covered; auto-cancel / retain-on-archived are
    // never accepted — the only resolution is reassignment to another doctor.
    const uncovered = conflicts.filter((c) => !reassignments[c.appointment_id]);
    if (uncovered.length > 0) {
      throw new ReconciliationRequiredError(
        `${uncovered.length} of ${conflicts.length} item(s) still need reassignment before ${profile.full_name} can be archived.`,
        conflicts,
      );
    }
    // Validate every target is a real active doctor of this clinic (not the
    // member being archived) — never trust the client's map.
    const targets = await reassignmentTargets(profile.clinic_id, profile.id);
    const validIds = new Set(targets.map((t) => t.id));
    for (const c of conflicts) {
      if (!validIds.has(reassignments[c.appointment_id])) {
        throw new InvalidReassignmentError("Every item must be reassigned to an active doctor of this clinic.");
      }
    }
  }

  const coveredAppointmentIds = new Set(conflicts.map((c) => c.appointment_id));

  await prisma.$transaction([
    // Reassign each conflicting appointment to its chosen active doctor.
    ...conflicts.map((c) =>
      prisma.appointment.update({
        where: { id: c.appointment_id },
        data: { doctor_id: reassignments[c.appointment_id] },
      }),
    ),
    prisma.staffProfile.update({
      where: { id: profile.id },
      data: { membership_status: "archived", is_active: false },
    }),
    prisma.user.update({ where: { id: profile.user_id }, data: { is_active: false } }),
    prisma.session.deleteMany({ where: { user_id: profile.user_id } }),
    prisma.auditLog.create({
      data: {
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId,
        action: "member_archived",
        detail:
          conflicts.length > 0
            ? `${profile.full_name} — ${conflicts.length} item(s) reassigned`
            : profile.full_name,
      },
    }),
  ]);

  await publishEvent({
    eventType: "staff.member_archived",
    organizationId: input.organizationId,
    entityId: profile.id,
    correlationId: `member-archived-${profile.id}`,
    actorId: input.actorUserId,
    payload: { staffProfileId: profile.id, reassignedCount: coveredAppointmentIds.size },
  });
  logger.info("member.archived", { organizationId: input.organizationId, staffProfileId: profile.id, reassignedCount: coveredAppointmentIds.size });

  return prisma.staffProfile.findUniqueOrThrow({ where: { id: profile.id } });
}

/** US-401: the team roster + growth indicator numbers (live, never cached). */
export async function getTeam(clinicId: string, organizationId: string) {
  const [org, clinic, profiles] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { owner_user_id: true, plan: true } }),
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }),
    prisma.staffProfile.findMany({
      where: { clinic_id: clinicId },
      select: { id: true, user_id: true, full_name: true, specialty: true, membership_status: true },
      orderBy: [{ membership_status: "asc" }, { full_name: "asc" }],
    }),
  ]);
  const ownerUserId = org?.owner_user_id ?? "";
  const members = profiles.map((p) => ({
    staff_id: p.id,
    name: p.full_name,
    role: p.user_id === ownerUserId ? "Managing Doctor" : p.specialty ? "Doctor" : "Receptionist",
    is_owner: p.user_id === ownerUserId,
    is_doctor: !!p.specialty,
    status: p.membership_status as MembershipStatus,
  }));
  // Live seat usage: active non-owner members (owner is free).
  const activeNonOwner = members.filter((m) => m.status === "active" && !m.is_owner).length;
  const limits = planLimits(org?.plan ?? "solo");
  return {
    clinic_name: clinic?.name ?? "",
    plan: org?.plan ?? "solo",
    plan_label: limits.label,
    seats_used: activeNonOwner,
    seats_max: Number.isFinite(limits.maxSeats) ? limits.maxSeats : null,
    members,
  };
}
