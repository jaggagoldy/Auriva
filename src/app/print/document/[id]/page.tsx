"use client";

// M3B B3 — the bare, print-ready Document page (reuses the /print route tree +
// layout). Renders a Document's immutable snapshot via the shared renderer, so
// the printed artifact is identical to the on-screen viewer. Fetches through the
// clinic-scoped API. Browser Print / Save-as-PDF (D-B3-5).

import * as React from "react";
import { useParams } from "next/navigation";
import { DocumentRenderer, type DocumentDetail } from "@/components/shared/documents/document-renderer";

export default function PrintDocumentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [doc, setDoc] = React.useState<DocumentDetail | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!id) return;
    fetch(`/api/clinic/documents?id=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: DocumentDetail) => setDoc(d))
      .catch(() => setError(true));
  }, [id]);

  if (error) return <p className="text-sm text-neutral-500">Document not found.</p>;
  if (!doc) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div>
      <div className="mb-4 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-neutral-100">
          Print / Save as PDF
        </button>
      </div>
      <DocumentRenderer doc={doc} />
    </div>
  );
}
