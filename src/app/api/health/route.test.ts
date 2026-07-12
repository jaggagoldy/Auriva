// RC1 engineering push (2026-07-10): INF-5's liveness endpoint had no direct
// test coverage despite being the orchestrator-restart signal — closing that
// gap here, real integration style (no mocking needed; this route has no
// dependencies to mock).

import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with status, version, and uptime — no dependency checks", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("ok");
    expect(typeof json.version).toBe("string");
    expect(typeof json.uptime_seconds).toBe("number");
    expect(json.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(typeof json.timestamp).toBe("string");
  });
});
