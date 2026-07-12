// RC1 engineering push (2026-07-10): INF-5's readiness endpoint — and
// specifically its DB-unreachable alert wiring (RG-001 trigger #1) — had no
// direct test coverage. Closing that gap: real Prisma/Postgres for the
// happy path, a mocked `$queryRaw` failure for the alert-wiring path
// (alert *delivery* mechanics are separately, really verified in
// src/lib/alerts/index.test.ts — this test only proves the route calls
// reportAlert correctly, not that delivery itself works).

import { afterEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";

vi.mock("@/lib/alerts", () => ({ reportAlert: vi.fn() }));

import { reportAlert } from "@/lib/alerts";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(reportAlert).mockClear();
});

describe("GET /api/ready", () => {
  it("returns 200 with a database check when the database is reachable", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("ready");
    expect(json.checks.database).toBe("ok");
    expect(reportAlert).not.toHaveBeenCalled();
  });

  it("returns 503 and fires a critical alert when the database is unreachable", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));

    const response = await GET();

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error).toBe("Service Unavailable");

    expect(reportAlert).toHaveBeenCalledTimes(1);
    const [alert] = vi.mocked(reportAlert).mock.calls[0];
    expect(alert.severity).toBe("critical");
    expect(alert.title).toContain("database unreachable");
    expect(alert.detail).toContain("connection refused");
  });
});
