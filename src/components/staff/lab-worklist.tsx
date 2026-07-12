"use client";

// Diagnostics-lite (APS-042): the org worklist — pending orders in, results
// entered at the desk, loop closed back to the doctor and patient timeline.

import * as React from "react";
import { toast } from "sonner";
import { FlaskConical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LabOrderRow {
  id: string;
  status: "ordered" | "resulted" | "cancelled";
  tests_json: string;
  clinical_note: string | null;
  ordered_at: string;
  resulted_at: string | null;
  result_values_json: string | null;
  result_notes: string | null;
  patient: { id: string; full_name: string };
  doctor: { id: string; full_name: string; specialty: string | null };
}

interface ResultValue {
  test: string;
  value: string;
  unit?: string;
  reference?: string;
}

const STATUS_META: Record<LabOrderRow["status"], { label: string; className: string }> = {
  ordered: { label: "Ordered", className: "bg-warning/10 text-warning dark:text-warning" },
  resulted: { label: "Resulted", className: "bg-success/10 text-success dark:text-success" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

function testsOf(order: LabOrderRow): { name: string }[] {
  try {
    return JSON.parse(order.tests_json);
  } catch {
    return [];
  }
}

export default function LabWorklist() {
  const [orders, setOrders] = React.useState<LabOrderRow[] | null>(null);
  const [filter, setFilter] = React.useState<"ordered" | "resulted" | "all">("ordered");
  const [resulting, setResulting] = React.useState<LabOrderRow | null>(null);

  const load = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/lab-orders?${params}`, { cache: "no-store" });
    if (!res.ok) {
      toast.error("Could not load lab orders");
      return;
    }
    setOrders(await res.json());
  }, [filter]);

  React.useEffect(() => {
    setOrders(null);
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Lab Orders</h1>
        <p className="text-sm text-muted-foreground">
          Orders placed by doctors land here; entering the result closes the loop.
        </p>
      </div>

      <div className="flex gap-1.5">
        {(
          [
            { id: "ordered", label: "Pending" },
            { id: "resulted", label: "Resulted" },
            { id: "all", label: "All" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {orders === null ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <FlaskConical className="size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">
                {filter === "ordered" ? "All caught up — no pending orders" : "Nothing here yet"}
              </p>
              <p className="text-xs text-muted-foreground">
                Doctors order tests from the consult workbench.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Ordered by</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.patient.full_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {testsOf(order).map((t) => (
                          <Badge key={t.name} variant="outline">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                      {order.clinical_note && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {order.clinical_note}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.doctor.full_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_META[order.status].className}>
                        {STATUS_META[order.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === "ordered" && (
                        <Button size="sm" onClick={() => setResulting(order)}>
                          Enter result
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ResultDialog
        order={resulting}
        onClose={() => setResulting(null)}
        onSaved={() => {
          setResulting(null);
          load();
        }}
      />
    </div>
  );
}

function ResultDialog({
  order,
  onClose,
  onSaved,
}: {
  order: LabOrderRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = React.useState<ResultValue[]>([]);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (order) {
      setValues(testsOf(order).map((t) => ({ test: t.name, value: "", unit: "", reference: "" })));
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  const setValue = (index: number, patch: Partial<ResultValue>) => {
    setValues((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const submit = async () => {
    if (!order) return;
    const filled = values.filter((v) => v.value.trim());
    if (!filled.length && !notes.trim()) {
      toast.error("Enter at least one value or a note");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/lab-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result_values: filled, result_notes: notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not save result");
      toast.success(`Result filed for ${order.patient.full_name}`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save result");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Enter result</DialogTitle>
          <DialogDescription>
            {order?.patient.full_name} · ordered by {order?.doctor.full_name}. Results are
            final once filed — corrections need a new order.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {values.map((v, i) => (
            <div key={v.test} className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-semibold">{v.test}</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input value={v.value} onChange={(e) => setValue(i, { value: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input value={v.unit} onChange={(e) => setValue(i, { unit: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reference</Label>
                  <Input
                    value={v.reference}
                    onChange={(e) => setValue(i, { reference: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="result-notes">Notes</Label>
            <Textarea
              id="result-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interpretation, remarks…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Filing…" : "File result"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
