"use client";

// M3B B4 — the prepaid/hybrid consultation gate at "Start consultation" (/clinic).
// Postpaid or already-collected → proceeds immediately (no dialog). Otherwise:
//  • Collect now → prepares the consultation invoice + opens the Checkout Workspace
//  • Start anyway → audited soft override (hidden when the hard gate is on)

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckoutWorkspace } from "@/components/shared/checkout/checkout-workspace";

interface Gate { policy: string; required: boolean; satisfied: boolean; hardBlock: boolean; consultationFee: number; collected: number }

export function ConsultationGateDialog({
  appointmentId,
  patientName,
  onProceed,
  onCancel,
}: {
  appointmentId: string;
  patientName: string;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const [gate, setGate] = React.useState<Gate | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [collectInvoiceId, setCollectInvoiceId] = React.useState<string | null>(null);
  const [recheck, setRecheck] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/clinic/consultation-gate?appointment_id=${appointmentId}`, { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) return onProceed(); // fail-open: never trap the clinic on a gate read error
      const g: Gate = await res.json();
      if (cancelled) return;
      if (!g.required || g.satisfied) return onProceed(); // inert → straight through
      setGate(g);
    })();
    return () => { cancelled = true; };
  }, [appointmentId, onProceed, recheck]);

  async function collectNow() {
    setBusy(true);
    try {
      const res = await fetch("/api/clinic/consultation-gate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", appointment_id: appointmentId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.invoiceId) { toast.error(d.message ?? "Couldn't prepare the consultation invoice."); return; }
      setCollectInvoiceId(d.invoiceId as string);
    } finally { setBusy(false); }
  }

  async function startAnyway() {
    setBusy(true);
    try {
      await fetch("/api/clinic/consultation-gate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "override", appointment_id: appointmentId }),
      });
      onProceed();
    } finally { setBusy(false); }
  }

  if (collectInvoiceId) {
    // Collect the consultation fee, then re-check the gate.
    return (
      <CheckoutWorkspace
        invoiceId={collectInvoiceId}
        onClose={() => setCollectInvoiceId(null)}
        onDone={() => { setCollectInvoiceId(null); setRecheck((x) => x + 1); }}
      />
    );
  }

  if (!gate) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40">
        <Loader2 className="size-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg">
        <h2 className="font-heading text-lg font-bold">Collect consultation fee first</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This clinic collects the consultation fee before the visit ({gate.policy}). {patientName} owes{" "}
          <strong className="text-foreground">₹{gate.consultationFee.toLocaleString("en-IN")}</strong>.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
          {!gate.hardBlock && (
            <Button variant="outline" disabled={busy} onClick={startAnyway}>Continue Without Payment</Button>
          )}
          <Button disabled={busy} onClick={collectNow}>{busy && <Loader2 className="size-4 animate-spin" />} Collect now</Button>
        </div>
        {gate.hardBlock && <p className="mt-3 text-xs text-muted-foreground">Your clinic requires the fee before starting (hard gate).</p>}
      </div>
    </div>
  );
}
