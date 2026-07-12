// Runs once when the Next.js server starts (see instrumentation.js docs).
// INF-6: configuration is validated first — before the event platform (or
// anything else) initializes — so a misconfigured deployment fails at
// startup with a clear diagnostic instead of failing confusingly later, on
// whatever request first needed the missing/invalid configuration.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { validateStartupConfig } = await import("@/lib/config");
    const { logger } = await import("@/api/logger");

    try {
      validateStartupConfig();
    } catch (error) {
      logger.error("Startup configuration validation failed", error);
      throw error; // fail fast — do not let the server finish starting up
    }

    const { registerEventHandlers } = await import("@/lib/event-handlers");
    registerEventHandlers();
    logger.info("[Event Platform] Handlers registered.");

    // B3 (Release 1.2 Batch 2): appointment reminders are time-based, not
    // event-based (see appointment-reminder-service.ts's header comment for
    // why this isn't forced through the Event Platform's EventLog). A plain
    // in-process interval is the same single-instance-pilot-appropriate
    // choice already made for src/lib/rate-limit.ts and src/lib/alerts.ts's
    // dedupe window — not new infrastructure, the same accepted pattern.
    const { runAppointmentReminderSweep, REMINDER_SWEEP_INTERVAL_MS } = await import(
      "@/services/appointment-reminder-service"
    );
    setInterval(() => {
      runAppointmentReminderSweep().catch((error) => {
        logger.error("[Reminder Sweep] Sweep run failed", error);
      });
    }, REMINDER_SWEEP_INTERVAL_MS);

    // RG-001 alert trigger #2: application crash notification. Extracted to
    // its own dynamically-imported module (src/lib/crash-handlers.ts) so the
    // Node-only process.on/process.exit calls stay inside the same
    // NEXT_RUNTIME guard the bundler can actually see through — see that
    // file's header comment.
    const { registerCrashHandlers } = await import("@/lib/crash-handlers");
    registerCrashHandlers();
  }
}
