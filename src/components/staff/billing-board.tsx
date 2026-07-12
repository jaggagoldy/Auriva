"use client";

// Billing module (APS-041): invoice list + payment collection. The list is
// the module's dashboard — a thin stat strip over the truthful table, per
// APS-015 §3 ("pulse, not portrait").

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { IndianRupee, Loader2, Plus, Printer, ReceiptText } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface InvoiceItemRow {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: "draft" | "issued" | "paid" | "void";
  total: number;
  created_at: string;
  items_json: string;
  patient: { id: string; full_name: string };
  payments: { id: string; amount: number; method: string }[];
}

function parseItems(itemsJson: string): InvoiceItemRow[] {
  try {
    const parsed = JSON.parse(itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const STATUS_META: Record<InvoiceRow["status"], { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  issued: { label: "Issued", className: "bg-info/10 text-info dark:text-info" },
  paid: { label: "Paid", className: "bg-success/10 text-success dark:text-success" },
  void: { label: "Void", className: "bg-destructive/10 text-destructive dark:text-destructive" },
};

const FILTERS = [
  { id: "today", label: "Today" },
  { id: "open", label: "Open" },
  { id: "paid", label: "Paid" },
  { id: "all", label: "All" },
] as const;

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function paidSoFar(invoice: InvoiceRow): number {
  return invoice.payments.reduce((sum, p) => sum + p.amount, 0);
}

export default function BillingBoard() {
  const [invoices, setInvoices] = React.useState<InvoiceRow[] | null>(null);
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["id"]>("today");
  const [payingInvoice, setPayingInvoice] = React.useState<InvoiceRow | null>(null);
  const [viewingInvoice, setViewingInvoice] = React.useState<InvoiceRow | null>(null);

  const load = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === "today") params.set("today", "true");
    if (filter === "paid") params.set("status", "paid");
    const res = await fetch(`/api/billing/invoices?${params}`, { cache: "no-store" });
    if (!res.ok) {
      toast.error("Could not load invoices");
      return;
    }
    let rows: InvoiceRow[] = await res.json();
    if (filter === "open") rows = rows.filter((r) => r.status === "draft" || r.status === "issued");
    setInvoices(rows);
  }, [filter]);

  React.useEffect(() => {
    setInvoices(null);
    load();
  }, [load]);

  const collectedToday = (invoices ?? [])
    .flatMap((i) => i.payments)
    .reduce((sum, p) => sum + p.amount, 0);
  const openBalance = (invoices ?? [])
    .filter((i) => i.status === "draft" || i.status === "issued")
    .reduce((sum, i) => sum + i.total - paidSoFar(i), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">
            Invoices draft automatically when a consultation completes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Invoices in view" value={invoices ? String(invoices.length) : "—"} />
        <StatCard label="Collected (in view)" value={invoices ? formatINR(collectedToday) : "—"} />
        <StatCard label="Open balance" value={invoices ? formatINR(openBalance) : "—"} />
        <StatCard
          label="Awaiting payment"
          value={
            invoices
              ? String(invoices.filter((i) => i.status === "draft" || i.status === "issued").length)
              : "—"
          }
        />
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map((f) => (
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
          {invoices === null ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <ReceiptText className="size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No invoices here yet</p>
              <p className="text-xs text-muted-foreground">
                Complete a consultation and its invoice drafts itself.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const balance = invoice.total - paidSoFar(invoice);
                  const meta = STATUS_META[invoice.status];
                  const payable = invoice.status === "draft" || invoice.status === "issued";
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <button
                          className="hover:text-primary hover:underline"
                          onClick={() => setViewingInvoice(invoice)}
                        >
                          {invoice.invoice_number}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/staff/patients/${invoice.patient.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {invoice.patient.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={meta.className}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {payable ? formatINR(balance) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {payable && (
                          <Button size="sm" onClick={() => setPayingInvoice(invoice)}>
                            <IndianRupee className="size-3.5" />
                            Collect
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PaymentDialog
        invoice={payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onRecorded={() => {
          setPayingInvoice(null);
          load();
        }}
      />

      <InvoiceDetailDialog
        invoice={viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        onChanged={(updated) => {
          setViewingInvoice(updated);
          load();
        }}
      />
    </div>
  );
}

function InvoiceDetailDialog({
  invoice,
  onClose,
  onChanged,
}: {
  invoice: InvoiceRow | null;
  onClose: () => void;
  onChanged: (updated: InvoiceRow) => void;
}) {
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [kind, setKind] = React.useState<"charge" | "discount">("charge");
  const [adding, setAdding] = React.useState(false);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const quickFill = (desc: string) => {
    setDescription(desc);
    amountInputRef.current?.focus();
  };

  React.useEffect(() => {
    setDescription("");
    setAmount("");
    setKind("charge");
  }, [invoice?.id]);

  if (!invoice) return null;
  const items = parseItems(invoice.items_json);
  const canEdit = invoice.status === "draft";

  const addItem = async () => {
    const desc = description.trim();
    const value = Number(amount);
    if (!desc || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a description and a positive amount.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_item",
          description: desc,
          qty: 1,
          unit_price: kind === "discount" ? -value : value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not add line item");
      toast.success(kind === "discount" ? "Discount applied" : "Charge added");
      setDescription("");
      setAmount("");
      onChanged(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add line item");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{invoice.invoice_number}</DialogTitle>
          <DialogDescription>{invoice.patient.full_name}</DialogDescription>
        </DialogHeader>

        <div className="divide-y rounded-lg border">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{item.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.qty} × {formatINR(item.unit_price)}
                </p>
              </div>
              <span className={cn("tabular-nums font-medium", item.amount < 0 && "text-success")}>
                {item.amount < 0 ? "− " : ""}
                {formatINR(Math.abs(item.amount))}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatINR(invoice.total)}</span>
          </div>
        </div>

        {canEdit && (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <div className="flex gap-1.5">
              <Button
                size="xs"
                variant={kind === "charge" ? "default" : "outline"}
                onClick={() => setKind("charge")}
              >
                Charge
              </Button>
              <Button
                size="xs"
                variant={kind === "discount" ? "default" : "outline"}
                onClick={() => setKind("discount")}
              >
                Discount
              </Button>
              <div className="ml-auto flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => quickFill("Lab charge")}>
                  + Lab
                </Button>
                <Button size="xs" variant="ghost" onClick={() => quickFill("Procedure charge")}>
                  + Procedure
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8"
              />
              <Input
                ref={amountInputRef}
                placeholder="₹"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                className="h-8 w-24"
              />
              <Button size="sm" disabled={adding} onClick={addItem}>
                {adding ? <Loader2 className="animate-spin" /> : <Plus />}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="!justify-between">
          <Button variant="outline" nativeButton={false} render={<a href={`/print/invoice/${invoice.id}`} target="_blank" rel="noreferrer" />}>
            <Printer />
            Print / Receipt
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function PaymentDialog({
  invoice,
  onClose,
  onRecorded,
}: {
  invoice: InvoiceRow | null;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const balance = invoice ? invoice.total - paidSoFar(invoice) : 0;
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("upi");
  const [reference, setReference] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (invoice) {
      setAmount(String(balance));
      setMethod("upi");
      setReference("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

  const submit = async () => {
    if (!invoice) return;
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error("Enter a whole-rupee amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value, method, reference: reference || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Payment failed");
      toast.success(
        data.status === "paid"
          ? `${invoice.invoice_number} fully paid`
          : `Payment recorded — ${formatINR(invoice.total - paidSoFar(invoice) - value)} remaining`
      );
      onRecorded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Collect payment</DialogTitle>
          <DialogDescription>
            {invoice?.invoice_number} · {invoice?.patient.full_name} · balance{" "}
            {formatINR(balance)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount">Amount (INR)</Label>
            <Input
              id="pay-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(value) => value && setMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method !== "cash" && (
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference (optional)</Label>
              <Input
                id="pay-ref"
                placeholder="UPI ref / card slip"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Recording…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
