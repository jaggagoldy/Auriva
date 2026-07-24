"use client";

// Organization Command Center (APS-045 / APS-024): the owner's home — live
// operational awareness, not historical reports. Every number links to the
// view that proves it (APS-017 §3). Polls every 10s so tiles move on their
// own during a demo.

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  ListChecks,
  ReceiptText,
  Settings,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDay } from "@/shared/queue";
import { AdminSidebar } from "@/components/admin/admin-nav";

interface Tiles {
  active_patients: number;
  in_queue_now: number;
  doctors_on_floor: number;
  doctors_total: number;
  avg_wait_minutes: number | null;
  appointments_today: number;
  collected_today: number;
  outstanding_total: number;
  critical_alerts: number;
  pending_tasks: number;
  pending_unpaid_invoices: number;
  pending_lab_results: number;
}

interface Snapshot {
  tiles: Tiles;
  doctors: {
    id: string;
    full_name: string;
    specialty: string | null;
    waiting: number;
    in_consultation: number;
    total_today: number;
  }[];
  // Sprint 3: present on the org-wide rollup (one row per clinic, even for
  // a single-clinic organization) — see getOrganizationCommandCenterSnapshot.
  branches: {
    id: string;
    name: string;
    address: string;
    tiles: Tiles;
  }[];
  recent_activity: {
    id: string;
    type: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    patient_name: string;
    created_at: string;
    clinic_name?: string;
  }[];
}

const POLL_MS = 10000;

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function activityLabel(a: Snapshot["recent_activity"][number]): string {
  if (a.type === "created") return `Appointment booked`;
  if (a.type === "walk_in_registered") return `Walk-in registered`;
  if (a.type === "status_changed") return `${a.from_status} → ${a.to_status}`;
  return a.type.replace(/_/g, " ");
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  return `${h}h ago`;
}

export default function CommandCenter() {
  const [org, setOrg] = React.useState<{ id: string; name: string } | null>(null);
  const [snapshot, setSnapshot] = React.useState<Snapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Resolve the owner's organization once. Every clinic in this list shares
  // the same organization_id, so the first one is enough to derive it —
  // deliberately not clinic.id, which only ever pointed at the org's real id
  // by coincidence for a single-clinic organization (see command-center-service.ts).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clinics", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const clinics = await res.json();
        if (cancelled) return;
        if (!clinics.length) {
          setError("No organization is linked to this account.");
          return;
        }
        setOrg({ id: clinics[0].organization_id, name: clinics[0].name });
      } catch {
        if (!cancelled) setError("Could not load your organization.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll the org-wide snapshot.
  React.useEffect(() => {
    if (!org) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch(`/api/organizations/${org.id}/command-center`, {
          cache: "no-store",
        });
        if (res.ok && !cancelled) setSnapshot(await res.json());
      } catch {
        /* keep last snapshot on a transient error */
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [org]);

  const t = snapshot?.tiles;

  // PKG-2 "Needs your attention" (Rule #3): existing operational signals shown
  // together — no rule engine, no prediction. Every item is already-queried data.
  const attention = t
    ? ([
        t.pending_unpaid_invoices > 0 && {
          label: `${t.pending_unpaid_invoices} invoice${t.pending_unpaid_invoices > 1 ? "s" : ""} awaiting payment`,
          sub: `${inr(t.outstanding_total)} outstanding at the front desk`,
          href: "/staff/billing",
          action: "Review",
        },
        t.pending_lab_results > 0 && {
          label: `${t.pending_lab_results} lab result${t.pending_lab_results > 1 ? "s" : ""} pending upload`,
          sub: "Patients waiting on their reports",
          href: "/staff/lab",
          action: "Review",
        },
        t.in_queue_now > 0 && {
          label: `${t.in_queue_now} patient${t.in_queue_now > 1 ? "s" : ""} waiting now`,
          sub: "In the queue to be seen",
          href: "/staff/queue",
          action: "Open queue",
        },
      ].filter(Boolean) as { label: string; sub: string; href: string; action: string }[])
    : [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar active="command-center" subtitle={org?.name ?? "Command Center"} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">Command Center</h1>
            <p className="text-[11px] text-muted-foreground">
              Live operational awareness — updates every 10s
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>{formatDay(new Date())}</span>
            <span className="ml-2 flex items-center gap-1 text-[11px]">
              <span className="size-1.5 animate-pulse rounded-full bg-success" />
              Live
            </span>
          </div>
        </header>

        {error ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <main className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {/* PKG-2: Practice Health summary — calm status, structured metrics */}
            <section className="rounded-xl border bg-card p-5">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  attention.length === 0
                    ? "bg-success/10 text-success"
                    : "bg-amber-500/10 text-amber-600"
                )}
              >
                <span className={cn("size-1.5 rounded-full", attention.length === 0 ? "bg-success" : "bg-amber-500")} />
                {attention.length === 0 ? "Running smoothly" : "Needs a look"}
              </span>
              <h2 className="mt-2 font-display text-lg font-bold tracking-tight">
                {greeting}{org?.name ? `, ${org.name}` : ""}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <HealthMetric label="Appointments today" value={t?.appointments_today} />
                <HealthMetric label="Patients waiting" value={t?.in_queue_now} />
                <HealthMetric label="Collected today" value={t ? inr(t.collected_today) : undefined} />
                <HealthMetric
                  label="Team available"
                  value={t ? `${t.doctors_on_floor}/${t.doctors_total}` : undefined}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {attention.length === 0
                  ? "Nothing needs your attention right now."
                  : `${attention.length} item${attention.length > 1 ? "s" : ""} need${attention.length > 1 ? "" : "s"} your attention today.`}
              </p>
            </section>

            {/* PKG-2: Needs your attention — FIRST + prominent (existing signals) */}
            {attention.length > 0 && (
              <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.03]">
                <header className="flex items-center gap-2 border-b border-amber-500/20 px-5 py-3">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <h2 className="text-sm font-semibold">Needs your attention</h2>
                  <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {attention.length}
                  </span>
                </header>
                <div className="divide-y divide-amber-500/10">
                  {attention.map((a) => (
                    <div key={a.label} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{a.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.sub}</div>
                      </div>
                      <Link
                        href={a.href}
                        className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary"
                      >
                        {a.action}
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* PKG-2: Quick actions */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <QuickAction icon={UserPlus} label="Invite team member" href="/admin" />
                <QuickAction icon={Stethoscope} label="Add doctor" href="/admin" />
                <QuickAction icon={Users} label="Register patient" href="/staff/queue" />
                <QuickAction icon={ClipboardList} label="Open reception" href="/staff/dashboard" />
                <QuickAction icon={Settings} label="Settings" href="/admin/settings" />
              </div>
            </div>

            {/* PKG-2: Practice at a glance */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Practice at a glance</p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Tile icon={CalendarDays} label="Appointments today" value={t?.appointments_today} hint="scheduled + walk-ins" href="/staff/queue" />
                <Tile icon={ListChecks} label="In queue now" value={t?.in_queue_now} hint="waiting to be seen" href="/staff/queue" />
                <Tile icon={Stethoscope} label="Doctors on floor" value={t ? `${t.doctors_on_floor}/${t.doctors_total}` : undefined} hint="active right now" href="/doctor" />
                <Tile icon={ReceiptText} label="Collected today" value={t ? inr(t.collected_today) : undefined} hint="payments received" href="/staff/billing" />
              </div>
            </div>

            {snapshot && snapshot.branches.length > 1 && (
              <section className="rounded-xl border bg-card">
                <header className="border-b px-5 py-3">
                  <h2 className="text-sm font-semibold">Branch performance</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Today, across all {snapshot.branches.length} branches
                  </p>
                </header>
                <div className="divide-y">
                  {snapshot.branches.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{b.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{b.address}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-5 text-xs text-muted-foreground tabular-nums">
                        <span>{b.tiles.doctors_on_floor}/{b.tiles.doctors_total} doctors</span>
                        <span>{b.tiles.in_queue_now} waiting</span>
                        <span>{b.tiles.appointments_today} today</span>
                        <span className="font-medium text-foreground">
                          {inr(b.tiles.collected_today)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-xl border bg-card">
                <header className="border-b px-5 py-3">
                  <h2 className="text-sm font-semibold">On the floor now</h2>
                </header>
                <div className="divide-y">
                  {!snapshot ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-5 py-3">
                        <Skeleton className="h-4 w-40" />
                      </div>
                    ))
                  ) : snapshot.doctors.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                      No doctors on the roster yet.
                    </p>
                  ) : (
                    snapshot.doctors.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{d.full_name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {d.specialty ?? "General"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {d.in_consultation > 0 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:text-primary">
                              In consult
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {d.waiting} waiting · {d.total_today} today
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border bg-card">
                <header className="border-b px-5 py-3">
                  <h2 className="text-sm font-semibold">Recent activity</h2>
                </header>
                <div className="divide-y">
                  {!snapshot ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="px-5 py-3">
                        <Skeleton className="h-4 w-52" />
                      </div>
                    ))
                  ) : snapshot.recent_activity.length === 0 ? (
                    <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                      Activity will appear here as the day unfolds.
                    </p>
                  ) : (
                    snapshot.recent_activity.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm">{a.patient_name}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            · {activityLabel(a)}
                            {snapshot && snapshot.branches.length > 1 && a.clinic_name
                              ? ` · ${a.clinic_name}`
                              : ""}
                          </span>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(a.created_at)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

// PKG-2 Practice Health metric — a compact labelled number.
function HealthMetric({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="font-display text-xl font-extrabold tabular-nums">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

// PKG-2 Quick action — a labelled shortcut to an existing surface.
function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary/40"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string | undefined;
  hint?: string;
  href?: string;
  tone?: "warn" | "danger";
}) {
  const body = (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        href && "hover:border-primary/40",
        tone === "warn" && "border-warning/30",
        tone === "danger" && "border-destructive/30"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon
          className={cn(
            "size-4 text-muted-foreground",
            tone === "warn" && "text-warning",
            tone === "danger" && "text-destructive"
          )}
        />
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums">
        {value ?? <span className="text-muted-foreground">—</span>}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
