// P5 Diagnostics — the internal catalog a doctor picks from to RECOMMEND tests
// (pathology / radiology / cardiology …). This is a recommendation workflow,
// not laboratory management: Auriva does not own or run labs. The catalog is
// static domain data; a recommendation stores a snapshot (code + name + prep)
// so it stays stable even if this list later changes.

export type DiagnosticCategory =
  | "pathology"
  | "biochemistry"
  | "endocrinology"
  | "microbiology"
  | "radiology"
  | "cardiology";

export interface DiagnosticTest {
  code: string;
  name: string;
  category: DiagnosticCategory;
  /** Search synonyms / acronyms (typing "CBC" or "USG" should match). */
  aliases?: string[];
  /** Patient-facing preparation note shown in the Health Vault. */
  prep?: string;
}

export interface DiagnosticPackage {
  code: string;
  name: string;
  description: string;
  testCodes: string[];
}

export const DIAGNOSTIC_CATEGORIES: { key: DiagnosticCategory; label: string }[] = [
  { key: "pathology", label: "Pathology" },
  { key: "biochemistry", label: "Biochemistry" },
  { key: "endocrinology", label: "Endocrinology" },
  { key: "microbiology", label: "Microbiology" },
  { key: "radiology", label: "Radiology" },
  { key: "cardiology", label: "Cardiology" },
];

// Common preparation notes reused across tests.
const FASTING = "Requires 8–12 hours of overnight fasting.";
const FULL_BLADDER = "Drink plenty of water and do not pass urine — a full bladder is required.";
const NO_METAL = "Avoid wearing metal jewellery or accessories.";

export const DIAGNOSTIC_TESTS: DiagnosticTest[] = [
  // Pathology — Hematology
  { code: "cbc", name: "Complete Blood Count (CBC)", category: "pathology", aliases: ["cbc", "hemogram", "blood count"] },
  { code: "esr", name: "ESR", category: "pathology", aliases: ["esr", "sed rate"] },
  { code: "ferritin", name: "Iron Studies / Serum Ferritin", category: "pathology", aliases: ["iron", "ferritin"] },
  { code: "ptinr", name: "PT / INR Coagulation", category: "pathology", aliases: ["pt", "inr", "coagulation"] },
  { code: "urine_routine", name: "Urine Routine & Microscopy", category: "pathology", aliases: ["urine", "urine routine"] },
  { code: "stool_routine", name: "Stool Routine", category: "pathology", aliases: ["stool"] },

  // Biochemistry / Metabolic
  { code: "hba1c", name: "HbA1c (Glycated Hemoglobin)", category: "biochemistry", aliases: ["hba1c", "a1c", "glycated"] },
  { code: "fbs", name: "Fasting Blood Sugar (FBS)", category: "biochemistry", aliases: ["fbs", "fasting sugar", "glucose"], prep: FASTING },
  { code: "lft", name: "Liver Function Test (LFT)", category: "biochemistry", aliases: ["lft", "liver"] },
  { code: "kft", name: "Kidney Function Test (KFT / RFT)", category: "biochemistry", aliases: ["kft", "rft", "kidney", "renal"] },
  { code: "lipid", name: "Lipid Profile", category: "biochemistry", aliases: ["lipid", "cholesterol"], prep: FASTING },

  // Endocrinology
  { code: "thyroid", name: "Thyroid Profile (T3 / T4 / TSH)", category: "endocrinology", aliases: ["thyroid", "tsh", "t3", "t4"] },
  { code: "vitd", name: "Vitamin D3 (25-Hydroxy)", category: "endocrinology", aliases: ["vitamin d", "vit d", "d3"] },
  { code: "vitb12", name: "Vitamin B12", category: "endocrinology", aliases: ["b12", "vitamin b12"] },

  // Microbiology / Serology & Immunology
  { code: "dengue", name: "Dengue NS1 / IgM", category: "microbiology", aliases: ["dengue", "ns1"] },
  { code: "widal", name: "Typhoid (Widal)", category: "microbiology", aliases: ["widal", "typhoid"] },
  { code: "ra", name: "Rheumatoid Factor (RA)", category: "microbiology", aliases: ["ra", "rheumatoid"] },
  { code: "crp", name: "C-Reactive Protein (CRP)", category: "microbiology", aliases: ["crp", "c-reactive"] },

  // Radiology & Imaging
  { code: "cxr", name: "Chest X-Ray (PA View)", category: "radiology", aliases: ["chest x-ray", "cxr", "x-ray"], prep: NO_METAL },
  { code: "xr_ls", name: "Lumbar Spine X-Ray (AP & Lat)", category: "radiology", aliases: ["lumbar", "spine x-ray"], prep: NO_METAL },
  { code: "usg_abdomen", name: "USG Whole Abdomen", category: "radiology", aliases: ["usg", "ultrasound", "abdomen"], prep: FULL_BLADDER },
  { code: "usg_pelvis", name: "USG Pelvis / Lower Abdomen", category: "radiology", aliases: ["usg pelvis", "pelvis"], prep: FULL_BLADDER },
  { code: "tiffa", name: "Obstetric TIFFA Scan", category: "radiology", aliases: ["tiffa", "anomaly scan", "obstetric"] },
  { code: "hrct", name: "HRCT Chest", category: "radiology", aliases: ["hrct", "ct chest"], prep: NO_METAL },
  { code: "ct_brain", name: "CT Brain (Plain / Contrast)", category: "radiology", aliases: ["ct brain", "ct head"], prep: NO_METAL },
  { code: "mri_brain", name: "MRI Brain", category: "radiology", aliases: ["mri brain"], prep: NO_METAL },
  { code: "mri_ls", name: "MRI Lumbar Spine", category: "radiology", aliases: ["mri spine", "mri lumbar"], prep: NO_METAL },

  // Cardiology
  { code: "ecg", name: "12-Lead ECG", category: "cardiology", aliases: ["ecg", "ekg"] },
  { code: "echo", name: "2D Echocardiography", category: "cardiology", aliases: ["echo", "2d echo"] },
  { code: "tmt", name: "Treadmill Test (TMT)", category: "cardiology", aliases: ["tmt", "treadmill", "stress test"] },
];

export const DIAGNOSTIC_PACKAGES: DiagnosticPackage[] = [
  { code: "fever", name: "Fever Panel", description: "CBC · Dengue NS1 · Widal", testCodes: ["cbc", "dengue", "widal"] },
  { code: "metabolic", name: "Metabolic Panel", description: "HbA1c · Lipid · KFT · LFT", testCodes: ["hba1c", "lipid", "kft", "lft"] },
  { code: "antenatal", name: "Antenatal Panel", description: "CBC · Urine Routine · USG Pelvis", testCodes: ["cbc", "urine_routine", "usg_pelvis"] },
  { code: "thyroid_screen", name: "Thyroid Screen", description: "TSH profile · Vitamin D3 · B12", testCodes: ["thyroid", "vitd", "vitb12"] },
];

const BY_CODE = new Map(DIAGNOSTIC_TESTS.map((t) => [t.code, t]));
export function getTest(code: string): DiagnosticTest | undefined {
  return BY_CODE.get(code);
}
