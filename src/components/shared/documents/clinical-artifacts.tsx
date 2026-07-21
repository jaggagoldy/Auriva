"use client";

// M3B B3 — the visit's Clinical Artifacts: the document set grouped by category,
// each opening the Document Viewer (immutable snapshot + Print / Download PDF).
// Used on the checkout Completion and (later) the patient timeline. User-facing
// term is "Clinical Artifacts"; internally these are Documents/DocumentSet.

import * as React from "react";
import { FileText, Loader2, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentRenderer, type DocumentDetail } from "@/components/shared/documents/document-renderer";

interface ArtifactRow { id: string; type: string; category: string; number: string; version: number; generated_at: string }

const TYPE_LABEL: Record<string, string> = { invoice: "Invoice", receipt: "Receipt", visit_summary: "Visit Summary" };
const CATEGORY_ORDER = ["Clinical", "Financial", "Diagnostic", "Administrative"];

export function ClinicalArtifacts({ appointmentId }: { appointmentId: string }) {
  const [rows, setRows] = React.useState<ArtifactRow[] | null>(null);
  const [viewId, setViewId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/clinic/documents?appointment_id=${appointmentId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: ArtifactRow[]) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [appointmentId]);

  if (rows === null) {
    return <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Preparing documents…</div>;
  }
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No documents yet.</p>;

  const byCategory = CATEGORY_ORDER.map((cat) => ({ cat, items: rows.filter((r) => r.category === cat) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      {byCategory.map((g) => (
        <div key={g.cat}>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.cat}</div>
          <div className="divide-y rounded-xl border">
            {g.items.map((a) => (
              <button key={a.id} onClick={() => setViewId(a.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50">
                <FileText className="size-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{TYPE_LABEL[a.type] ?? a.type}</span>
                <span className="text-xs text-muted-foreground">{a.number}{a.version > 1 ? ` · v${a.version}` : ""}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {viewId && <DocumentViewer id={viewId} onClose={() => setViewId(null)} />}
    </div>
  );
}

export function DocumentViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const [doc, setDoc] = React.useState<DocumentDetail | null>(null);
  React.useEffect(() => {
    fetch(`/api/clinic/documents?id=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: DocumentDetail | null) => setDoc(d))
      .catch(() => setDoc(null));
  }, [id]);

  const print = () => window.open(`/print/document/${id}`, "_blank");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Document</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={print}><Printer className="size-4" /> Print</Button>
            <Button variant="outline" size="sm" onClick={print}>Download PDF</Button>
            <button aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
          </div>
        </div>
        <div className="overflow-y-auto p-6">
          {!doc ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <DocumentRenderer doc={doc} />
            </div>
          )}
        </div>
        {/* Share → Communication Platform (reserved) */}
        <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">Share via WhatsApp / Email — coming with the Communication Platform.</div>
      </div>
    </div>
  );
}
