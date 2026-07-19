"use client";

import * as React from "react";
import Link from "next/link";
import {
  Copy,
  MoreHorizontal,
  Phone,
  Send,
  Stethoscope,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Doctor, formatDay, getInitials } from "@/shared/queue";
import { PendingInvite, ROLE_META, roleOf } from "@/shared/workspace";
import type { DoctorActivity } from "./workspace";

interface StaffTableProps {
  staff: Doctor[] | null;
  invites: PendingInvite[];
  /** PKG-2: per-doctor "today" activity, keyed by staff profile id. */
  activity: Record<string, DoctorActivity>;
  /** Sprint 3: needed to call the org-scoped staff-management API. */
  organizationId: string | null;
  onRevokeInvite: (id: string) => void;
  /** Sprint 3: refresh the roster after a staff member is (de)activated. */
  onStaffChanged: () => void;
}

async function copyToClipboard(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied to clipboard`);
}

export default function StaffTable({
  staff,
  invites,
  activity,
  organizationId,
  onRevokeInvite,
  onStaffChanged,
}: StaffTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Staff Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Today</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12 pr-4" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff === null ? (
          Array.from({ length: 4 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="pl-4">
                <div className="flex items-center gap-3 py-1">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              </TableCell>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell />
            </TableRow>
          ))
        ) : staff.length === 0 && invites.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-12">
              <EmptyState
                icon={UserX}
                title="No team yet — invite your first member"
                description="Add the doctors and receptionists who run this clinic. Use “Invite staff” above to send the first invitation."
                className="border-0 py-0"
              />
            </TableCell>
          </TableRow>
        ) : (
          <>
            {invites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onRevoke={() => onRevokeInvite(invite.id)}
              />
            ))}
            {staff.map((member) => (
              <StaffRow
                key={member.id}
                member={member}
                activity={activity[member.id]}
                organizationId={organizationId}
                onStaffChanged={onStaffChanged}
              />
            ))}
          </>
        )}
      </TableBody>
    </Table>
  );
}

function RoleBadge({ role }: { role: keyof typeof ROLE_META }) {
  const meta = ROLE_META[role];
  return <Badge className={cn("font-medium", meta.badge)}>{meta.label}</Badge>;
}

function StaffRow({
  member,
  activity,
  organizationId,
  onStaffChanged,
}: {
  member: Doctor;
  activity?: DoctorActivity;
  organizationId: string | null;
  onStaffChanged: () => void;
}) {
  const role = roleOf(member);
  const isDoctor = role === "doctor";
  const [busy, setBusy] = React.useState(false);
  // Sprint 3: is_active comes from the staff-management API; treat a legacy
  // payload without the field as active (the pre-Sprint-3 default).
  const active = member.is_active !== false;

  async function setActive(isActive: boolean) {
    if (!organizationId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/staff/${member.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: isActive }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Could not update staff member");
      toast.success(isActive ? `${member.full_name} reactivated` : `${member.full_name} deactivated`);
      onStaffChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update staff member");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow className={cn(!active && "opacity-60")}>
      <TableCell className="pl-4">
        <div className="flex items-center gap-3 py-1">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(member.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {member.full_name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {member.user.email ?? member.user.phone_number}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadge role={role} />
        {member.specialty && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">{member.specialty}</div>
        )}
      </TableCell>
      {/* PKG-2: what this member is doing today */}
      <TableCell>
        {isDoctor && activity && activity.total > 0 ? (
          <div className="min-w-[130px]">
            <div className="flex items-center gap-2 text-sm">
              <span className="tabular-nums">
                {activity.seen} of {activity.total} seen
              </span>
              {activity.inConsult ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10.5px] font-semibold text-primary">
                  In consult
                </span>
              ) : (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10.5px] font-semibold text-success">
                  Available
                </span>
              )}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Math.round((activity.seen / activity.total) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        {active ? (
          <span className="flex items-center gap-1.5 text-sm">
            <span className="size-1.5 rounded-full bg-success" />
            Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
            Inactive
          </span>
        )}
      </TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                aria-label={`Actions for ${member.full_name}`}
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{member.full_name}</DropdownMenuLabel>
            {member.user.email && (
              <DropdownMenuItem
                onClick={() => copyToClipboard(member.user.email!, "Email")}
              >
                <Copy />
                Copy email
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() =>
                copyToClipboard(member.user.phone_number, "Phone number")
              }
            >
              <Phone />
              Copy phone number
            </DropdownMenuItem>
            {role === "doctor" && (
              <DropdownMenuItem
                render={<Link href="/doctor" />}
              >
                <Stethoscope />
                Open live queue
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {active ? (
              <DropdownMenuItem
                variant="destructive"
                disabled={!organizationId || busy}
                onClick={() => setActive(false)}
              >
                <UserX />
                Deactivate access
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={!organizationId || busy}
                onClick={() => setActive(true)}
              >
                <UserCheck />
                Reactivate access
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function InviteRow({
  invite,
  onRevoke,
}: {
  invite: PendingInvite;
  onRevoke: () => void;
}) {
  return (
    <TableRow className="bg-warning/[0.04]">
      <TableCell className="pl-4">
        <div className="flex items-center gap-3 py-1">
          <Avatar className="size-8">
            <AvatarFallback className="border border-dashed bg-transparent text-xs font-semibold text-muted-foreground">
              {getInitials(invite.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {invite.full_name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {invite.email}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadge role={invite.role} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {invite.specialty ?? "—"}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-warning" />
          Invited {formatDay(invite.invited_at)}
        </span>
      </TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${invite.full_name}`}
              />
            }
          >
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Pending invitation</DropdownMenuLabel>
            {invite.token && (
              <DropdownMenuItem
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin}/join/${invite.token}`,
                    "Join link"
                  )
                }
              >
                <Send />
                Copy join link
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onRevoke}>
              <Trash2 />
              Revoke invitation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
