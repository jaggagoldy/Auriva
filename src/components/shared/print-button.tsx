"use client";

import { Printer } from "lucide-react";

// Browser-native printing — no PDF library dependency. `print:hidden` keeps
// the trigger itself off the printed page.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden mb-6 flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted"
    >
      <Printer className="size-3.5" />
      Print
    </button>
  );
}
