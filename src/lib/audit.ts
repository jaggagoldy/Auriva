// OBS-3: extends the existing Audit_Logs trail (Sprint 3's AuditLog model,
// already fed by src/lib/event-handlers.ts for appointment/billing/invite
// business events) to the actions this sprint adds coverage for: login,
// logout, patient profile updates, doctor profile changes, and onboarding
// completion. Deliberately a thin wrapper around the same
// `prisma.auditLog.create` call already used directly in
// onboarding-service.ts (org creation, clinic creation, staff
// activation/invite) — not a new mechanism, not the event platform (no
// retry/fan-out semantics are needed for "someone signed in").
//
// AuditLog.organization_id is NOT NULL — a real, existing schema constraint
// this file does not change (extending the architecture, not redesigning
// it). Some patient-side actions have no resolvable organization (a
// self-registered, phone-only patient with no registering clinic) — for
// those, recordAudit() is a documented no-op rather than fabricating a
// tenant. See docs/observability-operations.md for the known coverage gap
// this produces.

import prisma from "@/lib/prisma";
import { logger } from "@/api/logger";

export async function recordAudit(input: {
  organizationId: string | null | undefined;
  actorUserId?: string | null;
  action: string;
  detail?: string | null;
}): Promise<void> {
  if (!input.organizationId) {
    logger.debug(`[audit] Skipped — no resolvable organization for action ${input.action}`);
    return;
  }
  try {
    await prisma.auditLog.create({
      data: {
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId ?? null,
        action: input.action,
        detail: input.detail ?? null,
      },
    });
  } catch (error) {
    // An audit-write failure must never fail the user-facing action it's
    // describing (a login must still succeed even if the audit row can't be
    // written) — log and move on, matching how publishEvent's own handler
    // dispatch failures are handled (logged, not propagated).
    logger.error(`[audit] Failed to record action ${input.action}`, error);
  }
}

/** Resolves the organization a staff/doctor/super_admin user acts within,
 * for audit purposes — mirrors requireStaffContext/requireOrganizationContext's
 * own resolution rules (own clinic for staff, first owned org for
 * super_admin) without requiring a request's clinic/org id, since login
 * happens before any resource is being addressed. */
export async function resolveOrganizationIdForStaffUser(
  userId: string,
  role: string
): Promise<string | null> {
  if (role === "super_admin") {
    const organization = await prisma.organization.findFirst({
      where: { owner_user_id: userId },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    return organization?.id ?? null;
  }
  const staffProfile = await prisma.staffProfile.findUnique({
    where: { user_id: userId },
    select: { clinic: { select: { organization_id: true } } },
  });
  return staffProfile?.clinic.organization_id ?? null;
}

/** Resolves the organization that registered a Healthcare Profile, for
 * audit purposes — null for self-registered (OTP-only, no clinic)
 * patients, a real and expected case, not an error. */
export async function resolveOrganizationIdForPatientProfile(
  patientProfileId: string
): Promise<string | null> {
  const profile = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { registeredByClinic: { select: { organization_id: true } } },
  });
  return profile?.registeredByClinic?.organization_id ?? null;
}
