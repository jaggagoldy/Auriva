// C4 — Prescription Platform. The canonical clinical prescription contract.
//
// PLATFORM CONTRACT (PO-frozen): `PrescriptionMedicine` is one of Auriva's
// canonical business objects. Every surface — the consult editor, the printed
// Prescription document, the timeline, the patient app — reads and writes THIS
// shape. It is a *superset* of the legacy `{ name, dosage, frequency, duration }`
// so historic rows remain valid (backward compatible by construction).
//
// A10 (guardrail): this contract is CLINICAL, not commercial. It must never
// carry SKU / stock / purchase price / vendor — those belong to a future
// Pharmacy module, not the prescription. Keep this object clean.
//
// Lifecycle (A1, documented — mechanics reuse existing platform behaviour):
//   draft → saved-during-consult (Prescription row, mutable)
//         → issued (an immutable Prescription DOCUMENT is generated on completion)
//         → superseded (regenerate → version+1, prior version superseded)  [future]
//         → archived                                                       [future]
// Only the *issued document* is immutable; the Prescription row stays the
// source of truth (same pattern as Invoice → Invoice Document).
//
// This module is pure (no server imports) so the client editor and the server
// document builder share ONE render model (A4: preview === print).

export interface PrescriptionMedicine {
  id?: string;
  /** Canonical drug name. */
  drug?: string;
  /** Legacy alias for `drug` — historic rows use `name`. */
  name?: string;
  /** UI label the presentation layer shows (A2). Never depend on an internal
   *  identifier; catalog / formulary / pharmacy integrations will each key
   *  differently, so the UI reads `display_name`. Derived when absent. */
  display_name?: string;
  /** e.g. "500 mg". */
  strength?: string;
  /** Legacy alias for `strength`. */
  dosage?: string;
  /** Tablet / Capsule / Syrup / Ointment … */
  form?: string;
  /** Oral / Topical / IV … */
  route?: string;
  /** Dose pattern — a DOSE_FREQUENCY code (OD/BD/TDS…) or India's "1-0-1". */
  frequency?: string;
  /** Administration timing — SEPARATE from frequency (A3). */
  administration?: string;
  /** e.g. "5 days". */
  duration?: string;
  instructions?: string;
  quantity?: string;
}

export function medicineDrug(m: PrescriptionMedicine): string {
  return (m.drug ?? m.name ?? "").trim();
}
export function medicineStrength(m: PrescriptionMedicine): string {
  return (m.strength ?? m.dosage ?? "").trim();
}
/** The UI label (A2) — explicit `display_name`, else drug + strength. */
export function medicineDisplayName(m: PrescriptionMedicine): string {
  const explicit = m.display_name?.trim();
  if (explicit) return explicit;
  return [medicineDrug(m), medicineStrength(m)].filter(Boolean).join(" ");
}

// ---- Dose vocabulary (A3, A6) ----------------------------------------------
// Frequency and administration are separate concepts. Each code carries a
// `clinical` shorthand (what doctors read) and a `patient` phrase (what the
// patient-facing document renders — patients never have to decode "TDS").
export interface DoseTerm {
  code: string;
  clinical: string;
  patient: string;
}

export const DOSE_FREQUENCY: Record<string, DoseTerm> = {
  OD: { code: "OD", clinical: "OD — once daily", patient: "Once daily" },
  BD: { code: "BD", clinical: "BD — twice daily", patient: "Twice daily" },
  TDS: { code: "TDS", clinical: "TDS — three times daily", patient: "Three times daily" },
  QID: { code: "QID", clinical: "QID — four times daily", patient: "Four times daily" },
  HS: { code: "HS", clinical: "HS — at night", patient: "At bedtime" },
  SOS: { code: "SOS", clinical: "SOS — as needed", patient: "As needed" },
  STAT: { code: "STAT", clinical: "STAT — at once", patient: "Immediately, once" },
  QOD: { code: "QOD", clinical: "QOD — alternate days", patient: "Every other day" },
};

export const ADMINISTRATION: Record<string, DoseTerm> = {
  before_food: { code: "before_food", clinical: "Before food", patient: "Before food" },
  after_food: { code: "after_food", clinical: "After food", patient: "After food" },
  with_food: { code: "with_food", clinical: "With food", patient: "With food" },
  empty_stomach: { code: "empty_stomach", clinical: "Empty stomach", patient: "On an empty stomach" },
};

export type DoseAudience = "clinical" | "patient";

/** Render a frequency for the given audience. Handles DOSE_FREQUENCY codes and
 *  India's "morning-afternoon-night" count notation ("1-0-1"). Unknown values
 *  pass through unchanged so nothing is ever lost. */
export function frequencyLabel(freq: string | undefined, audience: DoseAudience): string {
  const raw = (freq ?? "").trim();
  if (!raw) return "";
  const term = DOSE_FREQUENCY[raw.toUpperCase()];
  if (term) return audience === "patient" ? term.patient : term.clinical;
  // "1-0-1" style: one count per morning / afternoon / night.
  const m = raw.match(/^(\d+)\s*-\s*(\d+)\s*-\s*(\d+)$/);
  if (m) {
    if (audience === "clinical") return raw;
    const slots = ["Morning", "Afternoon", "Night"];
    const on = m.slice(1).map((n, i) => (Number(n) > 0 ? slots[i] : null)).filter(Boolean);
    return on.length ? on.join(", ") : raw;
  }
  return raw;
}

export function administrationLabel(admin: string | undefined, audience: DoseAudience): string {
  const raw = (admin ?? "").trim();
  if (!raw) return "";
  const term = ADMINISTRATION[raw];
  return term ? (audience === "patient" ? term.patient : term.clinical) : raw;
}

/** The shared render model (A4) — ONE formatter behind both the editor preview
 *  and the printed document, so they are identical, not approximate. Returns
 *  the display name plus a single directions line for the audience. */
export function formatMedicine(m: PrescriptionMedicine, audience: DoseAudience): { name: string; directions: string } {
  const parts = [
    frequencyLabel(m.frequency, audience),
    administrationLabel(m.administration, audience),
    (m.duration ?? "").trim(),
    (m.instructions ?? "").trim(),
  ].filter(Boolean);
  return { name: medicineDisplayName(m), directions: parts.join(" · ") };
}

/** Tolerant parse: accepts the legacy shape and the structured superset, drops
 *  blank rows. Never throws (backward-compatible golden path, A9). */
export function parseMedicines(json: string | null | undefined): PrescriptionMedicine[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return (parsed as PrescriptionMedicine[]).filter((m) => medicineDrug(m).length > 0);
  } catch {
    return [];
  }
}
