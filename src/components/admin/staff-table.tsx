"use client";

import Link from "next/link";
import {
  Copy,
  MoreHorizontal,
  Phone,
  Send,
  Stethoscope,
  Trash2,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Doctor, formatDay, getInitials } from "@/lib/queue";
import { PendingInvite, ROLE_META, roleOf } from "@/lib/workspace";

interface StaffTableProps {
  staff: Doctor[] | null;
  invites: PendingInvite[];
  onRevokeInvite: (id: string) => void;
}

async function copyToClipboard(value: string, label: string) {
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied to clipboard`);
}

export default function StaffTable({
  staff,
  invites,
  onRevokeInvite,
}: StaffTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Staff Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Specialty</TableHead>
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
            <TableCell colSpan={5} className="py-12 text-center">
              <UserX className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">No staff yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Invite doctors and receptionists to this workspace.
              </p>
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
              <StaffRow key={member.id} member={member} />
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

function StaffRow({ member }: { member: Doctor }) {
  const role = roleOf(member);
  return (
    <TableRow>
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
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {member.specialty ?? "—"}
      </TableCell>
      <TableCell>
        <span className="flex items-center gap-1.5 text-sm">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </TableCell>
      <TableCell className="pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
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
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                toast.error("Removing staff requires the staff API", {
                  description: "The backend team hasn't shipped it yet.",
                })
              }
            >
              <Trash2 />
              Remove from workspace
            </DropdownMenuItem>
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
    <TableRow className="bg-amber-500/[0.04]">
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
          <span className="size-1.5 rounded-full bg-amber-500" />
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
            <DropdownMenuItem
              onClick={() =>
                toast.success(`Invitation re-sent to ${invite.email}`)
              }
            >
              <Send />
              Resend invitation
            </DropdownMenuItem>
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
