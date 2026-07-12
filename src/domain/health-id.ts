// Auriva Health ID generation (APS-029/010 Part I A5 — the Identity
// Verification ladder; Part II §3 — HealthcareProfile.health_id).
// Pure TypeScript: no Prisma, no Next — collision checking against the
// database is the caller's responsibility (src/services/patient-service.ts),
// same separation as domain/appointment-status.ts vs the service that calls it.

// Excludes visually-ambiguous characters (0/O, 1/I) — this is read aloud at
// reception counters and copied by hand often enough that ambiguity matters.
const HEALTH_ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HEALTH_ID_LENGTH = 6;

export function generateHealthIdCandidate(): string {
  let code = "";
  for (let i = 0; i < HEALTH_ID_LENGTH; i++) {
    code += HEALTH_ID_ALPHABET[Math.floor(Math.random() * HEALTH_ID_ALPHABET.length)];
  }
  return `AUR-${code}`;
}
