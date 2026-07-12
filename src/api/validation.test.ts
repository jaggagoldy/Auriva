// TEST-4: validation-helper regression coverage (DATA-1).

import { describe, expect, it } from "vitest";
import {
  hasRequiredFields,
  missingFields,
  isNonEmptyString,
  isOneOf,
  isPlainObject,
  parseDateOrNull,
} from "./validation";

describe("hasRequiredFields / missingFields", () => {
  it("passes when every field is present and truthy", () => {
    expect(hasRequiredFields({ a: "x", b: 1 }, ["a", "b"])).toBe(true);
    expect(missingFields({ a: "x", b: 1 }, ["a", "b"])).toEqual([]);
  });

  it("fails when a field is missing, empty, or falsy", () => {
    expect(hasRequiredFields({ a: "" }, ["a", "b"])).toBe(false);
    expect(missingFields({ a: "", c: "x" }, ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("isNonEmptyString", () => {
  it("accepts a real, non-blank string", () => {
    expect(isNonEmptyString("hello")).toBe(true);
  });

  it("rejects blank strings and non-strings", () => {
    expect(isNonEmptyString("")).toBe(false);
    expect(isNonEmptyString("   ")).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
    expect(isNonEmptyString(["a"])).toBe(false);
  });
});

describe("isOneOf", () => {
  const allowed = ["cash", "upi", "card"] as const;

  it("accepts a value in the allowed set", () => {
    expect(isOneOf("upi", allowed)).toBe(true);
  });

  it("rejects a value outside the allowed set, including non-strings", () => {
    expect(isOneOf("bitcoin", allowed)).toBe(false);
    expect(isOneOf(null, allowed)).toBe(false);
    expect(isOneOf(undefined, allowed)).toBe(false);
  });
});

describe("isPlainObject", () => {
  it("accepts a real JSON object", () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject({})).toBe(true);
  });

  it("rejects null, arrays, and primitives — a malformed body should never silently pass", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(["a", "b"])).toBe(false);
    expect(isPlainObject("a string")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
  });
});

describe("parseDateOrNull", () => {
  it("parses a valid date string", () => {
    const parsed = parseDateOrNull("2026-01-01");
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
  });

  it("returns null for absent or unparseable input", () => {
    expect(parseDateOrNull(null)).toBeNull();
    expect(parseDateOrNull(undefined)).toBeNull();
    expect(parseDateOrNull("")).toBeNull();
    expect(parseDateOrNull("not-a-date")).toBeNull();
  });
});
