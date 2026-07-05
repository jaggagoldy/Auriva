"use client";

// Shared Admin Portal sidebar (Sprint 3). Extracted so the newer surfaces
// (Settings, Departments) share one canonical navigation with the existing
// Workspace and Command Center shells instead of each re-declaring their own.

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Network,
  Rocket,
  Settings,
  Stethoscope,
  Webhook,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AdminNavKey =
  | "command-center"
  | "workspace"
  | "departments"
  | "settings"
  | "events"
  | "setup";

const NAV: {
  key: AdminNavKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}[] = [
  { key: "setup", icon: Rocket, label: "Setup", href: "/admin/setup" },
  { key: "command-center", icon: LayoutDashboard, label: "Command Center", href: "/admin/command-center" },
  { key: "workspace", icon: Building2, label: "Workspace", href: "/admin" },
  { key: "departments", icon: Network, label: "Departments", href: "/admin/departments" },
  { key: "events", icon: Webhook, label: "Event Platform", href: "/admin/events" },
  { key: "settings", icon: Settings, label: "Settings", href: "/admin/settings" },
];

export function AdminSidebar({
  active,
  subtitle = "Admin Portal",
}: {
  active: AdminNavKey;
  subtitle?: string;
}) {
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Auriva</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => (
          <AdminNavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={item.key === active}
          />
        ))}
        <AdminNavItem icon={Stethoscope} label="Live Queue" href="/doctor" />
        <AdminNavItem icon={CalendarDays} label="Appointments" soon />
        <AdminNavItem icon={BarChart3} label="Reports" soon />
      </nav>

      <div className="flex items-center gap-2.5 border-t p-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            SA
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium">Super Admin</div>
          <div className="truncate text-[11px] text-muted-foreground">
            Organization owner
          </div>
        </div>
      </div>
    </aside>
  );
}

function AdminNavItem({
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
      ? "bg-accent font-semibold text-accent-foreground"
      : soon
        ? "cursor-default text-muted-foreground/50"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="rounded-full border px-1.5 text-[10px] text-muted-foreground/70">
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
