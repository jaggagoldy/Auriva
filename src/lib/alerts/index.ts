// Release governance (RG-001): operational ALERTING — the difference between
// "logs exist" and "someone is notified when production is failing." Elevated by
// the Product Office to a mandatory Code-Freeze entry criterion.
//
// Deliberately minimal and pluggable (same shape as src/lib/sms): one
// AlertChannel interface, an env-selected dispatcher, a dedupe window so a
// failing prod can't send an alert storm, and a reportAlert() that NEVER throws
// — alerting must not break the path it observes. Real channels are webhook-based
// (Slack / Discord / generic) so there is no vendor SDK and no lock-in.
//
// This is NOT a metrics/APM platform (that stays deferred, see docs/alerting.md).
// It exists to satisfy three concrete conditions: readiness/DB failure, an
// application crash, and a 5xx error-rate spike.

import { logger } from "@/api/logger";

export type AlertSeverity = "critical" | "error" | "warning";

export interface Alert {
  severity: AlertSeverity;
  title: string;
  detail?: string;
}

export interface AlertChannel {
  readonly name: string;
  /** Delivers an alert. Implementations must not throw (reportAlert guards too). */
  send(alert: Alert): Promise<void>;
}

export type AlertChannelName = "slack" | "discord" | "webhook" | "log";

const REAL_CHANNELS: readonly AlertChannelName[] = ["slack", "discord", "webhook"];

/** The ALERT_CHANNEL value if it names a known channel, else null. */
export function configuredChannelName(env: NodeJS.ProcessEnv = process.env): AlertChannelName | null {
  const raw = (env.ALERT_CHANNEL ?? "").trim().toLowerCase();
  if (raw === "log") return "log";
  if ((REAL_CHANNELS as readonly string[]).includes(raw)) return raw as AlertChannelName;
  return null;
}

/** True only when a real channel is selected AND its webhook URL is present. */
export function isAlertingConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const name = configuredChannelName(env);
  if (!name || name === "log") return false;
  return Boolean(env.ALERT_WEBHOOK_URL?.trim());
}

/**
 * Startup-validation problems for alerting, folded into collectConfigErrors.
 * Production REQUIRES a configured real channel — this is the mandatory
 * Code-Freeze criterion, enforced so a prod deploy can't silently run blind.
 * Non-production is lenient (an unknown value is a typo-catching error only).
 */
export function alertConfigErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = (env.ALERT_CHANNEL ?? "").trim();
  const name = configuredChannelName(env);
  const isProd = env.NODE_ENV === "production";

  if (raw && !name) {
    return [`ALERT_CHANNEL is "${raw}", expected one of: slack, discord, webhook, log.`];
  }
  if (!isProd) return [];

  if (!name) {
    return ['ALERT_CHANNEL must be set to "slack", "discord", or "webhook" in production (operational alerting is a release requirement).'];
  }
  if (name === "log") {
    return ['ALERT_CHANNEL "log" cannot be used in production — failures would never be delivered.'];
  }
  if (!env.ALERT_WEBHOOK_URL?.trim()) {
    return ['ALERT_WEBHOOK_URL is required when ALERT_CHANNEL is a real channel.'];
  }
  return [];
}

// --- channels (webhook POSTs; tiny, no SDKs) ---

function formatText(alert: Alert): string {
  const tag = alert.severity.toUpperCase();
  return `[Auriva][${tag}] ${alert.title}${alert.detail ? `\n${alert.detail}` : ""}`;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    logger.error("[alert] channel returned non-2xx", { status: res.status });
  }
}

function realChannel(name: Exclude<AlertChannelName, "log">, url: string): AlertChannel {
  return {
    name,
    async send(alert: Alert) {
      const text = formatText(alert);
      // Slack: { text }, Discord: { content }, generic webhook: the structured alert.
      if (name === "slack") return postJson(url, { text });
      if (name === "discord") return postJson(url, { content: text });
      return postJson(url, { ...alert, source: "auriva", text });
    },
  };
}

function logChannel(): AlertChannel {
  return {
    name: "log",
    async send(alert: Alert) {
      logger.warn("[alert:log] (no real channel configured)", alert);
    },
  };
}

/** Resolves the active channel; falls back to the log channel when unconfigured. */
export function getAlertChannel(env: NodeJS.ProcessEnv = process.env): AlertChannel {
  const name = configuredChannelName(env);
  if (name && name !== "log" && isAlertingConfigured(env)) {
    return realChannel(name, env.ALERT_WEBHOOK_URL!.trim());
  }
  return logChannel();
}

// --- dedupe: collapse repeats of the same alert within a window ---
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const recentAlerts = new Map<string, number>();

/** Test-only: clear the dedupe window. */
export function __resetAlertsForTests() {
  recentAlerts.clear();
}

/**
 * Reports an operational alert: logs it (always) and dispatches it to the
 * configured channel, deduped per (severity+title) within a 5-minute window so a
 * failing production can't self-DDoS the alert channel. NEVER throws.
 */
export async function reportAlert(alert: Alert, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  try {
    // Always log — the audit/troubleshooting record, independent of delivery.
    logger.error(`[alert] ${alert.title}`, alert.detail);

    const key = `${alert.severity}:${alert.title}`;
    const now = Date.now();
    const last = recentAlerts.get(key);
    if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return;
    recentAlerts.set(key, now);

    await getAlertChannel(env).send(alert);
  } catch (err) {
    logger.error("[alert] dispatch failed", err);
  }
}
