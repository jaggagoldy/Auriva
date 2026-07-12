// SEC-5: auth rate-limiting. In-memory fixed-window counter — no Redis/queue
// dependency exists in this codebase (SQLite, single-instance), so adding
// one for this alone would be new infrastructure disproportionate to the
// problem. Known limitation: counters reset on process restart and are not
// shared across instances if this is ever horizontally scaled — acceptable
// for the platform's current single-instance deployment; revisit if/when
// INF-2 (job queue infra) lands and a shared store already exists.
//
// Two independent windows are checked per call, per APS-035 SEC-5's own
// "Known Risks" note: IP-only limiting gives a false sense of security
// against a distributed attack on one account, so both dimensions are
// enforced — whichever is tighter wins.

interface Counter {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Counter>();

// Periodically drop expired buckets so this map doesn't grow unbounded
// across a long-running process.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();
function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function hit(key: string, limit: number, windowMs: number, now: number): { allowed: boolean; retryAfterMs: number } {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (existing.count >= limit) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

export interface RateLimitRule {
  /** Identifies the dimension being limited, e.g. "ip" or "identity". */
  key: string;
  limit: number;
  windowMs: number;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Checks every rule and records a hit against each. All rules must pass —
 * the first one to fail determines the result, but every rule that would
 * still allow the request is not double-counted after a failure (fail-fast).
 */
export function checkRateLimit(rules: RateLimitRule[]): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  for (const rule of rules) {
    const result = hit(rule.key, rule.limit, rule.windowMs, now);
    if (!result.allowed) {
      return { allowed: false, retryAfterSeconds: Math.ceil(result.retryAfterMs / 1000) };
    }
  }
  return { allowed: true };
}

/** Best-effort caller IP from standard proxy headers, falling back to a
 * constant so requests without a forwarding header still share one bucket
 * rather than bypassing IP-based limiting entirely. */
export function clientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/** Only exported for tests — resets all in-memory counters. */
export function __resetRateLimitsForTests() {
  buckets.clear();
}
