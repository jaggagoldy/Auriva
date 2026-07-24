// BRD-043 Sprint 5 (US-502/504/505) — subscription & plan.
//
// ADR-004, frozen: this is ADMINISTRATIVE plan management, not self-service
// billing. Three deliberately-separated capabilities:
//   - getClinicPlan  : READ-ONLY. The clinic sees its plan + live seat usage.
//   - requestUpgrade : records a REQUEST (audit + event). It NEVER changes
//                      Organization.plan — the clinic side cannot mutate its
//                      own plan. This is the only clinic-facing write.
//   - setOrganizationPlan : the ONLY thing that changes Organization.plan,
//                      reachable exclusively by an Auriva platform admin
//                      (is_platform_admin), never from the /clinic product.
//
// No payment gateway, no Stripe/Razorpay — out of scope (ADR-004).

import prisma from "@/lib/prisma";
import { publishEvent } from "@/lib/events";
import { logger } from "@/api/logger";
import { isPlan, planLimits, PLAN_LIMITS, type Plan } from "@/domain/subscription";

/** Read-only plan view for a clinic: current plan + live (never cached) seat
 * usage. The owner is free, so seats are the active non-owner members. */
export async function getClinicPlan(clinicId: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { organization: { select: { id: true, owner_user_id: true, plan: true } } },
  });
  if (!clinic) return null;
  const org = clinic.organization;

  const activeNonOwner = await prisma.staffProfile.count({
    where: { clinic_id: clinicId, membership_status: "active", user_id: { not: org.owner_user_id } },
  });
  const limits = planLimits(org.plan);
  return {
    plan: org.plan,
    plan_label: limits.label,
    seats_used: activeNonOwner,
    seats_max: Number.isFinite(limits.maxSeats) ? limits.maxSeats : null,
    tiers: {
      solo: PLAN_LIMITS.solo,
      professional: PLAN_LIMITS.professional,
      enterprise: PLAN_LIMITS.enterprise,
    },
  };
}

/**
 * US-504: a clinic requests an upgrade. Records the request (audit row) and
 * publishes `subscription.upgrade_requested`, but does NOT change the plan —
 * Auriva applies it administratively (US-505). Returns the (unchanged)
 * current plan so the caller can prove to itself nothing flipped.
 */
export async function requestUpgrade(input: {
  clinicId: string;
  organizationId: string;
  actorUserId: string;
  targetPlan?: string;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { plan: true },
  });
  const target = input.targetPlan && isPlan(input.targetPlan) ? input.targetPlan : "professional";

  await prisma.auditLog.create({
    data: {
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: "subscription_upgrade_requested",
      detail: `${org?.plan ?? "solo"} → ${target} (requested)`,
    },
  });
  await publishEvent({
    eventType: "subscription.upgrade_requested",
    organizationId: input.organizationId,
    entityId: input.organizationId,
    correlationId: `upgrade-request-${input.organizationId}-${Date.now()}`,
    actorId: input.actorUserId,
    payload: { fromPlan: org?.plan ?? "solo", toPlan: target },
  });
  logger.info("subscription.upgrade_requested", { organizationId: input.organizationId, fromPlan: org?.plan, toPlan: target });

  // Plan is unchanged — this is a request, not a mutation.
  return { requested: true, current_plan: org?.plan ?? "solo", target_plan: target };
}

export class PlanInputError extends Error {}

/**
 * US-505: the ONLY path that changes Organization.plan — Auriva-internal,
 * gated at the route by is_platform_admin. Never reachable from /clinic.
 */
export async function setOrganizationPlan(input: {
  organizationId: string;
  plan: string;
  actorUserId: string;
}) {
  if (!isPlan(input.plan)) {
    throw new PlanInputError("plan must be 'solo', 'professional', or 'enterprise'.");
  }
  const plan = input.plan as Plan;
  const updated = await prisma.organization.update({
    where: { id: input.organizationId },
    data: { plan },
    select: { id: true, plan: true },
  });
  await prisma.auditLog.create({
    data: {
      organization_id: input.organizationId,
      actor_user_id: input.actorUserId,
      action: "subscription_plan_changed",
      detail: `plan set to ${plan} (Auriva admin)`,
    },
  });
  await publishEvent({
    eventType: "subscription.plan_changed",
    organizationId: input.organizationId,
    entityId: input.organizationId,
    correlationId: `plan-changed-${input.organizationId}-${plan}`,
    actorId: input.actorUserId,
    payload: { plan },
  });
  logger.info("subscription.plan_changed", { organizationId: input.organizationId, plan });
  return updated;
}
