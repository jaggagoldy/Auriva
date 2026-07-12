// RG-001: operational alerting — channel selection, production config gating,
// dedupe, and the never-throw guarantee. Most cases here mock fetch. The
// "real webhook delivery" describe block below (RC1 engineering push,
// 2026-07-10) closes what used to be a real gap: this file's own comment
// said live delivery was "staging-verified," but no staging environment has
// ever existed to verify it in. Rather than leave that unverifiable claim
// standing, it's tested against a real local HTTP server — a genuine
// network round-trip, not a mock — which is the strongest verification
// possible without a real Slack/Discord account (see RC1 report).

import { afterEach, describe, expect, it, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  configuredChannelName,
  isAlertingConfigured,
  alertConfigErrors,
  getAlertChannel,
  reportAlert,
  __resetAlertsForTests,
} from "./index";

const env = (o: Record<string, string | undefined>) => o as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  __resetAlertsForTests();
  vi.restoreAllMocks();
});

describe("configuredChannelName", () => {
  it("recognizes known channels case-insensitively", () => {
    expect(configuredChannelName(env({ ALERT_CHANNEL: "Slack" }))).toBe("slack");
    expect(configuredChannelName(env({ ALERT_CHANNEL: "DISCORD" }))).toBe("discord");
    expect(configuredChannelName(env({ ALERT_CHANNEL: "webhook" }))).toBe("webhook");
    expect(configuredChannelName(env({ ALERT_CHANNEL: "log" }))).toBe("log");
  });
  it("returns null for unknown or unset", () => {
    expect(configuredChannelName(env({ ALERT_CHANNEL: "pagerduty" }))).toBeNull();
    expect(configuredChannelName(env({}))).toBeNull();
  });
});

describe("isAlertingConfigured", () => {
  it("is true only for a real channel with a webhook URL", () => {
    expect(isAlertingConfigured(env({ ALERT_CHANNEL: "slack", ALERT_WEBHOOK_URL: "https://x" }))).toBe(true);
    expect(isAlertingConfigured(env({ ALERT_CHANNEL: "slack" }))).toBe(false);
    expect(isAlertingConfigured(env({ ALERT_CHANNEL: "log", ALERT_WEBHOOK_URL: "https://x" }))).toBe(false);
  });
});

describe("alertConfigErrors", () => {
  it("is clean in development regardless of config", () => {
    expect(alertConfigErrors(env({ NODE_ENV: "development" }))).toEqual([]);
  });
  it("flags an unknown channel even in development", () => {
    expect(alertConfigErrors(env({ NODE_ENV: "development", ALERT_CHANNEL: "pagerduty" }))).toHaveLength(1);
  });
  it("requires a configured real channel in production (mandatory criterion)", () => {
    expect(alertConfigErrors(env({ NODE_ENV: "production" }))).toHaveLength(1);
    expect(alertConfigErrors(env({ NODE_ENV: "production", ALERT_CHANNEL: "log" }))).toHaveLength(1);
    expect(alertConfigErrors(env({ NODE_ENV: "production", ALERT_CHANNEL: "slack" }))[0]).toContain("ALERT_WEBHOOK_URL");
  });
  it("is clean in production when fully configured", () => {
    expect(
      alertConfigErrors(env({ NODE_ENV: "production", ALERT_CHANNEL: "discord", ALERT_WEBHOOK_URL: "https://x" }))
    ).toEqual([]);
  });
});

describe("getAlertChannel", () => {
  it("selects the real channel when configured, else the log fallback", () => {
    expect(getAlertChannel(env({ ALERT_CHANNEL: "slack", ALERT_WEBHOOK_URL: "https://x" })).name).toBe("slack");
    expect(getAlertChannel(env({})).name).toBe("log");
    expect(getAlertChannel(env({ ALERT_CHANNEL: "slack" })).name).toBe("log"); // missing URL
  });
});

describe("reportAlert", () => {
  it("dispatches to a real channel via one webhook POST", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    await reportAlert(
      { severity: "critical", title: "DB down" },
      env({ ALERT_CHANNEL: "slack", ALERT_WEBHOOK_URL: "https://hooks/x" })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://hooks/x");
    expect(JSON.parse((opts as RequestInit).body as string).text).toContain("DB down");
  });

  it("dedupes the same alert within the window (only one dispatch)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const cfg = env({ ALERT_CHANNEL: "slack", ALERT_WEBHOOK_URL: "https://hooks/x" });
    await reportAlert({ severity: "critical", title: "same" }, cfg);
    await reportAlert({ severity: "critical", title: "same" }, cfg);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("never throws when the channel fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(
      reportAlert({ severity: "error", title: "boom" }, env({ ALERT_CHANNEL: "slack", ALERT_WEBHOOK_URL: "https://x" }))
    ).resolves.toBeUndefined();
  });
});

/** Starts a real local HTTP server that captures received request bodies. */
async function startCaptureServer(status = 200): Promise<{
  url: string;
  requests: { body: unknown; headers: http.IncomingHttpHeaders }[];
  close: () => Promise<void>;
}> {
  const requests: { body: unknown; headers: http.IncomingHttpHeaders }[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      requests.push({ body: raw ? JSON.parse(raw) : null, headers: req.headers });
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

describe("reportAlert — real webhook delivery (no fetch mocking)", () => {
  it("delivers a real HTTP POST to a webhook channel with the correct payload shape", async () => {
    const server = await startCaptureServer();
    try {
      await reportAlert(
        { severity: "critical", title: "DB unreachable", detail: "connection refused" },
        env({ ALERT_CHANNEL: "webhook", ALERT_WEBHOOK_URL: server.url })
      );
      expect(server.requests).toHaveLength(1);
      const body = server.requests[0].body as { severity: string; title: string; source: string; text: string };
      expect(body.severity).toBe("critical");
      expect(body.title).toBe("DB unreachable");
      expect(body.source).toBe("auriva");
      expect(body.text).toContain("DB unreachable");
      expect(server.requests[0].headers["content-type"]).toContain("application/json");
    } finally {
      await server.close();
    }
  });

  it("delivers the Slack-shaped payload ({ text }) over a real request", async () => {
    const server = await startCaptureServer();
    try {
      await reportAlert({ severity: "warning", title: "5xx spike" }, env({ ALERT_CHANNEL: "slack", ALERT_WEBHOOK_URL: server.url }));
      expect(server.requests).toHaveLength(1);
      expect(Object.keys(server.requests[0].body as object)).toEqual(["text"]);
    } finally {
      await server.close();
    }
  });

  it("delivers the Discord-shaped payload ({ content }) over a real request", async () => {
    const server = await startCaptureServer();
    try {
      await reportAlert({ severity: "warning", title: "5xx spike" }, env({ ALERT_CHANNEL: "discord", ALERT_WEBHOOK_URL: server.url }));
      expect(server.requests).toHaveLength(1);
      expect(Object.keys(server.requests[0].body as object)).toEqual(["content"]);
    } finally {
      await server.close();
    }
  });

  it("logs but does not throw when the real endpoint returns a non-2xx status", async () => {
    const server = await startCaptureServer(500);
    try {
      await expect(
        reportAlert({ severity: "error", title: "test" }, env({ ALERT_CHANNEL: "webhook", ALERT_WEBHOOK_URL: server.url }))
      ).resolves.toBeUndefined();
      expect(server.requests).toHaveLength(1); // the request still went out
    } finally {
      await server.close();
    }
  });
});
