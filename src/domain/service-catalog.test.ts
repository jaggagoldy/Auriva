import { describe, expect, it } from "vitest";
import {
  SERVICE_CATEGORIES,
  SERVICE_KINDS,
  canActorAddKind,
  isServiceCategory,
  isServiceKind,
} from "./service-catalog";

describe("service-catalog enums", () => {
  it("isServiceCategory recognizes every declared category and rejects garbage", () => {
    for (const category of SERVICE_CATEGORIES) {
      expect(isServiceCategory(category)).toBe(true);
    }
    expect(isServiceCategory("consultation")).toBe(false); // case-sensitive by design
    expect(isServiceCategory("Surgery")).toBe(false);
  });

  it("isServiceKind recognizes clinical and financial only", () => {
    for (const kind of SERVICE_KINDS) {
      expect(isServiceKind(kind)).toBe(true);
    }
    expect(isServiceKind("billing")).toBe(false);
  });
});

describe("permission-by-kind (canActorAddKind)", () => {
  // The core rule: a doctor adds clinical acts, reception adds financial charges,
  // never the other way round.
  it("a doctor may add clinical, not financial", () => {
    expect(canActorAddKind("doctor", "clinical")).toBe(true);
    expect(canActorAddKind("doctor", "financial")).toBe(false);
  });

  it("reception may add financial, not clinical", () => {
    expect(canActorAddKind("reception", "financial")).toBe(true);
    expect(canActorAddKind("reception", "clinical")).toBe(false);
  });
});
