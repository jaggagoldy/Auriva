// Small request-validation utilities for route handlers. Validation
// *messages* stay route-specific (they are public contract); these helpers
// only standardize the mechanics.

/** Parses a date string; returns null when absent or unparseable. */
export function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** True when every listed field is present (truthy) on the body. */
export function hasRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): boolean {
  return fields.every((field) => Boolean(body[field]));
}
