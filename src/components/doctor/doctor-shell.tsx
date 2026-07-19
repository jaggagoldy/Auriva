"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LogOut,
  Stethoscope,
  User,
  Users,
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

      {/* PKG-1 rail: brand + nav (Today · Schedule · Patients · Practice · Profile) */}
      <aside className="flex w-[228px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="text-sm font-semibold">Auriva</div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          <NavItem icon={Stethoscope} label="Today" href="/doctor" active={pathname === "/doctor"} />
          <NavItem icon={ClipboardList} label="Workbench" href="/doctor/workbench" active={pathname === "/doctor/workbench"} />
          <NavItem icon={CalendarDays} label="Schedule" href="/doctor/schedule" active={pathname === "/doctor/schedule"} />
          <NavItem icon={Users} label="Patients" href="/doctor/patients" active={pathname === "/doctor/patients"} />
          <NavItem icon={Building2} label="Practice" href="/doctor/practice" active={pathname === "/doctor/practice"} />
          <NavItem icon={User} label="Profile" href="/doctor/profile" active={pathname === "/doctor/profile"} />
        </nav>

        {/* Solo-only surface switch (Clinical/Front Desk/Organization) */}
        <WorkspaceSwitcher capabilities={capabilities} current="doctor_workspace" />
      </aside>

      {/* PKG-1 main: top bar (clinic switcher + avatar) over the content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
          <Link
            href="/workspace"
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
              {clinicName.slice(0, 1).toUpperCase()}
            </span>
            <span className="font-medium">{clinicName}</span>
            <span className="text-muted-foreground">· Doctor</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <WhatsNew />
            <Link href="/doctor/profile" aria-label="Profile" title={displayName}>
              <Avatar className="size-8">
                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="ghost" size="icon-sm" aria-label="Log out" disabled={loggingOut} onClick={handleLogout}>
              <LogOut />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <DoctorSessionProvider doctor={doctor}>{children}</DoctorSessionProvider>
        </div>
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
