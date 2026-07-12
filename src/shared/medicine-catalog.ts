// A static picklist of common generic medicine names to speed up
// prescription entry (autocomplete only — not a drug database, not dosing
// guidance, and it does not power any interaction checking).

export const COMMON_MEDICINES: string[] = [
  "Paracetamol", "Ibuprofen", "Aspirin", "Amoxicillin", "Azithromycin",
  "Ciprofloxacin", "Metronidazole", "Cetirizine", "Levocetirizine",
  "Montelukast", "Salbutamol", "Omeprazole", "Pantoprazole", "Ranitidine",
  "Domperidone", "Ondansetron", "Metformin", "Glimepiride", "Amlodipine",
  "Atenolol", "Losartan", "Telmisartan", "Atorvastatin", "Rosuvastatin",
  "Levothyroxine", "Vitamin D3", "Vitamin B12", "Calcium Carbonate",
  "Iron Folic Acid", "Multivitamin", "Diclofenac", "Aceclofenac",
  "Chlorpheniramine", "Loratadine", "Amoxiclav", "Doxycycline",
  "Prednisolone", "Dexamethasone", "Insulin Glargine", "ORS",
  "Zinc Sulphate", "Cough Syrup (Dextromethorphan)", "Povidone Iodine",
];

export const DOSAGE_PRESETS = ["1-0-1", "1-1-1", "0-0-1", "1-0-0", "SOS", "BD", "TDS", "OD"];

export const NOTE_TEMPLATES: { label: string; text: string }[] = [
  {
    label: "Viral fever",
    text: "Dx: Viral fever\n\nFindings: Mild fever, body ache, no localizing signs.\n\nAdvice: Rest, hydration, symptomatic care.\n\nFollow-up: If fever persists beyond 3 days.",
  },
  {
    label: "Routine check-up",
    text: "Dx: Routine health check\n\nFindings: No acute complaints. Vitals within normal range.\n\nAdvice: Continue current lifestyle/medication.\n\nFollow-up: Annual review.",
  },
  {
    label: "Follow-up review",
    text: "Dx: Follow-up review\n\nFindings: Reviewing response to prior treatment.\n\nAdvice: —\n\nFollow-up: —",
  },
];
