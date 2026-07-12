// TEST-3: standardized-error-envelope regression coverage. mapDomainError()
// is the single place every domain error class maps to its HTTP envelope
// (OBS-2) — table-driven so adding a new error class without wiring it in
// here (a real, previously-occurring gap — see EventNotFoundError/
// EventHandlerNotFoundError, fixed this sprint) is caught by a failing test
// (the final "returns null for an unrecognized error" case) rather than
// silently falling through to a generic 500 in production.

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapDomainError, serverError, unauthorized, forbidden, notFound, conflict, badRequest, unprocessableEntity, tooManyRequests, serviceUnavailable, __reset5xxWindowForTests } from "@/api/http";
import { AppointmentNotFoundError, InvalidTransitionError, DuplicateActiveAppointmentError } from "@/services/appointment-service";
import { InvoiceNotFoundError, InvalidInvoiceTransitionError, InvalidPaymentError } from "@/services/billing-service";
import { LabOrderNotFoundError, InvalidLabOrderTransitionError, InvalidLabOrderInputError } from "@/services/lab-service";
import { ReleaseNotFoundError, InvalidReleaseTransitionError, ReleaseInputError } from "@/services/release-service";
import { EventNotFoundError, EventHandlerNotFoundError } from "@/services/event-log-service";
import { DepartmentNameConflictError } from "@/services/department-service";
import prisma from "@/lib/prisma";
import { createTestOrganization } from "@/test/fixtures";

// RC1 engineering push (2026-07-10): RG-001 alert trigger #3 (5xx-rate
// spike) had zero test coverage. Mocked here (not a real webhook — that's
// separately, really verified in src/lib/alerts/index.test.ts) because this
// suite's only job is proving http.ts's own threshold/dedupe wiring is
// correct, not re-proving delivery mechanics.
vi.mock("@/lib/alerts", () => ({ reportAlert: vi.fn() }));
import { reportAlert } from "@/lib/alerts";

describe("standard envelope shape", () => {
  it("every helper returns the same { error, message } shape", async () => {
    const cases = [
      [unauthorized("x"), 401, "Unauthorized"],
      [forbidden("x"), 403, "Forbidden"],
      [notFound("x"), 404, "Not Found"],
      [conflict("x"), 409, "Conflict"],
      [badRequest("x"), 400, "Bad Request"],
      [unprocessableEntity("x"), 422, "Unprocessable Entity"],
    ] as const;
    for (const [response, status, label] of cases) {
      expect(response.status).toBe(status);
      const json = await response.json();
      expect(json).toEqual({ error: label, message: "x" });
    }
  });

  it("tooManyRequests sets a Retry-After header in addition to the standard envelope", async () => {
    const response = tooManyRequests("slow down", 42);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(await response.json()).toEqual({ error: "Too Many Requests", message: "slow down" });
  });

  it("serviceUnavailable (INF-5) returns the standard envelope at 503", async () => {
    const response = serviceUnavailable("db down");
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Service Unavailable", message: "db down" });
  });
});

describe("serverError — production must not leak internals (H2)", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = original;
  });

  it("suppresses the internal error message in production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const response = serverError("ctx", new Error("prisma exploded at /secret/path"));
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe("Internal Server Error");
    expect(json.details).toBeUndefined();
  });

  it("includes details outside production for developer ergonomics", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const json = await serverError("ctx", new Error("boom")).json();
    expect(json.details).toBe("boom");
  });
});

describe("mapDomainError (OBS-2 centralization)", () => {
  const table: Array<[Error, number]> = [
    [new AppointmentNotFoundError("x"), 404],
    [new InvalidTransitionError("x"), 409],
    [new DuplicateActiveAppointmentError("x"), 409],
    [new InvoiceNotFoundError("x"), 404],
    [new InvalidInvoiceTransitionError("x"), 409],
    [new InvalidPaymentError("x"), 400],
    [new LabOrderNotFoundError("x"), 404],
    [new InvalidLabOrderTransitionError("x"), 409],
    [new InvalidLabOrderInputError("x"), 400],
    [new ReleaseNotFoundError("x"), 404],
    [new InvalidReleaseTransitionError("x"), 409],
    [new ReleaseInputError("x"), 400],
    // Previously each handled by a duplicate instanceof-chain local to three
    // /api/organizations/[id]/events* routes — now centralized like everything else.
    [new EventNotFoundError("x"), 404],
    [new EventHandlerNotFoundError("x"), 404],
    // DATA-2/3: a duplicate-name conflict, distinct from DepartmentInputError.
    [new DepartmentNameConflictError("x"), 409],
  ];

  it.each(table)("maps %o to status %i", async (error, status) => {
    const response = mapDomainError(error);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(status);
  });

  it("returns null for an error class it doesn't recognize (falls through to serverError)", () => {
    class SomeNewUnwiredError extends Error {}
    expect(mapDomainError(new SomeNewUnwiredError("x"))).toBeNull();
  });
});

describe("mapDomainError — Prisma P2002 unique-constraint violations (DATA-2)", () => {
  const createdOrgIds: string[] = [];

  afterAll(async () => {
    await prisma.organization.deleteMany({ where: { id: { in: createdOrgIds } } });
  });

  it("maps a real unique-constraint violation to a standardized 409, not a raw 500", async () => {
    // A genuine P2002 from the real database — User.phone_number is @unique.
    const { owner, organization } = await createTestOrganization();
    createdOrgIds.push(organization.id);

    let caught: unknown;
    try {
      await prisma.user.create({
        data: { role: "receptionist", phone_number: owner.phone_number },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeDefined();

    const response = mapDomainError(caught);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(409);
    const json = await response!.json();
    expect(json.error).toBe("Conflict");
  });
});

describe("5xx error-rate alert trigger (RG-001 #3)", () => {
  // The 5xx window is real module-level state shared across every test in
  // this file (other tests trigger serverError() incidentally via
  // mapDomainError fall-through paths) — reset before AND after so this
  // block never inherits count from, or leaks count into, unrelated tests.
  beforeEach(() => {
    __reset5xxWindowForTests();
    vi.mocked(reportAlert).mockClear();
  });
  afterEach(() => {
    __reset5xxWindowForTests();
    vi.mocked(reportAlert).mockClear();
  });

  it("fires exactly one alert once the rolling-minute count reaches the threshold", () => {
    for (let i = 0; i < 9; i++) serverError(`test-${i}`, new Error("boom"));
    expect(reportAlert).not.toHaveBeenCalled();

    serverError("test-10th", new Error("boom")); // 10th — crosses FIVE_XX_THRESHOLD

    expect(reportAlert).toHaveBeenCalledTimes(1);
    const [alert] = vi.mocked(reportAlert).mock.calls[0];
    expect(alert.severity).toBe("critical");
    expect(alert.title).toContain("High 5xx error rate");
    expect(alert.detail).toContain("test-10th");
  });

  it("does not re-fire for every error past the threshold within the same window", () => {
    for (let i = 0; i < 15; i++) serverError(`test-${i}`, new Error("boom"));
    expect(reportAlert).toHaveBeenCalledTimes(1); // not 6 (15 - 9 before threshold)
  });
});
