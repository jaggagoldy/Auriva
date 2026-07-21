"use client";

// M3B B2 — the shared Reception Checkout Workspace. One implementation used by
// both /clinic (solo) and /staff (reception) — parity by construction. POS-style
// one page: grouped charges (Clinical read-only · Administrative editable),
// Concession, money summary (Estimated → Concession → Net → Collected →
// Outstanding), split/partial payment, reception notes, and a Completion state
// with a Next Action menu. Money is always server-truth (refreshed after every
// mutation). Principle 6: reception never edits clinical lines.

import * as React from "react";
import {
  ArrowLeft, Banknote, Check, CheckCircle2, ChevronDown, FileText, Loader2,
  Lock, Plus, Sparkles, Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ClinicalArtifacts } from "@/components/shared/documents/clinical-artifacts";

// ---- view-model types (mirror checkout-service.getCheckout) -----------------
interface Line { id: string; description: string; category: string | null; qty: number; unit_price: number; amount: number; removable?: boolean }
interface CheckoutView {
  invoice: { id: string; invoice_number: string; status: string; appointment_id: string | null };
  visit: { patient_name: string; token: number | null; doctor_name: string | null; appointment_type: string; scheduled_time: string | null; status: string };
  groups: { clinical: Line[]; administrative: Line[] };
  concession: { amount: number; lineId: string | null };
  money: { estimated: number; concession: number; net: number; collected: number; outstanding: number };
  payments: { id: string; amount: number; method: string; reference: string | null; received_at: string }[];
  notes: string | null;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ---- data hook --------------------------------------------------------------
function useCheckout(invoiceId: string) {
  const [view, setView] = React.useState<CheckoutView | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/clinic/checkout?invoice_id=${invoiceId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CheckoutView | null) => setView(d))
      .catch(() => setView(null));
  }, [invoiceId]);

  const act = React.useCallback(async (body: Record<string, unknown>): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error((d as { message?: string }).message ?? "Something went wrong."); return false; }
      setView(d as CheckoutView);
      return true;
    } finally { setSaving(false); }
  }, [invoiceId]);

  return { view, saving, act };
}

const STATUS_STYLE: Record<string, string> = {
  Consulting: "bg-honey-soft text-honey-deep",
  "Ready for Checkout": "bg-primary/10 text-primary",
  "Partially Paid": "bg-warning/10 text-warning dark:text-warning",
  Completed: "bg-success/10 text-success",
};

// ---- workspace --------------------------------------------------------------
export function CheckoutWorkspace({ invoiceId, onClose, onDone }: { invoiceId: string; onClose: () => void; onDone?: () => void }) {
  const { view, saving, act } = useCheckout(invoiceId);
  const completed = view?.invoice.status === "paid"; // derived — the completion overlay shows once paid

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
        </button>
        <span className="font-heading text-sm font-semibold">Checkout</span>
        {view && (
          <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[view.visit.status] ?? "bg-muted text-muted-foreground")}>
            {view.visit.status}
          </span>
        )}
      </header>

      {!view ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading checkout…
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <VisitHeader visit={view.visit} />
          <div className="mx-auto grid max-w-6xl gap-5 p-4 md:grid-cols-[minmax(0,1fr)_320px] md:p-6">
            <div className="min-w-0 space-y-4">
              <ChargesPanel view={view} saving={saving} act={act} />
              <PaymentPanel key={view.money.outstanding} view={view} saving={saving} act={act} />
            </div>
            <SideRail view={view} saving={saving} act={act} />
          </div>
        </div>
      )}

      {completed && view && (
        <CheckoutCompletion view={view} onDone={() => { onDone?.(); onClose(); }} />
      )}
    </div>
  );
}

function VisitHeader({ visit }: { visit: CheckoutView["visit"] }) {
  const time = visit.scheduled_time ? new Date(visit.scheduled_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null;
  return (
    <div className="border-b bg-card px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-base font-semibold">{visit.patient_name}</span>
        {visit.token != null && <Pill>Token {visit.token}</Pill>}
        {visit.doctor_name && <Pill>{visit.doctor_name}</Pill>}
        <Pill>{visit.appointment_type}</Pill>
        {time && <span className="text-xs text-muted-foreground">{time}</span>}
      </div>
    </div>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{children}</span>;
}

type Act = (body: Record<string, unknown>) => Promise<boolean>;

function ChargesPanel({ view, saving, act }: { view: CheckoutView; saving: boolean; act: Act }) {
  const [addOpen, setAddOpen] = React.useState(false);
  return (
    <section className="rounded-2xl border bg-card p-4">
      {/* Clinical (read-only) */}
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-sm font-semibold">Clinical Services</h3>
        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Lock className="size-3" /> Read only
        </span>
      </div>
      <div className="divide-y rounded-xl border">
        {view.groups.clinical.map((l) => <ChargeRow key={l.id} l={l} />)}
        {view.groups.clinical.length === 0 && <Empty>No clinical services.</Empty>}
      </div>

      {/* Administrative (reception-editable) */}
      <div className="mb-1 mt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Administrative Charges</h3>
        <Button variant="outline" size="sm" disabled={saving} onClick={() => setAddOpen((o) => !o)}>
          <Plus className="size-3.5" /> Add charge
        </Button>
      </div>
      <div className="divide-y rounded-xl border">
        {view.groups.administrative.map((l) => (
          <ChargeRow key={l.id} l={l} onRemove={saving ? undefined : () => act({ action: "remove_charge", line_id: l.id })} />
        ))}
        {view.groups.administrative.length === 0 && <Empty>No administrative charges.</Empty>}
      </div>
      {addOpen && <AddChargeInline saving={saving} onAdd={async (b) => { const ok = await act({ action: "add_charge", ...b }); if (ok) setAddOpen(false); }} />}

      <MoneySummary view={view} saving={saving} act={act} />
    </section>
  );
}

function ChargeRow({ l, onRemove }: { l: Line; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{l.description}</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{l.category}{l.qty > 1 ? ` · ×${l.qty}` : ""}</div>
      </div>
      <div className="text-sm font-semibold tabular-nums">{inr(l.amount)}</div>
      {onRemove && (
        <button aria-label={`Remove ${l.description}`} onClick={onRemove} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-3 text-center text-xs text-muted-foreground">{children}</div>;
}

function AddChargeInline({ saving, onAdd }: { saving: boolean; onAdd: (b: Record<string, unknown>) => void }) {
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  function submit() {
    const p = Number(price);
    if (!name.trim()) return toast.info("Name the charge.");
    if (!Number.isFinite(p) || p < 0) return toast.info("Enter a valid price.");
    onAdd({ name: name.trim(), category: "Administrative", unit_price: Math.round(p) });
    setName(""); setPrice("");
  }
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Charge (e.g. Registration)" className="sm:flex-1"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} />
      <Input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="₹ price" className="sm:w-28"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} />
      <Button variant="outline" size="sm" disabled={saving} onClick={submit}><Plus className="size-3.5" /> Add</Button>
    </div>
  );
}

function MoneySummary({ view, saving, act }: { view: CheckoutView; saving: boolean; act: Act }) {
  const [concessionOpen, setConcessionOpen] = React.useState(false);
  const m = view.money;
  return (
    <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
      <Row label="Estimated Charges" value={inr(m.estimated)} />
      <div className="flex items-center justify-between">
        <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setConcessionOpen((o) => !o)} disabled={saving}>
          <Sparkles className="size-3.5" /> Concession
        </button>
        <span className={cn("tabular-nums", m.concession > 0 && "text-success")}>{m.concession > 0 ? `− ${inr(m.concession)}` : "—"}</span>
      </div>
      {concessionOpen && <ConcessionInline view={view} saving={saving} act={act} onClose={() => setConcessionOpen(false)} />}
      <Row label="Net Charges" value={inr(m.net)} strong />
      <Row label="Collected" value={inr(m.collected)} muted />
      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-sm font-semibold">Outstanding</span>
        <span className="font-heading text-xl font-bold text-honey-deep tabular-nums">{inr(m.outstanding)}</span>
      </div>
    </div>
  );
}
function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? "text-muted-foreground" : "text-foreground", strong && "font-semibold")}>{label}</span>
      <span className={cn("tabular-nums", strong && "font-semibold", muted && "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function ConcessionInline({ view, saving, act, onClose }: { view: CheckoutView; saving: boolean; act: Act; onClose: () => void }) {
  const [amount, setAmount] = React.useState(view.concession.amount ? String(view.concession.amount) : "");
  const [reason, setReason] = React.useState("");
  async function apply() {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return toast.info("Enter a concession amount.");
    if (!reason.trim()) return toast.info("Add a reason (e.g. Doctor approved).");
    const ok = await act({ action: "concession", amount: Math.round(a), reason: reason.trim() });
    if (ok) onClose();
  }
  return (
    <div className="my-2 flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 sm:flex-row sm:items-center">
      <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="₹ concession" className="sm:w-32" />
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. Doctor approved)" className="sm:flex-1"
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }} />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={saving} onClick={apply}>Apply</Button>
        {view.concession.amount > 0 && (
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => act({ action: "remove_concession" }).then((ok) => ok && onClose())}>Remove</Button>
        )}
      </div>
    </div>
  );
}

const METHODS = ["cash", "upi", "card"] as const;

function PaymentPanel({ view, saving, act }: { view: CheckoutView; saving: boolean; act: Act }) {
  const outstanding = view.money.outstanding;
  const [method, setMethod] = React.useState<(typeof METHODS)[number]>("cash");
  const [amount, setAmount] = React.useState(String(outstanding)); // re-inits via key on outstanding change

  if (view.invoice.status === "paid") return null;
  async function collect() {
    const a = Number(amount);
    if (!Number.isInteger(a) || a <= 0) return toast.info("Enter an amount.");
    if (a > outstanding) return toast.error(`Amount exceeds the ${inr(outstanding)} outstanding.`);
    await act({ action: "pay", amount: a, method });
  }
  const partial = Number(amount) > 0 && Number(amount) < outstanding;
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Collect payment</h3>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border">
          {METHODS.map((m) => (
            <button key={m} onClick={() => setMethod(m)}
              className={cn("px-4 py-2 text-sm font-medium capitalize", method === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}>{m}</button>
          ))}
        </div>
        <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-32"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); collect(); } }} />
        <Button disabled={saving} onClick={collect}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />} Collect {inr(Number(amount) || 0)}</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {partial ? `Split / partial: collecting ${inr(Number(amount))} of ${inr(outstanding)} — collect the rest with another method.` : "Records money received; Auriva doesn't process the payment."}
      </p>
    </section>
  );
}

function SideRail({ view, saving, act }: { view: CheckoutView; saving: boolean; act: Act }) {
  return (
    <aside className="space-y-4">
      <ReceptionNotes view={view} saving={saving} act={act} />
      <PaymentHistory payments={view.payments} />
      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-muted-foreground" /> Clinical Artifacts</div>
        {view.invoice.appointment_id ? <ClinicalArtifacts appointmentId={view.invoice.appointment_id} /> : <p className="text-xs text-muted-foreground">No visit linked.</p>}
      </section>
      <SlotStub icon={<Sparkles className="size-4" />} title="Recommendations" note="Treatment planning — future" />
    </aside>
  );
}

function ReceptionNotes({ view, saving, act }: { view: CheckoutView; saving: boolean; act: Act }) {
  const [text, setText] = React.useState(view.notes ?? "");
  const [dirty, setDirty] = React.useState(false);
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">Reception Notes</h3>
      <textarea
        value={text} onChange={(e) => { setText(e.target.value); setDirty(true); }}
        placeholder="Operational only — e.g. Concession approved by Dr Sharma; paid by spouse; receipt requested later."
        rows={3}
        className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      {dirty && (
        <div className="mt-2 flex justify-end">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => act({ action: "notes", notes: text }).then((ok) => ok && setDirty(false))}>Save note</Button>
        </div>
      )}
    </section>
  );
}

function PaymentHistory({ payments }: { payments: CheckoutView["payments"] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="rounded-2xl border bg-card p-4">
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <span className="text-sm font-semibold">Payment History</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {payments.length} · {inr(payments.reduce((n, p) => n + p.amount, 0))}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {payments.length === 0 && <p className="text-xs text-muted-foreground">No payments yet.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">{p.method}{p.reference ? ` · ${p.reference}` : ""}</span>
              <span className="tabular-nums">{inr(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SlotStub({ icon, title, note }: { icon: React.ReactNode; title: string; note: string }) {
  return (
    <section className="rounded-2xl border border-dashed bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">{icon} {title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </section>
  );
}

function CheckoutCompletion({ view, onDone }: { view: CheckoutView; onDone: () => void }) {
  const [nextOpen, setNextOpen] = React.useState(false);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="size-6 text-success" />
          <h2 className="font-heading text-lg font-bold">Visit Completed Successfully</h2>
        </div>
        <ul className="space-y-2 text-sm">
          <CheckItem>Clinical Consultation Complete</CheckItem>
          <CheckItem>Payment Recorded · {inr(view.money.collected)}</CheckItem>
          <CheckItem>Invoice Ready · {view.invoice.invoice_number}</CheckItem>
        </ul>
        {view.invoice.appointment_id && (
          <div className="mt-4 overflow-y-auto">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Clinical Artifacts</div>
            <ClinicalArtifacts appointmentId={view.invoice.appointment_id} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <div className="relative">
            <Button variant="outline" onClick={() => setNextOpen((o) => !o)}>Next Action <ChevronDown className="size-4" /></Button>
            {nextOpen && (
              <div className="absolute bottom-full left-0 mb-1 w-52 rounded-lg border bg-popover p-1 shadow-md">
                <NextActionItem enabled onClick={() => { toast.info("Follow-up booking opens from the visit."); setNextOpen(false); }}>Book Follow-up</NextActionItem>
                <NextActionItem>Book Procedure (soon)</NextActionItem>
                <NextActionItem>Package Booking (soon)</NextActionItem>
              </div>
            )}
          </div>
          <Button className="ml-auto" onClick={onDone}>Done</Button>
        </div>
      </div>
    </div>
  );
}
function CheckItem({ children }: { children: React.ReactNode }) {
  return <li className="flex items-center gap-2"><Check className="size-4 text-success" /> {children}</li>;
}
function NextActionItem({ children, enabled, onClick }: { children: React.ReactNode; enabled?: boolean; onClick?: () => void }) {
  return (
    <button disabled={!enabled} onClick={onClick}
      className={cn("flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm", enabled ? "hover:bg-muted" : "cursor-not-allowed text-muted-foreground")}>
      {children}
    </button>
  );
}
