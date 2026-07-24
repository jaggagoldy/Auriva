// BRD-043 US-503 (Sprint 2): pure unit tests for the seat model — no DB.

import { describe, expect, it } from "vitest";
import { checkSeatAvailability, planLimits, PLAN_LIMITS } from "@/domain/subscription";

describe("checkSeatAvailability — Solo", () => {
  it("allows the first doctor and first receptionist", () => {
    expect(checkSeatAvailability("solo", "doctor", { doctors: 0, receptionists: 0 }).allowed).toBe(true);
    expect(checkSeatAvailability("solo", "receptionist", { doctors: 0, receptionists: 0 }).allowed).toBe(true);
  });

  it("rejects a second doctor on Solo (1-doctor cap)", () => {
    const decision = checkSeatAvailability("solo", "doctor", { doctors: 1, receptionists: 0 });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/doctor/i);
  });

  it("rejects a second receptionist on Solo (1-receptionist cap)", () => {
    expect(checkSeatAvailability("solo", "receptionist", { doctors: 0, receptionists: 1 }).allowed).toBe(false);
  });

  it("rejects any invite once the 2 non-owner seats are full", () => {
    // 1 doctor + 1 receptionist = 2/2 → a third of either role is blocked.
    expect(checkSeatAvailability("solo", "doctor", { doctors: 1, receptionists: 1 }).allowed).toBe(false);
    expect(checkSeatAvailability("solo", "receptionist", { doctors: 1, receptionists: 1 }).allowed).toBe(false);
  });
});

describe("checkSeatAvailability — Professional", () => {
  it("allows up to 5 doctors", () => {
    expect(checkSeatAvailability("professional", "doctor", { doctors: 4, receptionists: 0 }).allowed).toBe(true);
    expect(checkSeatAvailability("professional", "doctor", { doctors: 5, receptionists: 0 }).allowed).toBe(false);
  });

  it("enforces the 14 non-owner seat ceiling", () => {
    expect(checkSeatAvailability("professional", "receptionist", { doctors: 5, receptionists: 8 }).allowed).toBe(true);
    expect(checkSeatAvailability("professional", "receptionist", { doctors: 5, receptionists: 9 }).allowed).toBe(false);
  });
});

describe("plan resolution", () => {
  it("falls back to Solo for an unknown plan string", () => {
    expect(planLimits("nonsense")).toBe(PLAN_LIMITS.solo);
  });
  it("Enterprise is effectively unbounded", () => {
    expect(checkSeatAvailability("enterprise", "doctor", { doctors: 99, receptionists: 99 }).allowed).toBe(true);
  });
});
