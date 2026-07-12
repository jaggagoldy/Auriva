import { beforeEach, describe, expect, it } from "vitest";
import { __resetRateLimitsForTests, checkRateLimit } from "./rate-limit";

describe("checkRateLimit (SEC-5)", () => {
  beforeEach(() => {
    __resetRateLimitsForTests();
  });

  it("allows requests up to the limit and blocks the next one", () => {
    const rule = { key: "test:a", limit: 3, windowMs: 60_000 };
    expect(checkRateLimit([rule]).allowed).toBe(true);
    expect(checkRateLimit([rule]).allowed).toBe(true);
    expect(checkRateLimit([rule]).allowed).toBe(true);
    const fourth = checkRateLimit([rule]);
    expect(fourth.allowed).toBe(false);
    if (!fourth.allowed) {
      expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("tracks independent keys independently", () => {
    const ruleA = { key: "test:independent-a", limit: 1, windowMs: 60_000 };
    const ruleB = { key: "test:independent-b", limit: 1, windowMs: 60_000 };
    expect(checkRateLimit([ruleA]).allowed).toBe(true);
    expect(checkRateLimit([ruleA]).allowed).toBe(false);
    // A different key's bucket is untouched by A's exhaustion.
    expect(checkRateLimit([ruleB]).allowed).toBe(true);
  });

  it("fails on the first rule that's exhausted, even if a later rule would still allow it", () => {
    const tight = { key: "test:tight", limit: 1, windowMs: 60_000 };
    const loose = { key: "test:loose", limit: 100, windowMs: 60_000 };
    expect(checkRateLimit([tight, loose]).allowed).toBe(true);
    const second = checkRateLimit([tight, loose]);
    expect(second.allowed).toBe(false);
  });
});
