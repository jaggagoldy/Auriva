// RC1 engineering push (2026-07-10): extracted from src/instrumentation.ts
// (see that file's header comment for why — a Turbopack Edge-runtime build
// warning, now eliminated). This extraction also made the crash-handling
// logic independently testable for the first time — previously it was
// inline in a Next.js special file with no direct test coverage at all.

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/alerts", () => ({ reportAlert: vi.fn().mockResolvedValue(undefined) }));

import { reportAlert } from "@/lib/alerts";
import { registerCrashHandlers } from "./crash-handlers";

describe("registerCrashHandlers", () => {
  afterEach(() => {
    process.removeAllListeners("unhandledRejection");
    process.removeAllListeners("uncaughtException");
    vi.mocked(reportAlert).mockClear();
  });

  it("reports a critical alert on an unhandled rejection, without exiting the process", async () => {
    registerCrashHandlers();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    process.emit("unhandledRejection", new Error("promise blew up"), Promise.resolve());
    await Promise.resolve(); // let the async reportAlert() call settle

    expect(reportAlert).toHaveBeenCalledTimes(1);
    const [alert] = vi.mocked(reportAlert).mock.calls[0];
    expect(alert.severity).toBe("critical");
    expect(alert.title).toBe("Unhandled promise rejection");
    expect(alert.detail).toBe("promise blew up");
    expect(exitSpy).not.toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it("reports a critical alert and exits the process on an uncaught exception", async () => {
    registerCrashHandlers();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    process.emit("uncaughtException", new Error("fatal"));
    await Promise.resolve();
    await Promise.resolve(); // reportAlert().finally() needs one more microtask turn

    expect(reportAlert).toHaveBeenCalledTimes(1);
    const [alert] = vi.mocked(reportAlert).mock.calls[0];
    expect(alert.severity).toBe("critical");
    expect(alert.title).toBe("Uncaught exception — process exiting");
    expect(alert.detail).toBe("fatal");
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
