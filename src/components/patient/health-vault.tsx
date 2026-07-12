"use client";

import * as React from "react";
import { FlaskConical, Info, Check, Loader2, Upload, FileText, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// P5 Health Vault — the patient's recommended diagnostic tests. Shows prep
// instructions and a patient-driven status tracker (Pending → Booked →
// Completed → Report uploaded), with report upload. Recommendation workflow —
// the patient books/does the test wherever they like; Auriva doesn't run labs.

interface Recommendation {
  id: string;
  test_name: string;
  category: string;
  prep_instructions: string | null;
  status: "pending" | "booked" | "completed" | "report_uploaded";
  report_url: string | null;
  recommended_at: string;
  doctor: { full_name: string } | null;
  clinic: { name: string } | null;
}

const STAGES: { key: Recommendation["status"]; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "booked", label: "Booked" },
  { key: "completed", label: "Completed" },
  { key: "report_uploaded", label: "Report" },
];

export function HealthVault() {
  const [recs, setRecs] = React.useState<Recommendation[] | null>(null);

  const load = React.useCallback(() => {
    return fetch("/api/patient/recommendations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setRecs(d.recommendations); })
      .catch(() => {});
  }, []);
  React.useEffect(() => { load(); }, [load]);

  if (!recs) return <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  if (recs.length === 0)
    return (
      <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed py-14 text-center">
        <FlaskConical className="size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No recommended tests</p>
        <p className="max-w-[16rem] text-xs text-muted-foreground">Tests your doctor recommends appear here with prep steps.</p>
      </div>
    );

  // Group by recommendation batch (date + doctor).
  const groups: { key: string; date: string; doctor: string | null; items: Recommendation[] }[] = [];
  for (const r of recs) {
    const date = new Date(r.recommended_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    const key = `${date}·${r.doctor?.full_name ?? ""}`;
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(r);
    else groups.push({ key, date, doctor: r.doctor?.full_name ?? null, items: [r] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2 rounded-[12px] bg-honey-tint px-3.5 py-2.5 text-[12.5px] text-honey-deep">
            Recommended{g.doctor ? ` by ${g.doctor}` : ""} · {g.date}
          </div>
          <div className="space-y-2.5">
            {g.items.map((r) => <VaultRow key={r.id} rec={r} onChanged={load} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function VaultRow({ rec, onChanged }: { rec: Recommendation; onChanged: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const stageIndex = STAGES.findIndex((s) => s.key === rec.status);

  async function advance(status: Recommendation["status"]) {
    setBusy(true);
    const res = await fetch(`/api/patient/recommendations/${rec.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (res.ok) { toast.success("Updated"); onChanged(); }
    else toast.error("Couldn't update.");
  }

  async function upload(file?: File | null) {
    if (!file) return;
    setBusy(true);
    const fd = new FormData(); fd.append("file", file);
    const up = await fetch("/api/patient/uploads", { method: "POST", body: fd });
    const ud = await up.json().catch(() => ({}));
    if (!up.ok) { setBusy(false); toast.error(ud.message ?? "Upload failed."); return; }
    const res = await fetch(`/api/patient/recommendations/${rec.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report_url: ud.url }),
    });
    setBusy(false);
    if (res.ok) { toast.success("Report uploaded"); onChanged(); }
    else toast.error("Couldn't attach the report.");
  }

  return (
    <div className="rounded-[15px] border bg-card p-3.5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-accent text-accent-foreground"><FlaskConical className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold">{rec.test_name}</p>
          <p className="text-[12px] text-muted-foreground capitalize">{rec.category}</p>
        </div>
      </div>

      {rec.prep_instructions && (
        <div className="mt-2.5 flex items-start gap-2 rounded-[10px] bg-honey-tint px-3 py-2 text-[12px] text-honey-deep">
          <Info className="mt-0.5 size-3.5 shrink-0" /> <span>{rec.prep_instructions}</span>
        </div>
      )}

      {/* Status tracker */}
      <div className="mt-3 flex items-center gap-1">
        {STAGES.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1">
              <span className={cn("grid size-5 place-items-center rounded-full text-[10px] font-bold", i <= stageIndex ? "bg-honey-deep text-white" : "bg-secondary text-muted-foreground")}>
                {i < stageIndex || rec.status === "report_uploaded" && i === stageIndex ? <Check className="size-3" /> : i + 1}
              </span>
              <span className={cn("text-[9.5px] font-medium", i <= stageIndex ? "text-honey-deep" : "text-muted-foreground")}>{s.label}</span>
            </div>
            {i < STAGES.length - 1 && <span className={cn("h-0.5 flex-1 rounded", i < stageIndex ? "bg-honey-deep" : "bg-secondary")} />}
          </React.Fragment>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {rec.status === "pending" && (
          <ActBtn onClick={() => advance("booked")} busy={busy}><CalendarCheck className="size-3.5" /> Mark booked</ActBtn>
        )}
        {rec.status === "booked" && (
          <ActBtn onClick={() => advance("completed")} busy={busy}><Check className="size-3.5" /> Mark completed</ActBtn>
        )}
        {rec.status !== "report_uploaded" ? (
          <ActBtn onClick={() => fileRef.current?.click()} busy={busy} variant="outline"><Upload className="size-3.5" /> Upload report</ActBtn>
        ) : (
          <a href={rec.report_url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-muted">
            <FileText className="size-3.5" /> View report
          </a>
        )}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function ActBtn({ onClick, busy, variant, children }: { onClick: () => void; busy: boolean; variant?: "outline"; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={busy}
      className={cn("inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-60",
        variant === "outline" ? "border hover:bg-muted" : "bg-honey text-[#4A3413] hover:brightness-105")}>
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : children}
    </button>
  );
}
