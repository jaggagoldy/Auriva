// H4 (observability): coverage for the logging primitive — redaction of
// sensitive fields, and the correlation-id wrapper that threads a request id and
// emits a structured per-request completion line (method/path/status/duration).

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { redact, withRequestId, currentRequestId } from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("redact", () => {
  it("masks sensitive keys anywhere in the object graph, case-insensitively", () => {
    const out = redact({
      email: "a@b.com",
      password: "hunter2",
      nested: { token: "abc", OTP: "123456", keep: "ok" },
      list: [{ code: "999" }],
    }) as Record<string, unknown>;
    expect(out.email).toBe("a@b.com");
    expect(out.password).toBe("[REDACTED]");
    const nested = out.nested as Record<string, unknown>;
    expect(nested.token).toBe("[REDACTED]");
    expect(nested.OTP).toBe("[REDACTED]");
    expect(nested.keep).toBe("ok");
    expect((out.list as Array<Record<string, unknown>>)[0].code).toBe("[REDACTED]");
  });
});

describe("withRequestId", () => {
  function req(headers?: Record<string, string>) {
    return new Request("http://localhost/api/clinic/payment?secret=shh", { method: "POST", headers });
  }

  it("echoes a generated request id on the response and exposes it inside the handler", async () => {
    let seenInside: string | undefined;
    const res = await withRequestId(req(), async (id) => {
      seenInside = currentRequestId();
      expect(currentRequestId()).toBe(id);
      return NextResponse.json({ ok: true });
    });
    const echoed = res.headers.get("x-request-id");
    expect(echoed).toBeTruthy();
    expect(seenInside).toBe(echoed);
  });

  it("reuses an incoming x-request-id from the proxy/client", async () => {
    const res = await withRequestId(req({ "x-request-id": "trace-123" }), async () =>
      NextResponse.json({ ok: true })
    );
    expect(res.headers.get("x-request-id")).toBe("trace-123");
  });

  it("emits a structured completion line with method, path (no query), status, and duration", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await withRequestId(req(), async () => NextResponse.json({ ok: true }, { status: 201 }));

    const completion = spy.mock.calls
      .map((c) => { try { return JSON.parse(c[0] as string); } catch { return null; } })
      .find((l) => l && l.context === "request.completed");

    expect(completion).toBeTruthy();
    expect(completion.detail.method).toBe("POST");
    expect(completion.detail.path).toBe("/api/clinic/payment"); // query string dropped
    expect(completion.detail.status).toBe(201);
    expect(typeof completion.detail.duration_ms).toBe("number");
    expect(completion.requestId).toBeTruthy();
  });
});
