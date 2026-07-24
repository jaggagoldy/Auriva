"use client";

// M3B B1 / B1b — the shared Doctor Service Capture UI. One implementation used
// by BOTH consultation surfaces (/clinic consultation-workbench and /doctor
// consult-workbench), so they are identical by construction — no drift between
// the two doctor experiences. Self-contained: given an appointmentId it opens
// capture (seeding the base Consultation line server-side), loads the clinic
// catalog, and drives add/qty/remove. Money stays advisory here — reception
// collects (see the surrounding surface).

import * as React from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CapturedService {
  id: string;
  name: string;
  category: string;
  kind: string;
  unit_price: number;
  qty: number;
  amount: number;
  status: string;
  needs_catalog_review: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  kind?: string;
}

// Clinical categories a doctor can add during a visit. Consultation is seeded
// automatically; these stack on top.
export const CAPTURE_CATEGORIES = ["Procedure", "Injection", "Lab", "Therapy", "Consumable"] as const;
export type CaptureCategory = (typeof CAPTURE_CATEGORIES)[number];

export interface ServiceCapture {
  events: CapturedService[] | null;
  catalog: CatalogItem[];
  saving: boolean;
  total: number;
  pickerCategory: CaptureCategory | null;
  setPickerCategory: (c: CaptureCategory | null) => void;
  addCatalogService: (serviceId: string) => void;
  addCustomService: (category: CaptureCategory, name: string, price: number) => void;
  setServiceQty: (id: string, qty: number) => void;
  removeService: (id: string) => void;
}

/** Capture state + actions for a visit. Opens capture (seeds the base
 *  Consultation line) and loads the catalog on mount; every mutation re-renders
 *  from the server's returned list (no optimistic drift on money). */
export function useServiceCapture(appointmentId: string): ServiceCapture {
  const [events, setEvents] = React.useState<CapturedService[] | null>(null);
  const [catalog, setCatalog] = React.useState<CatalogItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [pickerCategory, setPickerCategory] = React.useState<CaptureCategory | null>(null);

  React.useEffect(() => {
    fetch("/api/services", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: CatalogItem[]) => setCatalog(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    fetch("/api/clinic/service-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", appointment_id: appointmentId }),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: CapturedService[]) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]));
  }, [appointmentId]);

  const total = (events ?? []).reduce((sum, s) => sum + s.amount, 0);

  const run = React.useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/service-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((d as { message?: string }).message ?? "Couldn't update services.");
        return;
      }
      setEvents(d as CapturedService[]);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    events,
    catalog,
    saving,
    total,
    pickerCategory,
    setPickerCategory,
    addCatalogService: (serviceId) => {
      setPickerCategory(null);
      void run({ action: "add", appointment_id: appointmentId, service_id: serviceId });
    },
    addCustomService: (category, name, price) => {
      setPickerCategory(null);
      void run({ action: "add", appointment_id: appointmentId, name, category, unit_price: price });
    },
    setServiceQty: (id, qty) => {
      if (qty < 1) return;
      void run({ action: "set_qty", id, qty });
    },
    removeService: (id) => void run({ action: "remove", id }),
  };
}

/** The capture body — charges list, inline category picker, running total.
 *  Inline (never a modal). Rendered inside each surface's own section chrome. */
export function ServicesCaptureView({ capture }: { capture: ServiceCapture }) {
  const { events, catalog, saving, total, pickerCategory, setPickerCategory } = capture;

  if (events === null) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading services…
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 py-6 text-center text-sm text-muted-foreground">
          No services added yet.
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {events.map((s) => (
            <ServiceRow key={s.id} s={s} saving={saving} onSetQty={capture.setServiceQty} onRemove={capture.removeService} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CAPTURE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            disabled={saving}
            onClick={() => setPickerCategory(pickerCategory === c ? null : c)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
              pickerCategory === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            <Plus className="size-3.5" /> {c}
          </button>
        ))}
      </div>

      {pickerCategory && (
        <CategoryPicker
          category={pickerCategory}
          catalog={catalog}
          saving={saving}
          onAddCatalog={capture.addCatalogService}
          onAddCustom={capture.addCustomService}
          onClose={() => setPickerCategory(null)}
        />
      )}

      <div className="flex items-baseline justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">To collect</span>
        <span className="font-heading text-xl font-bold text-honey-deep">
          {total > 0 ? `₹${total.toLocaleString("en-IN")}` : "—"}
        </span>
      </div>
    </div>
  );
}

function ServiceRow({
  s,
  saving,
  onSetQty,
  onRemove,
}: {
  s: CapturedService;
  saving: boolean;
  onSetQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{s.name}</span>
          {s.needs_catalog_review && (
            <span
              title="Ad-hoc service — flagged for catalog review"
              className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            >
              Custom
            </span>
          )}
        </div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {s.category} · ₹{s.unit_price.toLocaleString("en-IN")}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${s.name} quantity`}
          disabled={saving || s.qty <= 1}
          onClick={() => onSetQty(s.id, s.qty - 1)}
          className="grid size-7 place-items-center rounded-md border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-semibold tabular-nums">{s.qty}</span>
        <button
          type="button"
          aria-label={`Increase ${s.name} quantity`}
          disabled={saving}
          onClick={() => onSetQty(s.id, s.qty + 1)}
          className="grid size-7 place-items-center rounded-md border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="w-20 text-right text-sm font-semibold tabular-nums">₹{s.amount.toLocaleString("en-IN")}</div>
      <button
        type="button"
        aria-label={`Remove ${s.name}`}
        disabled={saving}
        onClick={() => onRemove(s.id)}
        className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

function CategoryPicker({
  category,
  catalog,
  saving,
  onAddCatalog,
  onAddCustom,
  onClose,
}: {
  category: CaptureCategory;
  catalog: CatalogItem[];
  saving: boolean;
  onAddCatalog: (serviceId: string) => void;
  onAddCustom: (category: CaptureCategory, name: string, price: number) => void;
  onClose: () => void;
}) {
  const [customName, setCustomName] = React.useState("");
  const [customPrice, setCustomPrice] = React.useState("");
  const options = catalog.filter(
    (s) => (s.kind ?? "clinical") === "clinical" && (s.category ?? "").toLowerCase() === category.toLowerCase()
  );

  function submitCustom() {
    const price = Number(customPrice);
    if (!customName.trim()) {
      toast.info("Name the service first.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.info("Enter a valid price.");
      return;
    }
    onAddCustom(category, customName.trim(), Math.round(price));
    setCustomName("");
    setCustomPrice("");
  }

  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Add {category}</span>
        <button type="button" aria-label="Close picker" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      {options.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {options.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={saving}
              onClick={() => onAddCatalog(s.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
            >
              {s.name} · ₹{s.price.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={`Custom ${category.toLowerCase()} name`}
          className="sm:flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
        />
        <Input
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="₹ price"
          className="sm:w-28"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitCustom();
            }
          }}
        />
        <Button variant="outline" size="sm" disabled={saving} onClick={submitCustom}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}
