// Release 1.2 Sprint 1 (PAT-1) — minimal, additive rollout gate. Product
// Office Decision (docs/release-1.2-sprint-1-implementation-packet.md §3,
// Option 2): a short, explicit allow-list of organization ids, consulted
// only before generating a notification or accepting a review. Temporary
// governance infrastructure for this sprint's Alpha/Beta staging — not a
// general feature-flag framework, and not consulted anywhere else in the
// platform. Expected to be removed or bypassed for all organizations at GA.
//
// Unset PILOT_ORGANIZATION_IDS = open to all organizations (the GA
// default). Set = restricted to the listed comma-separated organization
// ids (the Alpha/Beta state).

function parseAllowList(raw: string | undefined): Set<string> | null {
  if (!raw || !raw.trim()) return null;
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function isPilotOrganization(
  organizationId: string,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const allowList = parseAllowList(env.PILOT_ORGANIZATION_IDS);
  if (allowList === null) return true;
  return allowList.has(organizationId);
}
