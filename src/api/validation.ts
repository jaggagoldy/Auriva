// Small request-validation utilities for route handlers. Validation
// *messages* stay route-specific (they are public contract); these helpers
// only standardize the mechanics. DATA-1: covers required fields, enum
// values, identifiers, and dates — ownership checks are deliberately NOT
// here (that's what the session.ts guard functions and each service's own
// tenant-scoped queries already do; adding a parallel "ownership validator"
// here would duplicate that existing mechanism rather than standardize it).

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

/** Which of the listed fields are missing (falsy) on the body — for a
 * clearer message than a flat "some fields are missing" (drop-in
 * alternative to hasRequiredFields when the caller wants to name them). */
export function missingFields(
  body: Record<string, unknown>,
  fields: string[]
): string[] {
  return fields.filter((field) => !body[field]);
}

/** A non-empty, trimmed string — the shape every identifier (a patient_id,
 * doctor_id, clinic_id, etc.) and every required free-text field should
 * have before it's trusted enough to reach a Prisma query. Rejects
 * non-string values outright (a stray number/array/object from a
 * malformed client payload) rather than letting them reach the database
 * layer, where they'd surface as an opaque 500 instead of a clean 400. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when `value` is one of `allowed` — the standard shape for
 * validating an enum-like field (status, category, role, etc.) before it
 * reaches domain logic. Pair with one of the existing `is<X>Status` type
 * guards (appointment/invoice/lab-order/release-status.ts) for those
 * specific enums; use this directly for a one-off set of allowed values. */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

/** True when `body` is a real JSON object (not null, not an array, not a
 * primitive) — the standard first check for any route that expects a JSON
 * body, before reading specific fields off it. Deliberately returns a plain
 * `boolean`, not a type predicate: every existing call site destructures
 * loosely-typed fields off `body` afterward (matching `request.json()`'s own
 * `Promise<any>` return type), and narrowing to `Record<string, unknown>`
 * here would force unrelated per-field type-narrowing in each of those
 * routes — real work, but a request-model change this sprint doesn't ask
 * for (DATA-1: "do NOT redesign request models"). */
export function isPlainObject(body: unknown): boolean {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}
