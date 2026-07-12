"use client";

// Department Management (Sprint 3 / OPS-001 §3, with §7 default pricing).
// Create departments (org-wide or scoped to one branch), set a department
// head and default consultation fee, and assign staff. Backed by
// /api/organizations/[id]/departments (+/[deptId]) and the staff-management
// PATCH for department assignment.

import * as React from "react";
import { Loader2, Network, Plus, RefreshCw, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { AdminSidebar } from "@/components/admin/admin-nav";

const NO_HEAD = "__none__";
const ALL_BRANCHES = "__all__";

interface StaffLite {
  id: string;
  full_name: string;
  specialty: string | null;
  clinicName: string;
}

interface Department {
  id: string;
  name: string;
  clinic_id: string | null;
  head_staff_id: string | null;
  default_consultation_fee: number | null;
  clinic: { id: string; name: string } | null;
  headStaff: { id: string; full_name: string } | null;
  members: { id: string; full_name: string; is_active: boolean }[];
}

interface Clinic {
  id: string;
  name: string;
  organization_id: string;
  staffProfiles: { id: string; full_name: string; specialty: string | null; is_active: boolean }[];
}

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Departments() {
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [departments, setDepartments] = React.useState<Department[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);

  const staff: StaffLite[] = React.useMemo(() => {
    const seen = new Map<string, StaffLite>();
    for (const clinic of clinics) {
      for (const s of clinic.staffProfiles) {
        if (!seen.has(s.id)) {
          seen.set(s.id, {
            id: s.id,
            full_name: s.full_name,
            specialty: s.specialty,
            clinicName: clinic.name,
          });
        }
      }
    }
    return [...seen.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [clinics]);

  // staffId -> the department it currently belongs to (for "moving" hints).
  const deptByStaff = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const dept of departments ?? []) {
      for (const m of dept.members) map.set(m.id, dept.name);
    }
    return map;
  }, [departments]);

  const loadDepartments = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/organizations/${id}/departments`, { cache: "no-store" });
    if (!res.ok) throw new Error("departments");
    setDepartments(await res.json());
  }, []);

  const load = React.useCallback(async () => {
    setError(null);
    const clinicsRes = await fetch("/api/clinics", { cache: "no-store" });
    if (!clinicsRes.ok) throw new Error("clinics");
    const clinicData: Clinic[] = await clinicsRes.json();
    if (!clinicData.length) {
      setError("No organization is linked to this account.");
      return;
    }
    setClinics(clinicData);
    const id = clinicData[0].organization_id;
    setOrgId(id);
    await loadDepartments(id);
  }, [loadDepartments]);

  React.useEffect(() => {
    load().catch(() => setError("Could not load departments."));
  }, [load]);

  const refresh = React.useCallback(() => {
    if (orgId) loadDepartments(orgId).catch(() => {});
  }, [orgId, loadDepartments]);

  async function patchDepartment(deptId: string, body: Record<string, unknown>, successMsg: string) {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/departments/${deptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Update failed");
      toast.success(successMsg);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function assignStaff(staffId: string, departmentId: string | null, msg: string) {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department_id: departmentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Could not assign staff");
      toast.success(msg);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign staff");
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar active="departments" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">Departments</h1>
            <p className="text-[11px] text-muted-foreground">
              Organize staff, department heads and default pricing
            </p>
          </div>
          <Button size="sm" disabled={!orgId} onClick={() => setCreateOpen(true)}>
            <Plus />
            New department
          </Button>
        </header>

        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => load().catch(() => setError("Could not load departments."))}>
              <RefreshCw />
              Try again
            </Button>
          </div>
        ) : (
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            {departments === null ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-xl" />
                ))}
              </div>
            ) : departments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/50">
                  <Network className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">No departments yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Group your doctors and staff into departments like Cardiology or Pediatrics.
                  </p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Create your first department
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {departments.map((dept) => (
                  <DepartmentCard
                    key={dept.id}
                    dept={dept}
                    staff={staff}
                    deptByStaff={deptByStaff}
                    onSetHead={(headId) =>
                      patchDepartment(
                        dept.id,
                        { head_staff_id: headId },
                        headId ? "Department head updated" : "Department head cleared"
                      )
                    }
                    onEdit={(name, fee) =>
                      patchDepartment(
                        dept.id,
                        { name, default_consultation_fee: fee },
                        "Department updated"
                      )
                    }
                    onAssign={(staffId) =>
                      assignStaff(staffId, dept.id, "Staff assigned to department")
                    }
                    onRemove={(staffId, name) =>
                      assignStaff(staffId, null, `${name} removed from ${dept.name}`)
                    }
                  />
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {orgId && (
        <CreateDepartmentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          orgId={orgId}
          clinics={clinics}
          onCreated={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function DepartmentCard({
  dept,
  staff,
  deptByStaff,
  onSetHead,
  onEdit,
  onAssign,
  onRemove,
}: {
  dept: Department;
  staff: StaffLite[];
  deptByStaff: Map<string, string>;
  onSetHead: (headStaffId: string | null) => void;
  onEdit: (name: string, fee: number | null) => void;
  onAssign: (staffId: string) => void;
  onRemove: (staffId: string, name: string) => void;
}) {
  const [editOpen, setEditOpen] = React.useState(false);
  const memberIds = new Set(dept.members.map((m) => m.id));
  const assignable = staff.filter((s) => !memberIds.has(s.id));

  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{dept.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-normal">
              {dept.clinic ? dept.clinic.name : "All branches"}
            </Badge>
            {dept.default_consultation_fee != null && (
              <Badge variant="outline" className="font-normal">
                {inr(dept.default_consultation_fee)} default
              </Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Department head</Label>
          <Select
            value={dept.head_staff_id ?? NO_HEAD}
            onValueChange={(v) => v && onSetHead(v === NO_HEAD ? null : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No head assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_HEAD}>No head assigned</SelectItem>
              {staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">
            Members{" "}
            <span className="tabular-nums">({dept.members.length})</span>
          </Label>
          {dept.members.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No staff assigned yet.</p>
          ) : (
            <ul className="space-y-1">
              {dept.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border px-2 py-1 text-[12.5px]"
                >
                  <span className="truncate">{m.full_name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${m.full_name}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(m.id, m.full_name)}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {assignable.length > 0 && (
          <Select value="" onValueChange={(v) => v && onAssign(v)}>
            <SelectTrigger className="w-full">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <UserPlus className="size-3.5" />
                Assign staff…
              </span>
            </SelectTrigger>
            <SelectContent>
              {assignable.map((s) => {
                const current = deptByStaff.get(s.id);
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                    {current ? ` · in ${current}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <EditDepartmentDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        dept={dept}
        onSave={(name, fee) => {
          setEditOpen(false);
          onEdit(name, fee);
        }}
      />
    </div>
  );
}

function EditDepartmentDialog({
  open,
  onOpenChange,
  dept,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dept: Department;
  onSave: (name: string, fee: number | null) => void;
}) {
  const [name, setName] = React.useState(dept.name);
  const [fee, setFee] = React.useState(
    dept.default_consultation_fee != null ? String(dept.default_consultation_fee) : ""
  );

  React.useEffect(() => {
    if (open) {
      setName(dept.name);
      setFee(dept.default_consultation_fee != null ? String(dept.default_consultation_fee) : "");
    }
  }, [open, dept]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("A department name is required.");
      return;
    }
    const parsedFee = fee.trim() === "" ? null : Number(fee);
    if (parsedFee != null && (Number.isNaN(parsedFee) || parsedFee < 0)) {
      toast.error("Default fee must be a positive number.");
      return;
    }
    onSave(name.trim(), parsedFee);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit department</DialogTitle>
          <DialogDescription>Rename or set the default consultation fee.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept-name">Name</Label>
            <Input id="edit-dept-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept-fee">Default consultation fee (₹)</Label>
            <Input
              id="edit-dept-fee"
              inputMode="numeric"
              placeholder="Optional"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateDepartmentDialog({
  open,
  onOpenChange,
  orgId,
  clinics,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  clinics: Clinic[];
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [clinicId, setClinicId] = React.useState(ALL_BRANCHES);
  const [fee, setFee] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setClinicId(ALL_BRANCHES);
      setFee("");
    }
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("A department name is required.");
      return;
    }
    const parsedFee = fee.trim() === "" ? null : Number(fee);
    if (parsedFee != null && (Number.isNaN(parsedFee) || parsedFee < 0)) {
      toast.error("Default fee must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clinic_id: clinicId === ALL_BRANCHES ? null : clinicId,
          default_consultation_fee: parsedFee,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Could not create department");
      toast.success("Department created");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create department");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New department</DialogTitle>
          <DialogDescription>
            Group staff — org-wide or scoped to a single branch.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Department name</Label>
            <Input
              id="dept-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-branch">Branch</Label>
            <Select value={clinicId} onValueChange={(v) => v && setClinicId(v)}>
              <SelectTrigger id="dept-branch" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BRANCHES}>All branches (org-wide)</SelectItem>
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-fee">Default consultation fee (₹)</Label>
            <Input
              id="dept-fee"
              inputMode="numeric"
              placeholder="Optional"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Creating…" : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
