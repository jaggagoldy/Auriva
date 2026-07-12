"use client";

import * as React from "react";
import {
  Check,
  FileText,
  Loader2,
  PenLine,
  Pill,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Appointment, PrescriptionMedicine, formatTime, parseMedicines } from "@/shared/queue";
import { COMMON_MEDICINES, DOSAGE_PRESETS, NOTE_TEMPLATES } from "@/shared/medicine-catalog";

function emptyMedicine(): PrescriptionMedicine {
  return { id: crypto.randomUUID(), name: "", dosage: "", frequency: "", duration: "" };
}

function favoritesKey(doctorId: string) {
  return `doctor_favorite_medicines_${doctorId}`;
}

function loadFavorites(doctorId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(favoritesKey(doctorId)) ?? "[]");
  } catch {
    return [];
  }
}

interface PrescriptionEditorProps {
  appointment: Appointment;
  doctorId: string;
  recentMedicines: string[];
  updating: boolean;
  onSignComplete: (patch: {
    diagnosis: string;
    prescription_notes: string;
    prescription_medicines_json: string;
    follow_up_date: string | null;
  }) => void;
  onSaveDraft: (patch: {
    diagnosis: string;
    prescription_notes: string;
    prescription_medicines_json: string;
    follow_up_date: string | null;
  }) => Promise<void>;
}

export default function PrescriptionEditor({
  appointment,
  doctorId,
  recentMedicines,
  updating,
  onSignComplete,
  onSaveDraft,
}: PrescriptionEditorProps) {
  const [diagnosis, setDiagnosis] = React.useState(appointment.diagnosis ?? "");
  const [notes, setNotes] = React.useState(appointment.prescription_notes ?? "");
  const [medicines, setMedicines] = React.useState<PrescriptionMedicine[]>(() => {
    const parsed = parseMedicines(appointment.prescription_medicines_json);
    return parsed.length ? parsed : [emptyMedicine()];
  });
  const [followUp, setFollowUp] = React.useState(appointment.follow_up_date?.slice(0, 10) ?? "");
  const [favorites, setFavorites] = React.useState<string[]>(() => loadFavorites(doctorId));
  const [medicineQuery, setMedicineQuery] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [saving, setSaving] = React.useState(false);
  const skipAutosaveRef = React.useRef(true);

  const isEmpty =
    !diagnosis.trim() &&
    !notes.trim() &&
    medicines.every((m) => !m.name.trim() && !m.dosage && !m.frequency && !m.duration);

  const buildPatch = React.useCallback(
    () => ({
      diagnosis: diagnosis.trim(),
      prescription_notes: notes,
      prescription_medicines_json: JSON.stringify(medicines.filter((m) => m.name.trim())),
      follow_up_date: followUp || null,
    }),
    [diagnosis, notes, medicines, followUp]
  );

  const persist = React.useCallback(async () => {
    setSaving(true);
    try {
      await onSaveDraft(buildPatch());
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [buildPatch, onSaveDraft]);

  React.useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (isEmpty) return;
    const timeout = setTimeout(() => {
      persist();
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis, notes, medicines, followUp]);

  const toggleFavorite = (name: string) => {
    setFavorites((prev) => {
      const next = prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name];
      localStorage.setItem(favoritesKey(doctorId), JSON.stringify(next));
      return next;
    });
  };

  const setMedicineField = (id: string, field: keyof Omit<PrescriptionMedicine, "id">, value: string) => {
    setMedicines((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const completed = appointment.status === "completed";
  const suggestions = medicineQuery
    ? COMMON_MEDICINES.filter((m) => m.toLowerCase().includes(medicineQuery.toLowerCase())).slice(0, 6)
    : [];

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Diagnosis &amp; E-Prescription</h2>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {saving ? "Saving…" : savedAt ? `Saved ${formatTime(savedAt)}` : "No draft saved"}
        </span>
      </header>

      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Input
            id="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Viral fever, Hypertension review"
            className="bg-background"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="clinical-notes">Clinical Notes</Label>
            <div className="flex items-center gap-1">
              {NOTE_TEMPLATES.map((t) => (
                <Button
                  key={t.label}
                  variant="ghost"
                  size="xs"
                  onClick={() => setNotes((prev) => prev || t.text)}
                  disabled={Boolean(notes)}
                >
                  <PenLine />
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            id="clinical-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={`Findings and advice for ${appointment.patient.full_name}…`}
            className="min-h-32 resize-y bg-background font-mono text-[13px] leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <Pill className="size-3.5 text-muted-foreground" />
              Medicines
            </Label>
            <Button variant="ghost" size="xs" onClick={() => setMedicines((rows) => [...rows, emptyMedicine()])}>
              <Plus />
              Add medicine
            </Button>
          </div>

          {(favorites.length > 0 || recentMedicines.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed bg-muted/40 p-2">
              {favorites.length > 0 && (
                <>
                  <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Favourites</span>
                  {favorites.slice(0, 6).map((name) => (
                    <QuickChip key={`fav-${name}`} label={name} onClick={() => {
                      setMedicines((rows) => {
                        const empty = rows.find((r) => !r.name.trim());
                        if (empty) return rows.map((r) => (r.id === empty.id ? { ...r, name } : r));
                        return [...rows, { ...emptyMedicine(), name }];
                      });
                    }} />
                  ))}
                </>
              )}
              {recentMedicines.length > 0 && (
                <>
                  <span className="ml-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Recently prescribed</span>
                  {recentMedicines.slice(0, 6).map((name) => (
                    <QuickChip key={`recent-${name}`} label={name} onClick={() => {
                      setMedicines((rows) => {
                        const empty = rows.find((r) => !r.name.trim());
                        if (empty) return rows.map((r) => (r.id === empty.id ? { ...r, name } : r));
                        return [...rows, { ...emptyMedicine(), name }];
                      });
                    }} />
                  ))}
                </>
              )}
            </div>
          )}

          <div className="overflow-visible rounded-lg border">
            <div className="grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_2rem_2rem] gap-px border-b bg-muted/50 px-2 py-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              <span>Medicine</span>
              <span>Dosage</span>
              <span>Frequency</span>
              <span>Duration</span>
              <span />
              <span />
            </div>
            <div className="divide-y">
              {medicines.map((row, index) => (
                <div
                  key={row.id}
                  className="relative grid grid-cols-[minmax(0,2.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_2rem_2rem] items-center gap-2 px-2 py-1.5"
                >
                  <div className="relative">
                    <Input
                      aria-label={`Medicine ${index + 1} name`}
                      value={row.name}
                      onChange={(e) => {
                        setMedicineField(row.id, "name", e.target.value);
                        setMedicineQuery(e.target.value ? row.id + "::" + e.target.value : null);
                      }}
                      onFocus={() => row.name && setMedicineQuery(row.id + "::" + row.name)}
                      onBlur={() => setTimeout(() => setMedicineQuery(null), 150)}
                      placeholder="Search medicine…"
                      className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                    />
                    {medicineQuery?.startsWith(row.id + "::") && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border bg-popover shadow-lg">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="block w-full px-2.5 py-1.5 text-left text-[12px] hover:bg-muted"
                            onMouseDown={() => {
                              setMedicineField(row.id, "name", s);
                              setMedicineQuery(null);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    aria-label={`Medicine ${index + 1} dosage`}
                    value={row.dosage}
                    onChange={(e) => setMedicineField(row.id, "dosage", e.target.value)}
                    placeholder="500 mg"
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                  />
                  <div className="relative">
                    <Input
                      aria-label={`Medicine ${index + 1} frequency`}
                      value={row.frequency}
                      onChange={(e) => setMedicineField(row.id, "frequency", e.target.value)}
                      placeholder="1-0-1"
                      className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                      list={`dosage-presets-${row.id}`}
                    />
                    <datalist id={`dosage-presets-${row.id}`}>
                      {DOSAGE_PRESETS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>
                  <Input
                    aria-label={`Medicine ${index + 1} duration`}
                    value={row.duration}
                    onChange={(e) => setMedicineField(row.id, "duration", e.target.value)}
                    placeholder="5 days"
                    className="h-7 border-transparent bg-transparent px-1.5 text-sm shadow-none dark:bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={row.name && favorites.includes(row.name) ? `Unfavourite ${row.name}` : `Favourite ${row.name}`}
                    disabled={!row.name.trim()}
                    onClick={() => toggleFavorite(row.name)}
                  >
                    <Star className={cn("size-3.5", row.name && favorites.includes(row.name) && "fill-amber-400 text-warning")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove medicine ${index + 1}`}
                    disabled={medicines.length === 1}
                    onClick={() => setMedicines((rows) => rows.filter((r) => r.id !== row.id))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10.5px] text-muted-foreground">
            Drug interaction checking is not yet available — verify interactions manually.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="follow-up">Follow-up date</Label>
          <Input
            id="follow-up"
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            className="h-8 w-44 bg-background text-sm"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-4">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {notes.length} chars · {medicines.filter((m) => m.name.trim()).length} medicine
            {medicines.filter((m) => m.name.trim()).length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isEmpty || saving}
              onClick={() => {
                persist();
                toast.success(`Draft saved for ${appointment.patient.full_name}`);
              }}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              disabled={completed || updating}
              onClick={() => onSignComplete(buildPatch())}
            >
              {updating ? <Loader2 className="animate-spin" /> : <Check />}
              {completed ? "Signed & completed" : "Sign & complete"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
    >
      {label}
    </button>
  );
}
