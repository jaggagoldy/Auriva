// Milestone 2 · 3.1 — the ONE doctor-filter vocabulary, shared by patient
// discovery (3.2) and the reception doctor picker (3.3). Pure (no React, no
// Prisma) so it's importable anywhere. Date-relative helpers take an explicit
// `todayKey` (computed in an effect by the caller) to stay render-pure.

export interface DoctorFilters {
  query: string;
  specialty: string; // "" = all specialties
  availableToday: boolean;
}

export const EMPTY_DOCTOR_FILTERS: DoctorFilters = { query: "", specialty: "", availableToday: false };

/** Minimal shape the filter helpers need — both surfaces' doctor types satisfy it. */
export interface FilterableDoctor {
  full_name: string;
  specialty: string | null;
  clinic?: { name: string } | null;
}

/** Local YYYY-MM-DD for an ISO datetime (parses a value — not a clock read). */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The unique, sorted specialties present in a doctor list (for the dropdown). */
export function uniqueSpecialties(doctors: { specialty: string | null }[]): string[] {
  return [...new Set(doctors.map((d) => d.specialty).filter((s): s is string => Boolean(s && s.trim())))].sort();
}

/** Does a doctor pass the current filters? `nextSlotIso` powers "Available today". */
export function matchesDoctorFilters(
  doctor: FilterableDoctor,
  filters: DoctorFilters,
  nextSlotIso: string | null | undefined,
  todayKey: string
): boolean {
  const q = filters.query.trim().toLowerCase();
  if (q) {
    const hay = `${doctor.full_name} ${doctor.specialty ?? ""} ${doctor.clinic?.name ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.specialty && doctor.specialty !== filters.specialty) return false;
  if (filters.availableToday) {
    if (!nextSlotIso || dayKey(nextSlotIso) !== todayKey) return false;
  }
  return true;
}

/** Human "Next available" label: "Today 10:40 AM" / "Tomorrow 9:00 AM" / "Mon 9:00 AM" / "No slots". */
export function formatNextSlot(iso: string | null | undefined, todayKey: string): string {
  if (!iso) return "No slots (7d)";
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const key = dayKey(iso);
  const tomorrow = new Date(`${todayKey}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (key === todayKey) return `Today ${time}`;
  if (key === tomorrowKey) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;
}
