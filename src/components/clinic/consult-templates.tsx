"use client";

import * as React from "react";
import { Star, Plus, Trash2, FileText, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// P6 Clinical Templates — apply a reusable SOAP note into the consult, save the
// current visit as a template, and manage (favourite / edit / delete).
export interface ClinicalTemplate {
  id: string;
  name: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  advice: string | null;
  exercises: string | null;
  follow_up_days: number | null;
  is_favourite: boolean;
}

export interface TemplateDraft {
  subjective?: string;
  objective?: string;
  assessment?: string;
  advice?: string;
  follow_up_days?: number | null;
}

export function ConsultTemplates({ current, onApply }: { current: TemplateDraft; onApply: (t: ClinicalTemplate) => void }) {
  const [templates, setTemplates] = React.useState<ClinicalTemplate[] | null>(null);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClinicalTemplate | null>(null);
  const [creating, setCreating] = React.useState(false);

  const load = React.useCallback(() => {
    return fetch("/api/clinic/templates", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setTemplates(d.templates); })
      .catch(() => {});
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function toggleFav(t: ClinicalTemplate) {
    await fetch(`/api/clinic/templates/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_favourite: !t.is_favourite }) });
    load();
  }
  async function remove(t: ClinicalTemplate) {
    await fetch(`/api/clinic/templates/${t.id}`, { method: "DELETE" });
    toast.success("Template deleted");
    load();
  }

  if (templates === null) return null;

  const favourites = templates.filter((t) => t.is_favourite);
  const quick = (favourites.length ? favourites : templates).slice(0, 6);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <FileText className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Templates</h3>
        <span className="text-xs text-muted-foreground">apply a saved note</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCreating(true)}><Plus className="size-3.5" /> Save current</Button>
          <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>Manage</Button>
        </div>
      </div>
      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">No templates yet. Fill the consult and “Save current” to reuse it next time.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {quick.map((t) => (
            <button key={t.id} onClick={() => { onApply(t); toast.success(`Applied “${t.name}”`); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:text-primary">
              {t.is_favourite && <Star className="size-3 fill-honey text-honey" />} {t.name}
            </button>
          ))}
        </div>
      )}

      {creating && (
        <TemplateEditor
          initial={{ ...current }}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {manageOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4" onClick={() => setManageOpen(false)}>
          <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-base font-bold">Manage templates</h2>
              <button onClick={() => setManageOpen(false)} aria-label="Close"><X className="size-4" /></button>
            </div>
            {templates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              <div className="divide-y">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 py-2.5">
                    <button onClick={() => toggleFav(t)} aria-label="Favourite">
                      <Star className={cn("size-4", t.is_favourite ? "fill-honey text-honey" : "text-muted-foreground")} />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                    <button onClick={() => { setManageOpen(false); setEditing(t); }} className="text-xs font-semibold text-primary hover:underline">Edit</button>
                    <button onClick={() => remove(t)} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete"><Trash2 className="size-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ template, initial, onClose, onSaved }: {
  template?: ClinicalTemplate;
  initial?: TemplateDraft;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(template?.name ?? "");
  const [subjective, setSubjective] = React.useState(template?.subjective ?? initial?.subjective ?? "");
  const [objective, setObjective] = React.useState(template?.objective ?? initial?.objective ?? "");
  const [assessment, setAssessment] = React.useState(template?.assessment ?? initial?.assessment ?? "");
  const [plan, setPlan] = React.useState(template?.plan ?? "");
  const [advice, setAdvice] = React.useState(template?.advice ?? initial?.advice ?? "");
  const [exercises, setExercises] = React.useState(template?.exercises ?? "");
  const [followUp, setFollowUp] = React.useState<string>(
    template?.follow_up_days != null ? String(template.follow_up_days) : initial?.follow_up_days != null ? String(initial.follow_up_days) : ""
  );
  const [busy, setBusy] = React.useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Give the template a name.");
    setBusy(true);
    const body = {
      name: name.trim(), subjective, objective, assessment, plan, advice, exercises,
      follow_up_days: followUp === "" ? null : Number(followUp),
    };
    const res = template
      ? await fetch(`/api/clinic/templates/${template.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/clinic/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) { toast.success(template ? "Template updated" : "Template saved"); onSaved(); }
    else { const d = await res.json().catch(() => ({})); toast.error(d.message ?? "Couldn't save."); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <Card className="max-h-[85vh] w-full max-w-lg space-y-3 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-base font-bold">{template ? "Edit template" : "Save as template"}</h2>
        <div className="space-y-1.5"><Label htmlFor="tpl-name">Name</Label><Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diabetes review" autoFocus /></div>
        <Fld label="Subjective (chief complaint)" v={subjective} set={setSubjective} />
        <Fld label="Objective (examination)" v={objective} set={setObjective} />
        <Fld label="Assessment (diagnosis)" v={assessment} set={setAssessment} rows={1} />
        <Fld label="Plan" v={plan} set={setPlan} />
        <Fld label="Advice" v={advice} set={setAdvice} />
        <Fld label="Exercises" v={exercises} set={setExercises} />
        <div className="space-y-1.5"><Label htmlFor="tpl-fu">Follow-up in (days)</Label><Input id="tpl-fu" inputMode="numeric" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. 7" className="w-32" /></div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save</Button>
        </div>
      </Card>
    </div>
  );
}

function Fld({ label, v, set, rows = 2 }: { label: string; v: string; set: (s: string) => void; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea rows={rows} value={v} onChange={(e) => set(e.target.value)} />
    </div>
  );
}
