"use client";

// M3B B4 — Billing Policy settings. Choose when the consultation fee is
// collected; for prepaid/hybrid, optionally hard-block the doctor until it is.
// Uses the audited /api/clinic/billing-policy setter.

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Policy = "postpaid" | "prepaid" | "hybrid";
const OPTIONS: { id: Policy; label: string; blurb: string }[] = [
  { id: "postpaid", label: "Postpaid", blurb: "Collect everything at checkout, after the visit. (Default)" },
  { id: "prepaid", label: "Prepaid", blurb: "Collect the consultation fee before the doctor; other services at checkout." },
  { id: "hybrid", label: "Hybrid", blurb: "Consultation up front; additional services at checkout." },
];

export function BillingPolicySettings() {
  const [policy, setPolicy] = React.useState<Policy | null>(null);
  const [hardGate, setHardGate] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/clinic/billing-policy", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { policy: Policy; hardGate: boolean } | null) => { if (d) { setPolicy(d.policy); setHardGate(d.hardGate); } })
      .catch(() => {});
  }, []);

  async function patch(next: { policy?: Policy; hardGate?: boolean }) {
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/billing-policy", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error((d as { message?: string }).message ?? "Couldn't update the policy."); return; }
      setPolicy(d.policy); setHardGate(d.hardGate);
      toast.success("Billing policy updated.");
    } finally { setSaving(false); }
  }

  const prepaidish = policy === "prepaid" || policy === "hybrid";

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-sm font-semibold">Billing Policy</h3>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">When is the consultation fee collected?</p>

      {policy === null ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              disabled={saving}
              onClick={() => patch({ policy: o.id })}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                policy === o.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              )}
            >
              <span className={cn("mt-0.5 grid size-4 place-items-center rounded-full border", policy === o.id ? "border-primary" : "border-muted-foreground")}>
                {policy === o.id && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span>
                <span className="text-sm font-medium">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.blurb}</span>
              </span>
            </button>
          ))}

          {prepaidish && (
            <label className={cn("mt-2 flex items-center justify-between gap-3 rounded-xl border p-3", saving && "opacity-60")}>
              <span>
                <span className="text-sm font-medium">Hard gate</span>
                <span className="block text-xs text-muted-foreground">Block starting the consultation until the fee is collected. Off = warn, allow override (audited).</span>
              </span>
              <input type="checkbox" checked={hardGate} disabled={saving} onChange={(e) => patch({ hardGate: e.target.checked })} className="size-4" />
            </label>
          )}
        </div>
      )}
    </section>
  );
}
