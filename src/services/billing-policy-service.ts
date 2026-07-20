// M3A Checkpoint 2 — the billing-policy service. Deterministic resolution + an
// AUDITED single-choke-point setter (PO refinement 3). Pure of UI/billing-engine
// concerns: it only reads/writes the clinic's policy and records the change. The
// engine does not act on the policy until 3B.

import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { BillingPolicy, DEFAULT_BILLING_POLICY, isBillingPolicy } from "@/domain/billing-policy";

export class InvalidBillingPolicyError extends Error {}
export class ClinicNotFoundError extends Error {}

/** Deterministic: a recognized policy passes through; anything else (legacy,
 *  null, typo) falls back to postpaid. Never throws. */
export function resolveBillingPolicy(policy: string | null | undefined): BillingPolicy {
  return policy && isBillingPolicy(policy) ? policy : DEFAULT_BILLING_POLICY;
}

export async function getBillingPolicy(clinicId: string): Promise<BillingPolicy> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { billing_policy: true },
  });
  return resolveBillingPolicy(clinic?.billing_policy);
}

/** Changes the clinic-wide billing policy — an auditable operational-config
 *  change. The single choke point, so a future BillingPolicyHistory table drops
 *  in without touching callers. No-op (still audited-free) when unchanged. */
export async function setBillingPolicy(
  clinicId: string,
  policy: string,
  actorUserId?: string | null
): Promise<BillingPolicy> {
  if (!isBillingPolicy(policy)) {
    throw new InvalidBillingPolicyError(`"${policy}" is not a valid billing policy.`);
  }
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { billing_policy: true, organization_id: true },
  });
  if (!clinic) throw new ClinicNotFoundError(`Clinic ${clinicId} not found.`);

  const from = resolveBillingPolicy(clinic.billing_policy);
  if (from === policy) return policy; // no change → no write, no audit noise

  await prisma.clinic.update({ where: { id: clinicId }, data: { billing_policy: policy } });
  await recordAudit({
    organizationId: clinic.organization_id,
    actorUserId: actorUserId ?? null,
    action: "billing_policy_changed",
    detail: `${from} → ${policy}`,
  });
  // EVENT-READINESS (C3 refinement): this is the single choke point for a policy
  // change, so a domain event can be published here later WITHOUT changing this
  // API. When the event platform carries billing events, emit:
  //   publishEvent({ eventType: "billing.policy.changed", organizationId:
  //     clinic.organization_id, entityId: clinicId, payload: { from, to: policy } })
  // Deliberately not wired now (no billing events consumed yet) — 3B.
  return policy;
}
