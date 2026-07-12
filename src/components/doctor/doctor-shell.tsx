"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  LogOut,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getInitials } from "@/shared/queue";
import { DoctorSessionProvider, type DoctorSessionData } from "@/components/doctor/doctor-session";
import WhatsNew from "@/components/shared/whats-new";
import WorkspaceSwitcher from "@/components/shared/workspace-switcher";
import type { Capability } from "@/domain/authorization";

interface DoctorShellProps {
  doctor: DoctorSessionData;
  capabilities: Capability[];
  children: React.ReactNode;
}

// L3 Organization Desktop shell (design/aps-007-workspace-layouts.html),
// same shape as StaffShell — white 248px sidebar, teal-tinted active state.
// Matches the approved Doctor Workspace hi-fi (APS-011): Today · Schedule ·
// Patients · Practice, with Earnings shown but gated (no billing model yet).
export default function DoctorShell({ doctor, capabilities, children }: DoctorShellProps) {
  const { full_name: displayName, specialty, clinic } = doctor;
  const clinicName = clinic.name;
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Toaster position="bottom-right" />
      <aside className="flex w-[248px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-semibold">Auriva</div>
            <div className="truncate text-[11px] text-muted-foreground">Doctor Workspace</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-b px-4 py-2.5 text-[11px] text-muted-foreground">
          <Building2 className="size-3.5 shrink-0" />
          <span className="truncate">{clinicName}</span>
        </div>

        <WorkspaceSwitcher capabilities={capabilities} current="doctor_workspace" />

        <nav className="flex-1 space-y-0.5 p-3">
          <NavItem icon={Stethoscope} label="Today" href="/doctor" active={pathname === "/doctor"} />
          <NavItem
            icon={CalendarDays}
            label="Schedule"
            href="/doctor/schedule"
            active={pathname === "/doctor/schedule"}
          />
          <NavItem
            icon={Users}
            label="Patients"
            href="/doctor/patients"
            active={pathname === "/doctor/patients"}
          />
          <NavItem
            icon={Building2}
            label="Practice"
            href="/doctor/practice"
            active={pathname === "/doctor/practice"}
          />
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground/60">
            <Wallet className="size-4 shrink-0" />
            <span className="flex-1 text-left">Earnings</span>
            <span className="rounded-full border border-dashed px-1.5 py-0.5 text-[9.5px] font-medium">
              Soon
            </span>
          </div>
        </nav>

        <Link
          href="/doctor/profile"
          className={cn(
            "flex items-center gap-2.5 border-t p-3 transition-colors hover:bg-muted",
            pathname === "/doctor/profile" && "bg-accent"
          )}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {specialty ?? "General Physician"}
            </div>
          </div>
          <WhatsNew />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Log out"
            disabled={loggingOut}
            onClick={(event) => {
              event.preventDefault();
              handleLogout();
            }}
          >
            <LogOut />
          </Button>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DoctorSessionProvider doctor={doctor}>{children}</DoctorSessionProvider>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent font-semibold text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
    </Link>
  );
}
