// Minimal semantic-versioning helpers for Release.version (APS-036). Only
// what release-service.ts needs — validation and ordering — not a general
// semver library.

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

export function isValidSemver(value: string): boolean {
  return SEMVER_PATTERN.test(value);
}

/** -1 if a<b, 0 if equal, 1 if a>b. Callers must validate both first. */
export function compareSemver(a: string, b: string): number {
  const pa = a.match(SEMVER_PATTERN);
  const pb = b.match(SEMVER_PATTERN);
  if (!pa || !pb) throw new Error("compareSemver requires valid MAJOR.MINOR.PATCH strings");
  for (let i = 1; i <= 3; i++) {
    const na = Number(pa[i]);
    const nb = Number(pb[i]);
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}
