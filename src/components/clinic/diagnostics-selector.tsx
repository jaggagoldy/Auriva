"use client";

import * as React from "react";
import { Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIAGNOSTIC_TESTS, DIAGNOSTIC_CATEGORIES, DIAGNOSTIC_PACKAGES, getTest,
} from "@/domain/diagnostics-catalog";

// P5 — the doctor RECOMMENDS tests from the internal catalog: search (with
// acronyms), category filter, one-click packages, checkboxes. Emits catalog
// codes; the consult turns them into patient recommendations on complete.
export function DiagnosticsSelector({ selected, onChange }: { selected: string[]; onChange: (codes: string[]) => void }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string>("all");
  const sel = new Set(selected);

  function toggle(code: string) {
    const next = new Set(sel);
    if (next.has(code)) next.delete(code); else next.add(code);
    onChange([...next]);
  }
  function addPackage(codes: string[]) {
    const next = new Set(sel);
    codes.forEach((c) => next.add(c));
    onChange([...next]);
  }

  const query = q.trim().toLowerCase();
  const filtered = DIAGNOSTIC_TESTS.filter((t) => {
    if (cat !== "all" && t.category !== cat) return false;
    if (!query) return true;
    return t.name.toLowerCase().includes(query) || (t.aliases ?? []).some((a) => a.includes(query));
  });

  return (
    <div className="space-y-3">
      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((code) => {
            const t = getTest(code);
            return (
              <span key={code} className="inline-flex items-center gap-1.5 rounded-full bg-honey-soft px-3 py-1.5 text-[13px] font-medium text-honey-deep">
                {t?.name ?? code}
                <button onClick={() => toggle(code)} aria-label={`Remove ${t?.name ?? code}`}><X className="size-3.5 opacity-70 hover:opacity-100" /></button>
              </span>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2.5 rounded-xl border bg-background px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests — CBC, USG, MRI, HbA1c…" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground" />
      </div>

      {/* Quick packages */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Packages</span>
        {DIAGNOSTIC_PACKAGES.map((p) => (
          <button key={p.code} onClick={() => addPackage(p.testCodes)} title={p.description}
            className="rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-honey-deep hover:text-honey-deep">
            + {p.name}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        <CatChip active={cat === "all"} onClick={() => setCat("all")}>All</CatChip>
        {DIAGNOSTIC_CATEGORIES.map((c) => (
          <CatChip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</CatChip>
        ))}
      </div>

      {/* Test list */}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {filtered.map((t) => {
          const on = sel.has(t.code);
          return (
            <button key={t.code} onClick={() => toggle(t.code)}
              className={cn("flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition", on ? "border-honey-deep/40 bg-honey-soft/60" : "hover:bg-muted/50")}>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-honey-deep bg-honey-deep text-white" : "border-border")}>
                {on && <Check className="size-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{t.name}</span>
                {t.prep && <span className="block truncate text-[11px] text-muted-foreground">Prep needed</span>}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="col-span-full py-4 text-center text-sm text-muted-foreground">No tests match “{q}”.</p>}
      </div>
    </div>
  );
}

function CatChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full px-3 py-1 text-[12.5px] font-semibold transition", active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}
