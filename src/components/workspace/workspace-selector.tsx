"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// APS-045 §7 / UXS-043 Package 1 — the Workspace Selector. Shown only when a
// person holds more than one active membership. It chooses WHICH workspace; the
// SCREEN comes from resolveSurface (returned by /api/workspace/switch). Switching
// is session-preserving — no re-authentication.

interface Workspace {
  membershipId: string;
  clinicName: string;
  role: string;
  specialty: string | null;
}

const ROLE_LABEL: Record<string, string> = { doctor: "Doctor", receptionist: "Reception" };

export function WorkspaceSelector({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(membershipId: string) {
    setBusy(membershipId);
    setError(null);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_id: membershipId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.surfacePath) {
        router.push(data.surfacePath);
        return;
      }
      setError(data.message ?? "That workspace isn't available right now.");
    } catch {
      setError("Couldn't switch workspace. Please try again.");
    }
    setBusy(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Choose your workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re a member of more than one clinic. Pick where you&apos;re working now.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {workspaces.map((w) => (
            <button
              key={w.membershipId}
              onClick={() => pick(w.membershipId)}
              disabled={busy !== null}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary font-heading text-sm font-bold text-primary-foreground">
                {w.clinicName.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-[15px] font-bold text-foreground">{w.clinicName}</span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABEL[w.role] ?? w.role}
                  {w.specialty ? ` · ${w.specialty}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-muted-foreground group-hover:text-primary">
                {busy === w.membershipId ? "Opening…" : "Open →"}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Solo &amp; single-clinic staff never see this &mdash; they open straight into their workspace.
        </p>
      </div>
    </div>
  );
}
