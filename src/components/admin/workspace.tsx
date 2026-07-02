"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Settings,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Appointment, Doctor, formatDay, isToday } from "@/shared/queue";
import { ClinicSummary, PendingInvite, roleOf } from "@/shared/workspace";
import InviteStaffDialog from "./invite-dialog";
import StaffTable from "./staff-table";

const CLINIC_STORAGE_KEY = "workspace_console_clinic_id";
const INVITES_STORAGE_KEY = "workspace_pending_invites";

async function fetchWorkspaceData(clinicId: string) {
  const [staffRes, apptRes] = await Promise.all([
    fetch(`/api/doctors?clinic_id=${clinicId}`, { cache: "no-store" }),
    fetch(`/api/appointments?clinic_id=${clinicId}`, { cache: "no-store" }),
  ]);
  if (!staffRes.ok || !apptRes.ok) throw new Error("Request failed");
  const staff: Doctor[] = await staffRes.json();
  const appointments: Appointment[] = await apptRes.json();
  return {
    staff,
    todayCount: appointments.filter((a) => isToday(a.scheduled_time)).length,
  };
}

function readInvites(): Record<string, PendingInvite[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(INVITES_STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function AdminWorkspace() {
  const [clinics, setClinics] = React.useState<ClinicSummary[] | null>(null);
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [staff, setStaff] = React.useState<Doctor[] | null>(null);
  const [todayCount, setTodayCount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [invitesMap, setInvitesMap] = React.useState(readInvites);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clinics", { cache: "no-store" });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data: ClinicSummary[] = await res.json();
        if (cancelled) return;
        setClinics(data);
        const stored = localStorage.getItem(CLINIC_STORAGE_KEY);
        const initial =
          data.find((clinic) => clinic.id === stored) ?? data[0] ?? null;
        setClinicId(initial?.id ?? null);
        if (data.length === 0) setError("No clinics found for this account.");
      } catch {
        if (!cancelled) setError("Could not load your clinics.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyWorkspaceData = React.useCallback(
    (data: Awaited<ReturnType<typeof fetchWorkspaceData>>) => {
      setStaff(data.staff);
      setTodayCount(data.todayCount);
      setError(null);
    },
    []
  );

  React.useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;
    fetchWorkspaceData(clinicId)
      .then((data) => {
        if (!cancelled) applyWorkspaceData(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load workspace data.");
      });
    return () => {
      cancelled = true;
    };
  }, [clinicId, applyWorkspaceData]);

  const handleRefresh = () => {
    if (!clinicId) return;
    fetchWorkspaceData(clinicId)
      .then(applyWorkspaceData)
      .catch(() => setError("Could not load workspace data."));
  };

  const handleClinicChange = (id: string) => {
    if (id === clinicId) return;
    setClinicId(id);
    setStaff(null);
    setTodayCount(null);
    setError(null);
    localStorage.setItem(CLINIC_STORAGE_KEY, id);
  };

  const clinic = clinics?.find((c) => c.id === clinicId) ?? null;
  const invites = clinicId ? (invitesMap[clinicId] ?? []) : [];

  const persistInvites = (next: Record<string, PendingInvite[]>) => {
    setInvitesMap(next);
    localStorage.setItem(INVITES_STORAGE_KEY, JSON.stringify(next));
  };

  const handleInvite = (invite: PendingInvite) => {
    if (!clinicId) return;
    persistInvites({
      ...invitesMap,
      [clinicId]: [invite, ...invites],
    });
  };

  const handleRevokeInvite = (id: string) => {
    if (!clinicId) return;
    persistInvites({
      ...invitesMap,
      [clinicId]: invites.filter((invite) => invite.id !== id),
    });
    toast.success("Invitation revoked");
  };

  const doctorCount = staff?.filter((s) => roleOf(s) === "doctor").length;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* High-contrast admin navigation rail */}
      <aside className="flex w-64 shrink-0 flex-col bg-zinc-950 text-zinc-400">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-white text-zinc-950">
            <Activity className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-zinc-100">
              Aegis Clinic OS
            </div>
            <div className="text-[11px] text-zinc-500">Admin Portal</div>
          </div>
        </div>

        <div className="border-b border-white/10 p-3">
          <div className="mb-1.5 px-1 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
            Workspace
          </div>
          <Select
            value={clinicId}
            onValueChange={(value) => handleClinicChange(value as string)}
          >
            <SelectTrigger
              className="w-full border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 focus-visible:ring-white/20 dark:bg-white/5 dark:hover:bg-white/10"
              aria-label="Workspace"
            >
              <SelectValue>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0 text-zinc-500" />
                  <span className="truncate">
                    {clinic?.name ?? "Select workspace"}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(clinics ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          <NavItem icon={LayoutDashboard} label="Workspace" active />
          <NavItem icon={Stethoscope} label="Live Queue" href="/doctor" />
          <NavItem icon={CalendarDays} label="Appointments" soon />
          <NavItem icon={BarChart3} label="Reports" soon />
          <NavItem icon={Settings} label="Settings" soon />
        </nav>

        <div className="flex items-center gap-2.5 border-t border-white/10 p-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-white/10 text-xs font-semibold text-zinc-100">
              SA
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-medium text-zinc-100">
              Super Admin
            </div>
            {/* Owner identity is mocked — the clinics API only exposes super_admin_id. */}
            <div className="truncate text-[11px] text-zinc-500">
              admin@aegiscare.com
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">Workspace Management</h1>
            <p className="text-[11px] text-muted-foreground">
              Clinic profile, staff and role access
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{formatDay(new Date())}</span>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Refresh workspace data"
              disabled={!clinicId}
              onClick={handleRefresh}
            >
              <RefreshCw />
            </Button>
          </div>
        </header>

        {error && clinics !== null && staff === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw />
              Try again
            </Button>
          </div>
        ) : (
          <main className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <section className="flex items-stretch justify-between gap-6 rounded-xl border bg-card p-5">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-muted/50">
                  <Building2 className="size-6 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  {clinic ? (
                    <>
                      <h2 className="truncate text-lg leading-tight font-semibold">
                        {clinic.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{clinic.address}</span>
                      </p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Clinic ID{" "}
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                          {clinic.id.slice(0, 8)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-32" />
                    </div>
                  )}
                </div>
              </div>

              <dl className="grid shrink-0 grid-cols-3 gap-3">
                <StatTile
                  label="Staff members"
                  value={staff ? staff.length + invites.length : null}
                  hint={
                    invites.length > 0
                      ? `${invites.length} pending`
                      : "all active"
                  }
                />
                <StatTile
                  label="Doctors"
                  value={doctorCount ?? null}
                  hint="on roster"
                />
                <StatTile
                  label="Appointments"
                  value={todayCount}
                  hint="today"
                />
              </dl>
            </section>

            <section className="rounded-xl border bg-card">
              <header className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold">
                    Staff &amp; Roles
                    {staff && (
                      <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                        {staff.length + invites.length}
                      </span>
                    )}
                  </h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    People with access to this workspace and their permissions
                  </p>
                </div>
                <InviteStaffDialog
                  clinicName={clinic?.name ?? "this clinic"}
                  onInvite={handleInvite}
                />
              </header>
              <StaffTable
                staff={staff}
                invites={invites}
                onRevokeInvite={handleRevokeInvite}
              />
            </section>
          </main>
        )}
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active?: boolean;
  soon?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
    active
      ? "bg-white/10 font-medium text-white"
      : soon
        ? "cursor-default text-zinc-600"
        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="rounded-full border border-white/10 px-1.5 text-[10px] text-zinc-600">
          Soon
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null;
  hint: string;
}) {
  return (
    <div className="w-32 rounded-lg border bg-background px-3 py-2.5">
      <dt className="truncate text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-xl leading-none font-semibold tabular-nums">
        {value ?? "–"}
      </dd>
      <dd className="mt-1 truncate text-[11px] text-muted-foreground">
        {hint}
      </dd>
    </div>
  );
}
