// C4 — the PrescriptionMedicine contract (pure). Backward compatibility (A9),
// separated frequency/administration (A3), patient language (A6), display_name
// (A2), and the shared formatter (A4).

import { describe, expect, it } from "vitest";
import {
  formatMedicine,
  frequencyLabel,
  medicineDisplayName,
  parseMedicines,
} from "@/domain/prescription";

describe("backward compatibility (A9)", () => {
  it("parses the legacy {name,dosage,frequency,duration} shape", () => {
    const json = JSON.stringify([{ name: "Amoxicillin", dosage: "500 mg", frequency: "TDS", duration: "5 days" }]);
    const meds = parseMedicines(json);
    expect(meds).toHaveLength(1);
    expect(medicineDisplayName(meds[0])).toBe("Amoxicillin 500 mg");
  });

  it("drops blank rows and never throws on bad JSON", () => {
    expect(parseMedicines("not json")).toEqual([]);
    expect(parseMedicines(JSON.stringify([{ name: "" }, { drug: "Metformin" }]))).toHaveLength(1);
    expect(parseMedicines(null)).toEqual([]);
  });
});

describe("display_name (A2)", () => {
  it("prefers explicit display_name over the internal drug id", () => {
    expect(medicineDisplayName({ drug: "amox_500", display_name: "Amoxicillin 500 mg Capsule" })).toBe("Amoxicillin 500 mg Capsule");
  });
  it("derives drug + strength when display_name absent", () => {
    expect(medicineDisplayName({ drug: "Paracetamol", strength: "650 mg" })).toBe("Paracetamol 650 mg");
  });
});

describe("dose vocabulary — clinical vs patient (A3, A6)", () => {
  it("renders TDS clinically and in patient language", () => {
    expect(frequencyLabel("TDS", "clinical")).toBe("TDS — three times daily");
    expect(frequencyLabel("TDS", "patient")).toBe("Three times daily");
  });
  it("renders HS as 'At bedtime' for patients", () => {
    expect(frequencyLabel("HS", "patient")).toBe("At bedtime");
  });
  it("translates India's 1-0-1 notation for patients", () => {
    expect(frequencyLabel("1-0-1", "clinical")).toBe("1-0-1");
    expect(frequencyLabel("1-0-1", "patient")).toBe("Morning, Night");
  });
  it("passes unknown frequencies through unchanged", () => {
    expect(frequencyLabel("every 6h", "patient")).toBe("every 6h");
  });
});

describe("shared formatter (A4) — one render model", () => {
  it("keeps frequency and administration separate and audience-correct", () => {
    const m = { drug: "Augmentin", strength: "625 mg", frequency: "BD", administration: "after_food", duration: "7 days" };
    expect(formatMedicine(m, "patient")).toEqual({
      name: "Augmentin 625 mg",
      directions: "Twice daily · After food · 7 days",
    });
    expect(formatMedicine(m, "clinical").directions).toBe("BD — twice daily · After food · 7 days");
  });
});
