"use client";

// BRD-043 Sprint 4 (US-401/402/404/405) — the Team roster: member cards +
// growth indicator + the membership lifecycle actions (suspend / reactivate /
// archive). The reconciliation-gated archive dialog is the centrepiece:
// archiving a doctor with future appointments / an active consultation is
// BLOCKED until every conflict is reassigned to another active doctor — the
// Archive button stays disabled until all rows are resolved, and the server
// re-rejects any bypass. Faithful to the approved prototype (Team + archive/
// reconcile modals). Sprint 4 owns these mutations; the endpoints are
// idempotent and archive is atomic.

import * as React from "react";
import { Loader2, MoreVertical, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Member {
  staff_id: string;
  name: string;
  role: string;
  is_owner: boolean;
  is_doctor: boolean;
  status: "active" | "suspended" | "archived";
}
interface Team {
  plan_label: string;
  seats_used: number;
  seats_max: number | null;
  members: Member[];
}
interface Conflict {
  appointment_id: string;
  patient_name: string;
  scheduled_time: string;
  status: string;
  kind: "appointment" | "consultation";
}
interface Target {
  id: string;
  full_name: string;
}

function initials(name: string) {
  const parts = name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
const pillClass = (s: Member["status"]) =>
  s === "active"
    ? "bg-primary/10 text-primary"
    : s === "suspended"
      ? "bg-rose-500/10 text-rose-600"
      : "bg-muted text-muted-foreground";

export function TeamRoster({ onInvite, onUpgrade }: { onInvite: () => void; onUpgrade: () => void }) {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Member | null>(null);
  const [conflicts, setConflicts] = React.useState<Conflict[] | null>(null);
  const [targets, setTargets] = React.useState<Target[]>([]);
  const [assign, setAssign] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    fetch("/api/clinic/team", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTeam(d))
      .catch(() => setTeam(null));
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function setStatus(m: Member, membership_status: "active" | "suspended") {
    setMenuFor(null);
    try {
      const res = await fetch(`/api/clinic/team/${m.staff_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membership_status }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Could not update member");
      toast.success(membership_status === "suspended" ? `Suspended ${m.name}` : `Reactivated ${m.name}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update member");
    }
  }

  async function startArchive(m: Member) {
    setMenuFor(null);
    setArchiveTarget(m);
    setConflicts(null);
    setAssign({});
    const res = await fetch(`/api/clinic/team/${m.staff_id}/archive`, { cache: "no-store" });
    const data = res.ok ? await res.json() : { conflicts: [], targets: [] };
    setConflicts(data.conflicts);
    setTargets(data.targets);
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/clinic/team/${archiveTarget.staff_id}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reassignments: assign }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Could not archive member");
      toast.success(`Archived ${archiveTarget.name}`);
      setArchiveTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not archive member");
    } finally {
      setBusy(false);
    }
  }

  const allReassigned = React.useMemo(
    () => (conflicts ?? []).every((c) => assign[c.appointment_id]),
    [conflicts, assign]
  );

  if (!team) {
    return <Card className="p-5"><div className="h-24 animate-pulse rounded bg-muted" /></Card>;
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Your team</h2>
          <p className="text-xs text-muted-foreground">Manage who works at your clinic.</p>
        </div>
        <Button size="sm" onClick={onInvite}><UserPlus className="size-4" /> Invite member</Button>
      </div>

      {/* Growth indicator (US-401) — live seat counts */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border p-3.5">
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground">Current plan</div>
          <div className="font-display text-base font-extrabold">{team.plan_label}</div>
        </div>
        <div className="border-l pl-4">
          <div className="text-[11px] font-semibold text-muted-foreground">Seats used</div>
          <div className="font-display text-base font-extrabold tabular-nums">
            {team.seats_used}{team.seats_max != null ? ` / ${team.seats_max}` : ""}
          </div>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={onUpgrade}>
          Upgrade to Professional
          <span className="hidden font-normal text-muted-foreground sm:inline">· 5 doctors, 15 members</span>
        </Button>
      </div>

      {/* Member cards (US-401) */}
      {team.members.length <= 1 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Users className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">It&apos;s just you right now</p>
          <p className="text-xs text-muted-foreground">Invite a doctor or receptionist — your plan includes room for both.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {team.members.map((m) => (
            <div key={m.staff_id} className="rounded-xl border p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold uppercase">{initials(m.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.role}{m.is_owner ? " · you" : ""}</div>
                </div>
                {/* The Owner's row has no lifecycle menu (frozen BR). */}
                {!m.is_owner && m.status !== "archived" && (
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuFor(menuFor === m.staff_id ? null : m.staff_id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                      aria-label="Member actions"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {menuFor === m.staff_id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                        <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border bg-background shadow-md">
                          {m.status === "active" ? (
                            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setStatus(m, "suspended")}>Suspend</button>
                          ) : (
                            <button className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setStatus(m, "active")}>Reactivate</button>
                          )}
                          <button className="block w-full border-t px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-500/5" onClick={() => startArchive(m)}>Archive</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", pillClass(m.status))}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive dialog — simple (US-405) or reconciliation-gated (US-404) */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => !busy && setArchiveTarget(null)}>
          <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            {conflicts === null ? (
              <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : conflicts.length === 0 ? (
              // US-405 — simple immediate archive
              <>
                <h3 className="font-semibold">Archive {archiveTarget.name}?</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Their historical records stay intact permanently — this can&apos;t remove past visits or notes.
                  This member has no future appointments, so nothing needs reassigning.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setArchiveTarget(null)} disabled={busy}>Cancel</Button>
                  <Button variant="destructive" onClick={confirmArchive} disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Archive
                  </Button>
                </div>
              </>
            ) : (
              // US-404 — reconciliation-gated archive
              <>
                <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700">
                  <b>{archiveTarget.name} cannot be archived yet</b> — {conflicts.length} upcoming item(s) must be
                  reassigned first. Auto-cancelling or leaving them on an archived doctor is not allowed.
                </div>
                <div className="mt-3 space-y-2">
                  {conflicts.map((c) => (
                    <div key={c.appointment_id} className="flex items-center gap-3 rounded-lg border p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.patient_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.kind === "consultation" ? "Active consultation · in progress" : `Appointment · ${new Date(c.scheduled_time).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`}
                        </div>
                      </div>
                      <select
                        className="shrink-0 rounded-md border bg-background px-2 py-1.5 text-sm"
                        value={assign[c.appointment_id] ?? ""}
                        onChange={(e) => setAssign((a) => ({ ...a, [c.appointment_id]: e.target.value }))}
                      >
                        <option value="">Reassign to…</option>
                        {targets.map((t) => (
                          <option key={t.id} value={t.id}>{t.full_name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {targets.length === 0 && (
                  <p className="mt-2 text-xs text-rose-600">No other active doctor is available to take these on. Add or reactivate a doctor first.</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setArchiveTarget(null)} disabled={busy}>Cancel</Button>
                  <Button variant="destructive" onClick={confirmArchive} disabled={busy || !allReassigned || targets.length === 0}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null} Reassign all &amp; archive
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
