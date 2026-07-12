// RC1 engineering push (2026-07-10): extracted out of src/instrumentation.ts.
// `process.on`/`process.exit` are Node-only APIs; Turbopack's build-time
// analysis flags any file containing them as potentially unsafe for the
// Edge runtime, even when (as in instrumentation.ts) the call site is
// already guarded behind `process.env.NEXT_RUNTIME !== "edge"` at runtime —
// the guard is a runtime check, not something the static analyzer can see
// through. Moving the Node-only code into its own module, dynamically
// imported only inside that same guard (exactly the pattern already used
// for every other import in that function), keeps the guard meaningful to
// the bundler too and removes the build warning entirely. Behavior is
// unchanged — this is a pure extraction, not a logic change.

import { logger } from "@/api/logger";
import { reportAlert } from "@/lib/alerts";

/**
 * RG-001 alert trigger #2: application crash notification. A process-level
 * safety net so a fatal error pages someone instead of dying silently.
 */
export function registerCrashHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", reason);
    void reportAlert({
      severity: "critical",
      title: "Unhandled promise rejection",
      detail: reason instanceof Error ? reason.message : String(reason),
    });
  });
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception — process will exit", error);
    // Alert, then let the process exit so the orchestrator restarts a clean
    // instance (an uncaught exception leaves the process in an unknown state).
    void reportAlert({
      severity: "critical",
      title: "Uncaught exception — process exiting",
      detail: error.message,
    }).finally(() => process.exit(1));
  });
}
