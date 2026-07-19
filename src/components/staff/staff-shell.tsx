"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ReceiptText,
  UserPlus,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getInitials } from "@/shared/queue";
import WhatsNew from "@/components/shared/whats-new";
import WorkspaceSwitcher from "@/components/shared/workspace-switcher";
import type { Capability } from "@/domain/authorization";

interface StaffShellProps {
  displayName: string;
  role: string;
  capabilities: Capability[];
  children: React.ReactNode;
}

// L3 Organization Desktop shell (design/aps-007-workspace-layouts.html):
// white 248px sidebar with sections, teal-tinted active state.
export default function StaffShell({ displayName, role, capabilities, children }: StaffShellProps) {
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

      {/* PKG-1 rail */}
      <aside className="flex w-[228px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="size-4" />
          </div>
          <div className="text-sm font-semibold">Auriva</div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            href="/staff/dashboard"
            active={pathname === "/staff/dashboard"}
          />
          <NavItem
            icon={ListChecks}
            label="Queue Board"
            href="/staff/queue"
            active={pathname === "/staff/queue"}
          />
          {/* PKG-4: reception calendar (reuses ClinicCalendar) */}
          <NavItem
            icon={CalendarDays}
            label="Calendar"
            href="/staff/calendar"
            active={pathname === "/staff/calendar"}
          />
          <NavItem
            icon={UserPlus}
            label="Walk-In"
            href="/staff/walkin"
            active={pathname === "/staff/walkin"}
          />
          <NavItem
            icon={ReceiptText}
            label="Billing"
            href="/staff/billing"
            active={pathname === "/staff/billing"}
          />
          <NavItem
            icon={FlaskConical}
            label="Lab Orders"
            href="/staff/lab"
            active={pathname === "/staff/lab"}
          />
        </nav>

        {/* Solo-only surface switch */}
        <WorkspaceSwitcher capabilities={capabilities} current="reception" />
      </aside>

      {/* PKG-1 main: top bar (clinic switcher + avatar) over the content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
          <Link
            href="/workspace"
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <span className="grid size-6 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
              R
            </span>
            <span className="font-medium">Front desk</span>
            <span className="capitalize text-muted-foreground">· {role.replace("_", " ")}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <WhatsNew />
            <Avatar className="size-8" title={displayName}>
              <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon-sm" aria-label="Log out" disabled={loggingOut} onClick={handleLogout}>
              <LogOut />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
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
