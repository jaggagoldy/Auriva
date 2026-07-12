import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_STATUSES,
  canTransition,
  isAppointmentStatus,
  timestampPatchFor,
  type AppointmentStatus,
} from "./appointment-status";

// TEST-2: regression harness around the appointment choke point —
// transitionStatus() is the single legal way an appointment's status
// changes, so this table is exhaustive over every (from, to) pair, not a
// handful of examples, so a future edit to TRANSITIONS can't silently
// legalize or block a transition without a test failing.
const LEGAL: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["checked_in", "waiting", "in_consultation", "cancelled", "no_show"],
  checked_in: ["waiting", "in_consultation", "cancelled", "no_show"],
  waiting: ["doctor_ready", "in_consultation", "skipped", "cancelled", "no_show"],
  doctor_ready: ["in_consultation", "skipped", "cancelled", "no_show"],
  skipped: ["waiting", "in_consultation"],
  in_consultation: ["completed"],
  completed: [],
  no_show: [],
  cancelled: [],
};

describe("appointment-status", () => {
  it("isAppointmentStatus recognizes every declared status and rejects garbage", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(isAppointmentStatus(status)).toBe(true);
    }
    expect(isAppointmentStatus("not_a_status")).toBe(false);
  });

  it("never allows a status to transition to itself", () => {
    for (const status of APPOINTMENT_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  for (const from of APPOINTMENT_STATUSES) {
    for (const to of APPOINTMENT_STATUSES) {
      if (from === to) continue;
      const shouldBeLegal = LEGAL[from].includes(to);
      it(`${shouldBeLegal ? "allows" : "rejects"} ${from} -> ${to}`, () => {
        expect(canTransition(from, to)).toBe(shouldBeLegal);
      });
    }
  }

  it("terminal statuses (completed/no_show/cancelled) allow no further transition", () => {
    for (const terminal of ["completed", "no_show", "cancelled"] as const) {
      for (const to of APPOINTMENT_STATUSES) {
        expect(canTransition(terminal, to)).toBe(false);
      }
    }
  });

  describe("timestampPatchFor", () => {
    const blank = { checked_in_at: null, started_at: null, completed_at: null };

    it("sets checked_in_at the first time an appointment reaches checked_in or waiting", () => {
      expect(timestampPatchFor("checked_in", blank)).toHaveProperty("checked_in_at");
      expect(timestampPatchFor("waiting", blank)).toHaveProperty("checked_in_at");
    });

    it("does not re-stamp checked_in_at once already set", () => {
      const already = { ...blank, checked_in_at: new Date("2020-01-01") };
      expect(timestampPatchFor("waiting", already)).not.toHaveProperty("checked_in_at");
    });

    it("sets started_at only on first entry into in_consultation", () => {
      expect(timestampPatchFor("in_consultation", blank)).toHaveProperty("started_at");
      const already = { ...blank, started_at: new Date("2020-01-01") };
      expect(timestampPatchFor("in_consultation", already)).not.toHaveProperty("started_at");
    });

    it("sets completed_at only on first entry into completed", () => {
      expect(timestampPatchFor("completed", blank)).toHaveProperty("completed_at");
      const already = { ...blank, completed_at: new Date("2020-01-01") };
      expect(timestampPatchFor("completed", already)).not.toHaveProperty("completed_at");
    });

    it("sets no timestamp for a status with no associated timestamp field", () => {
      expect(timestampPatchFor("skipped", blank)).toEqual({});
    });
  });
});
