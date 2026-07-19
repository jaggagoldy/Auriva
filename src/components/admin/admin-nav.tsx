"use client";

// Shared Organization Workspace sidebar (Sprint 3, regrouped for APS-031 #6).
// Extracted so every admin surface shares one canonical navigation instead of
// each re-declaring their own. Grouped Operate/Manage/Understand/Configure per
// the APS-031 org-workspace mockup's IA — but only routes that are real today
// get a link; everything else keeps the existing `soon` disabled pattern
// rather than pointing at a page that doesn't exist yet.

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type AdminNavKey =
  | "command-center"
  | "workspace"
  | "departments"
  | "settings"
  | "events"
  | "setup";

interface NavEntry {
  key: AdminNavKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  soon?: boolean;
}

// PKG-2 Owner cockpit — a clean four-item nav (Command · Team · Clinics · Plan).
// Clinics + Plan are not built yet → shown as "Soon" (no route) until they exist.
const PRIMARY: NavEntry[] = [
  { key: "command-center", icon: LayoutDashboard, label: "Command", href: "/admin/command-center" },
  { key: "workspace", icon: Users, label: "Team", href: "/admin" },
  { key: "departments", icon: Building2, label: "Clinics", soon: true },
  { key: "settings", icon: CreditCard, label: "Plan", soon: true },
];

export function AdminSidebar({
  active,
  subtitle = "Organization",
}: {
  active: AdminNavKey;
  subtitle?: string;
}) {
  return (
    <aside className="flex w-[212px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
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
        {PRIMARY.map((item) => (
          <AdminNavItem key={item.key} icon={item.icon} label={item.label} href={item.href} soon={item.soon} active={item.key === active} />
        ))}
      </nav>

      {/* Only Settings for now (Setup / Event Platform hidden per PKG-2) */}
      <nav className="space-y-0.5 border-t p-3">
        <AdminNavItem icon={Settings} label="Settings" href="/admin/settings" active={active === "settings"} muted />
      </nav>
    </aside>
  );
}

function AdminNavItem({
  icon: Icon,
  label,
  href,
  active,
  muted,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active?: boolean;
  muted?: boolean;
  soon?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors",
    muted ? "text-[13px]" : "text-sm",
    soon
      ? "cursor-default text-muted-foreground/50"
      : active
        ? "bg-accent font-semibold text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="rounded-full border px-1.5 text-[9.5px] font-medium text-muted-foreground/70">Soon</span>
      )}
    </>
  );
  if (soon || !href) return <div className={className}>{content}</div>;
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
