"use client";

import * as React from "react";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Appointment, Doctor, formatDay, isToday } from "@/shared/queue";
import {
  ClinicSummary,
  PendingInvite,
  pendingInviteFromApi,
  roleOf,
} from "@/shared/workspace";
import ActivityBell from "./activity-panel";
import { AdminSidebar } from "./admin-nav";
import InviteStaffDialog from "./invite-dialog";
import StaffTable from "./staff-table";
import WhatsNew from "@/components/shared/whats-new";

const CLINIC_STORAGE_KEY = "workspace_console_clinic_id";

async function fetchWorkspaceData(clinicId: string, organizationId: string) {
  const [staffRes, apptRes, inviteRes] = await Promise.all([
    fetch(`/api/doctors?clinic_id=${clinicId}`, { cache: "no-store" }),
    fetch(`/api/appointments?clinic_id=${clinicId}`, { cache: "no-store" }),
    fetch(`/api/organizations/${organizationId}/invitations`, { cache: "no-store" }),
  ]);
  if (!staffRes.ok || !apptRes.ok) throw new Error("Request failed");
  const staff: Doctor[] = await staffRes.json();
  const appointments: Appointment[] = await apptRes.json();
  // Invitations may 403 for non-owners — treat that as "no pending invites"
  // rather than a hard failure of the whole workspace.
  const invites: PendingInvite[] = inviteRes.ok
    ? (await inviteRes.json()).map(pendingInviteFromApi)
    : [];
  return {
    staff,
    invites,
    todayCount: appointments.filter((a) => isToday(a.scheduled_time)).length,
  };
}

export default function AdminWorkspace() {
  const [clinics, setClinics] = React.useState<ClinicSummary[] | null>(null);
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [staff, setStaff] = React.useState<Doctor[] | null>(null);
  const [todayCount, setTodayCount] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [invites, setInvites] = React.useState<PendingInvite[]>([]);
  const [addClinicOpen, setAddClinicOpen] = React.useState(false);

  const loadClinics = React.useCallback(async () => {
    const res = await fetch("/api/clinics", { cache: "no-store" });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data: ClinicSummary[] = await res.json();
    setClinics(data);
    if (data.length === 0) {
      setError("No clinics found for this account.");
      return null;
    }
    return data;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    loadClinics()
      .then((data) => {
        if (cancelled || !data) return;
        const stored = localStorage.getItem(CLINIC_STORAGE_KEY);
        const initial = data.find((clinic) => clinic.id === stored) ?? data[0] ?? null;
        setClinicId(initial?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your clinics.");
      });
    return () => {
      cancelled = true;
    };
  }, [loadClinics]);

  // Sprint 3: the organization is the real parent now — derived from any
  // clinic's organization_id (every clinic in `clinics` belongs to the same
  // organization, since GET /api/clinics is already scoped to "my org").
  const organizationId = clinics?.[0]?.organization_id ?? null;

  const applyWorkspaceData = React.useCallback(
    (data: Awaited<ReturnType<typeof fetchWorkspaceData>>) => {
      setStaff(data.staff);
      setInvites(data.invites);
      setTodayCount(data.todayCount);
      setError(null);
    },
    []
  );

  React.useEffect(() => {
    if (!clinicId || !organizationId) return;
    let cancelled = false;
    fetchWorkspaceData(clinicId, organizationId)
      .then((data) => {
        if (!cancelled) applyWorkspaceData(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load workspace data.");
      });
    return () => {
      cancelled = true;
    };
  }, [clinicId, organizationId, applyWorkspaceData]);

  const handleRefresh = () => {
    if (!clinicId || !organizationId) return;
    fetchWorkspaceData(clinicId, organizationId)
      .then(applyWorkspaceData)
      .catch(() => setError("Could not load workspace data."));
  };

  const handleClinicChange = (id: string) => {
    if (id === clinicId) return;
    setClinicId(id);
    setStaff(null);
    setInvites([]);
    setTodayCount(null);
    setError(null);
    localStorage.setItem(CLINIC_STORAGE_KEY, id);
  };

  const clinic = clinics?.find((c) => c.id === clinicId) ?? null;

  const handleInvited = (joinUrl: string, fullName: string) => {
    navigator.clipboard?.writeText(joinUrl).catch(() => {});
    toast.success(`Invitation created for ${fullName}`, {
      description: "Join link copied — share it so they can set a password and join.",
    });
    handleRefresh();
  };

  const handleRevokeInvite = async (id: string) => {
    if (!organizationId) return;
    setInvites((prev) => prev.filter((invite) => invite.id !== id)); // optimistic
    try {
      const res = await fetch(`/api/organizations/${organizationId}/invitations/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Invitation revoked");
    } catch {
      toast.error("Could not revoke invitation");
      handleRefresh();
    }
  };

  const handleClinicAdded = async (newClinicId: string) => {
    setAddClinicOpen(false);
    const data = await loadClinics().catch(() => null);
    if (data) handleClinicChange(newClinicId);
    toast.success("Branch added");
  };

  const doctorCount = staff?.filter((s) => roleOf(s) === "doctor").length;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar active="workspace" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">People</h1>
            <p className="text-[11px] text-muted-foreground">
              Clinic profile, staff and role access
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-3.5" />
              <span>{formatDay(new Date())}</span>
            </div>
            <WhatsNew />
            <ActivityBell organizationId={organizationId} />
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

        <div className="flex h-10 shrink-0 items-center gap-1.5 border-b bg-muted/30 px-6 text-sm">
          <span className="text-muted-foreground">Organization Workspace</span>
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <Select
            value={clinicId}
            onValueChange={(value) => handleClinicChange(value as string)}
          >
            <SelectTrigger
              className="h-7 w-auto gap-1.5 border-none bg-transparent px-2 font-medium shadow-none hover:bg-muted"
              aria-label="Branch"
            >
              <SelectValue>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{clinic?.name ?? "Select branch"}</span>
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
          <button
            onClick={() => setAddClinicOpen(true)}
            aria-label="Add a branch"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Add branch
          </button>
        </div>

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
                        {clinics && clinics.length > 1 && (
                          <span className="ml-2">· {clinics.length} branches in this organization</span>
                        )}
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
                {clinicId && organizationId && (
                  <InviteStaffDialog
                    clinicName={clinic?.name ?? "this clinic"}
                    organizationId={organizationId}
                    clinics={(clinics ?? []).map((c) => ({ id: c.id, name: c.name }))}
                    defaultClinicId={clinicId}
                    onInvited={handleInvited}
                  />
                )}
              </header>
              <StaffTable
                staff={staff}
                invites={invites}
                organizationId={organizationId}
                onRevokeInvite={handleRevokeInvite}
                onStaffChanged={handleRefresh}
              />
            </section>
          </main>
        )}
      </div>

      {organizationId && (
        <AddClinicDialog
          open={addClinicOpen}
          onOpenChange={setAddClinicOpen}
          organizationId={organizationId}
          onAdded={handleClinicAdded}
        />
      )}
    </div>
  );
}

function AddClinicDialog({
  open,
  onOpenChange,
  organizationId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onAdded: (clinicId: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setAddress("");
    }
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !address.trim()) {
      toast.error("Branch name and address are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${organizationId}/clinics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), address: address.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not add branch");
      onAdded(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add branch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a branch</DialogTitle>
          <DialogDescription>
            A second clinic under the same organization — its own queue, staff and schedule.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-clinic-name">Branch name</Label>
            <Input id="new-clinic-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-clinic-address">Address</Label>
            <Input id="new-clinic-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : "Add branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
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
