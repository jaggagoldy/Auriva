"use client";

// Superseded by the shared command palette (Milestone 1 · 2.1). Kept as a thin
// admin-configured re-export so any stale import keeps working; the real
// implementation (tenant-scoped search, per-surface config) lives in
// @/components/shared/command-palette.
import SharedCommandPalette from "@/components/shared/command-palette";

export default function CommandPalette() {
  return <SharedCommandPalette surface="admin" />;
}
