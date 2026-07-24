// M3A Revenue Foundation — the clinic-wide billing policy enum. Pure domain.
// The engine only READS the policy in 3A (postpaid = today's behaviour); the
// prepaid/hybrid *timing* activates in 3B. Policy changes are auditable
// operational configuration (PO refinement 3) — routed through a single service
// setter that writes an AuditLog, so a future BillingPolicyHistory table can be
// added without touching call sites.

export type BillingPolicy = "prepaid" | "postpaid" | "hybrid";

export const BILLING_POLICIES: BillingPolicy[] = ["prepaid", "postpaid", "hybrid"];

export function isBillingPolicy(value: string): value is BillingPolicy {
  return BILLING_POLICIES.includes(value as BillingPolicy);
}

/** Existing clinics: unchanged behaviour (postpaid = draft on completion). */
export const DEFAULT_BILLING_POLICY: BillingPolicy = "postpaid";

/** New Indian clinics default to prepaid — applied at clinic creation (C2/3B),
 *  not at the schema level (the column default stays postpaid for safety). */
export const DEFAULT_NEW_CLINIC_BILLING_POLICY: BillingPolicy = "prepaid";
