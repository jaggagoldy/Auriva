// M3A Checkpoint 2 — the billing-policy service. Deterministic resolution + an
// AUDITED single-choke-point setter (PO refinement 3). Pure of UI/billing-engine
// concerns: it only reads/writes the clinic's policy and records the change. The
// engine does not act on the policy until 3B.

import prisma from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { BillingPolicy, DEFAULT_BILLING_POLICY, isBillingPolicy } from "@/domain/billing-policy";
import { resolveConsultationFee } from "@/services/billing-service";

export class InvalidBillingPolicyError extends Error {}
export class ClinicNotFoundError extends Error {}
export class PrepaidGateError extends Error {} // M3B B4: hard gate blocks consult start

/** Policies that collect the consultation fee BEFORE the doctor (M3B B4). */
export function requiresPrepaidConsultation(policy: BillingPolicy): boolean {
  return policy === "prepaid" || policy === "hybrid";
}

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

// ---- M3B B4: policy settings + the consultation-start gate -------------------

export interface PolicySettings { policy: BillingPolicy; hardGate: boolean }

export async function getPolicySettings(clinicId: string): Promise<PolicySettings> {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { billing_policy: true, prepaid_hard_gate: true } });
  return { policy: resolveBillingPolicy(clinic?.billing_policy), hardGate: clinic?.prepaid_hard_gate ?? false };
}

/** Toggle the hard gate (prepaid/hybrid block-until-collected). Audited. */
export async function setPrepaidHardGate(clinicId: string, hardGate: boolean, actorUserId?: string | null): Promise<PolicySettings> {
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { prepaid_hard_gate: true, organization_id: true } });
  if (!clinic) throw new ClinicNotFoundError(`Clinic ${clinicId} not found.`);
  if (clinic.prepaid_hard_gate !== hardGate) {
    await prisma.clinic.update({ where: { id: clinicId }, data: { prepaid_hard_gate: hardGate } });
    await recordAudit({ organizationId: clinic.organization_id, actorUserId: actorUserId ?? null, action: "prepaid_hard_gate_changed", detail: `${hardGate ? "on" : "off"}` });
  }
  return getPolicySettings(clinicId);
}

export interface ConsultationGate {
  policy: BillingPolicy;
  required: boolean;   // policy collects the consult fee up front
  satisfied: boolean;  // the consult fee has been collected (or not required)
  hardBlock: boolean;  // required && !satisfied && hardGate → consult start is blocked
  consultationFee: number;
  collected: number;
}

/**
 * Evaluate the prepaid/hybrid consultation gate for a visit. Postpaid → inert
 * (required=false, satisfied=true). "Satisfied" = payments recorded across the
 * visit's invoices cover the resolved consultation fee.
 */
export async function evaluateConsultationGate(appointmentId: string, clinicId: string): Promise<ConsultationGate> {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, clinic_id: clinicId },
    select: { doctor_id: true, follow_up_source_appointment_id: true },
  });
  if (!appt) throw new ClinicNotFoundError("Appointment not found in this clinic.");

  const { policy, hardGate } = await getPolicySettings(clinicId);
  const required = requiresPrepaidConsultation(policy);

  const { fee } = await prisma.$transaction((tx) =>
    resolveConsultationFee(tx, { doctorId: appt.doctor_id, isFollowUp: Boolean(appt.follow_up_source_appointment_id) })
  );
  const paid = await prisma.payment.aggregate({
    where: { invoice: { appointment_id: appointmentId }, clinic_id: clinicId },
    _sum: { amount: true },
  });
  const collected = paid._sum.amount ?? 0;
  const satisfied = !required || collected >= fee;

  return { policy, required, satisfied, hardBlock: required && !satisfied && hardGate, consultationFee: fee, collected };
}
