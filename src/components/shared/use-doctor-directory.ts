"use client";

// Milestone 2 · 3.1 client hooks shared by the patient discovery page (3.2) and
// the reception doctor picker (3.3). Keeps clock reads + the next-slots fetch in
// one place so both surfaces behave identically.

import * as React from "react";

function computeTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const subscribeNoop = () => () => {};

/** Today's local YYYY-MM-DD. SSR-safe via useSyncExternalStore (server snapshot
 *  is "", client reads the clock) — no set-state-in-effect. The snapshot string
 *  is stable within a day, so it never loops. */
export function useTodayKey(): string {
  return React.useSyncExternalStore(subscribeNoop, computeTodayKey, () => "");
}

/** Batch next-available-slot lookup for a set of doctor ids (reuses
 *  GET /api/doctors/next-slots). Returns { [doctorId]: ISO | null }. */
export function useNextSlots(doctorIds: string[]): Record<string, string | null> {
  const [slots, setSlots] = React.useState<Record<string, string | null>>({});
  const idsKey = doctorIds.slice().sort().join(",");

  React.useEffect(() => {
    if (!idsKey) return; // nothing to look up; keep prior map (harmless if unused)
    let cancelled = false;
    fetch(`/api/doctors/next-slots?ids=${encodeURIComponent(idsKey)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        if (!cancelled) setSlots(data ?? {});
      })
      .catch(() => {
        if (!cancelled) setSlots({});
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return slots;
}
