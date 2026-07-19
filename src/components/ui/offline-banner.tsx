"use client";

// Batch E — the shared offline indicator. A single, quiet banner that every
// surface can mount once (in its shell) so "you're offline" reads the same
// everywhere instead of each page inventing its own handling. Purely a
// connectivity hint driven by the browser's online/offline events; it never
// blocks the UI.

import * as React from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner({ className }: { className?: string }) {
  // Start online to avoid a flash before hydration; correct on mount.
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-700",
        className
      )}
    >
      <WifiOff className="size-3.5" />
      {/* PKG-6 §4 offline copy */}
      You&apos;re offline. We&apos;ll sync automatically when you&apos;re back online.
    </div>
  );
}
