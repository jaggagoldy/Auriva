// Minimal structured-ish logger for the API layer. One place to attach a
// real transport (pino, OTel) later — route code never calls console.*
// directly.

export const logger = {
  error(context: string, error?: unknown) {
    console.error(`[api] ${context}`, error ?? "");
  },
  warn(context: string, detail?: unknown) {
    console.warn(`[api] ${context}`, detail ?? "");
  },
  info(context: string, detail?: unknown) {
    console.log(`[api] ${context}`, detail ?? "");
  },
};
