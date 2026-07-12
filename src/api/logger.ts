// OBS-1: structured logging for the API layer. Still the one place a real
// transport (pino, OTel) gets attached later — route/service code never
// calls console.* directly. Extends the pre-Sprint-2 version (which only
// had error/warn/info as thin console.* wrappers) with: a debug level,
// genuinely structured (single-line JSON) output, automatic redaction of
// known-sensitive fields, and request-correlation IDs threaded via
// AsyncLocalStorage so every log line emitted while handling one request
// carries the same id, without changing every call site's signature.

import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "debug" | "info" | "warn" | "error";

const requestContext = new AsyncLocalStorage<{ requestId: string }>();

/**
 * Runs `fn` with `requestId` attached to every log line emitted during its
 * execution (including inside services/repositories it calls) — adopted so
 * far on the auth routes (login, OTP send/verify, logout), the
 * highest-value surface for incident correlation. Extending this to other
 * routes is the same one-line wrap, not a new pattern.
 */
export function runWithRequestId<T>(requestId: string, fn: () => Promise<T>): Promise<T> {
  return requestContext.run({ requestId }, fn);
}

export function currentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Wraps a route handler so every log line it (or anything it calls)
 * emits carries one correlation id — read from an incoming `x-request-id`
 * header if the caller/proxy already set one, generated otherwise — and
 * echoes that id back on the response so a client can quote it when
 * reporting an issue.
 */
export async function withRequestId<T extends { headers: Headers }>(
  request: Request,
  handler: (requestId: string) => Promise<T>
): Promise<T> {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const start = Date.now();

  // Path only (no query string), so no sensitive query values are logged.
  let path = request.url;
  try {
    path = new URL(request.url).pathname;
  } catch {
    // non-absolute URL in a test/edge case — keep the raw value
  }

  const response = await runWithRequestId(requestId, async () => {
    const res = await handler(requestId);
    // H4 (observability): one structured completion line per wrapped request —
    // method, path, status, latency. Emitted INSIDE the correlation context so
    // it carries the same requestId as every other line for this request, letting
    // an operator spot slow/failing requests and trace them end to end.
    logger.info("request.completed", {
      method: request.method,
      path,
      status: (res as { status?: number }).status,
      duration_ms: Date.now() - start,
    });
    return res;
  });

  response.headers.set("x-request-id", requestId);
  return response;
}

// Field names that must never reach a log line, wherever they appear in a
// logged object — matches OBS-1's "sensitive information is never logged"
// requirement structurally (redaction happens in the logger itself, not by
// convention at each call site).
const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "passwordhash",
  "token",
  "token_hash",
  "tokenhash",
  "rawtoken",
  "raw_token",
  "otp",
  "code",
  "authorization",
  "cookie",
  "secret",
]);

/** Exported for direct unit testing — see logger.test.ts. */
export function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[REDACTED]" : redact(val, seen);
    }
    return out;
  }
  return value;
}

function emit(level: LogLevel, context: string, detail?: unknown) {
  const line = {
    level,
    ts: new Date().toISOString(),
    context,
    requestId: currentRequestId(),
    ...(detail !== undefined ? { detail: redact(detail) } : {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else if (level === "debug") console.debug(serialized);
  else console.log(serialized);
}

export const logger = {
  debug(context: string, detail?: unknown) {
    emit("debug", context, detail);
  },
  info(context: string, detail?: unknown) {
    emit("info", context, detail);
  },
  warn(context: string, detail?: unknown) {
    emit("warn", context, detail);
  },
  error(context: string, error?: unknown) {
    emit("error", context, error);
  },
};
