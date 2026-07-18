"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// UXS-043 Package 1 — the Mandatory Password Change screen. A provisioned member
// signs in with the temporary password their practice gave them and sets their
// own here; on success they go back through the workspace resolver (/workspace),
// which opens the correct surface.
export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/workspace");
        return;
      }
      setError(data.message ?? "Couldn't set your password. Please try again.");
    } catch {
      setError("Couldn't set your password. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <h1 className="font-heading text-xl font-bold text-foreground">Set your password</h1>

        <div className="mt-4 flex gap-3 rounded-xl border border-accent-foreground/15 bg-accent p-3 text-[12.5px] leading-relaxed text-accent-foreground">
          <span>
            Your practice created this account. Set your own password to continue &mdash; this replaces the
            temporary one you were given.
          </span>
        </div>

        <label className="mt-5 block text-[12.5px] font-semibold text-foreground" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />

        <label className="mt-3 block text-[12.5px] font-semibold text-foreground" htmlFor="confirm-password">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />

        {error && <p className="mt-3 text-[12.5px] font-medium text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-105 disabled:opacity-60"
        >
          {busy ? "Setting password…" : "Set password & continue"}
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          This step blocks every workspace until it&apos;s done &mdash; by design.
        </p>
      </form>
    </div>
  );
}
